import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { generateCodeVerifier, generateState } from "arctic";
import { randomUUID } from "node:crypto";
import { lucia } from "../auth/lucia";
import { github, google } from "../auth/oauth";
import { hashPassword, verifyPassword } from "../auth/password";
import { db } from "../db/client";
import { oauthAccounts, users } from "../db/schema";
import { env, isProd } from "../env";
import type { AppEnv } from "../types";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const oauthCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 10,
};

const auth = new Hono<AppEnv>();

auth.post("/register", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload." }, 400);
  }

  const { email, password, name } = parsed.data;
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return c.json({ error: "Email already in use." }, 409);
  }

  const userId = randomUUID();
  const hashedPassword = await hashPassword(password);

  await db.insert(users).values({
    id: userId,
    email,
    hashedPassword,
    name: name ?? null,
    emailVerified: false,
  });

  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  c.header("Set-Cookie", sessionCookie.serialize(), { append: true });

  return c.json(
    {
      user: {
        id: userId,
        email,
        name: name ?? null,
        emailVerified: false,
      },
    },
    201,
  );
});

auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload." }, 400);
  }

  const { email, password } = parsed.data;
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user?.hashedPassword) {
    return c.json({ error: "Invalid credentials." }, 401);
  }

  const valid = await verifyPassword(user.hashedPassword, password);
  if (!valid) {
    return c.json({ error: "Invalid credentials." }, 401);
  }

  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  c.header("Set-Cookie", sessionCookie.serialize(), { append: true });

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
    },
  });
});

auth.post("/logout", async (c) => {
  const session = c.get("session");
  if (session) {
    await lucia.invalidateSession(session.id);
  }

  const blankCookie = lucia.createBlankSessionCookie();
  c.header("Set-Cookie", blankCookie.serialize(), { append: true });

  return c.json({ ok: true });
});

auth.get("/session", (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ user: null });
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
    },
  });
});

auth.get("/github", async (c) => {
  if (!github) {
    return c.json({ error: "GitHub OAuth is not configured." }, 503);
  }

  const state = generateState();
  const url = await github.createAuthorizationURL(state, {
    scopes: ["read:user", "user:email"],
  });

  setCookie(c, "github_oauth_state", state, oauthCookieOptions);
  return c.redirect(url.toString());
});

auth.get("/github/callback", async (c) => {
  if (!github) {
    return c.json({ error: "GitHub OAuth is not configured." }, 503);
  }

  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "github_oauth_state");

  if (!code || !state || !storedState || state !== storedState) {
    return c.json({ error: "Invalid OAuth state." }, 400);
  }

  deleteCookie(c, "github_oauth_state", { path: "/" });

  const tokens = await github.validateAuthorizationCode(code);
  const accessToken = tokens.accessToken;

  const userResponse = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userResponse.ok) {
    return c.json({ error: "Failed to fetch GitHub profile." }, 502);
  }
  const githubUser = await userResponse.json();

  const emailResponse = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!emailResponse.ok) {
    return c.json({ error: "Failed to fetch GitHub emails." }, 502);
  }
  const emails: Array<{ email: string; primary: boolean; verified: boolean }> = await emailResponse.json();
  const primaryEmail =
    emails.find((entry) => entry.primary && entry.verified)?.email ?? emails[0]?.email ?? null;

  if (!primaryEmail) {
    return c.json({ error: "No email available from GitHub." }, 400);
  }

  const { userId } = await findOrCreateOAuthUser({
    provider: "github",
    providerUserId: String(githubUser.id),
    email: primaryEmail,
    name: githubUser.name ?? githubUser.login ?? null,
    emailVerified: true,
    accessToken: tokens.accessToken,
    refreshToken: "refreshToken" in tokens ? tokens.refreshToken : null,
    expiresAt: "accessTokenExpiresAt" in tokens ? tokens.accessTokenExpiresAt : null,
  });

  await createSessionAndRedirect(c, userId);
  return c.redirect(new URL("/", env.APP_URL).toString());
});

auth.get("/google", async (c) => {
  if (!google) {
    return c.json({ error: "Google OAuth is not configured." }, 503);
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = await google.createAuthorizationURL(state, codeVerifier, {
    scopes: ["openid", "email", "profile"],
  });

  setCookie(c, "google_oauth_state", state, oauthCookieOptions);
  setCookie(c, "google_oauth_code_verifier", codeVerifier, oauthCookieOptions);

  return c.redirect(url.toString());
});

auth.get("/google/callback", async (c) => {
  if (!google) {
    return c.json({ error: "Google OAuth is not configured." }, 503);
  }

  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "google_oauth_state");
  const storedCodeVerifier = getCookie(c, "google_oauth_code_verifier");

  if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
    return c.json({ error: "Invalid OAuth state." }, 400);
  }

  deleteCookie(c, "google_oauth_state", { path: "/" });
  deleteCookie(c, "google_oauth_code_verifier", { path: "/" });

  const tokens = await google.validateAuthorizationCode(code, storedCodeVerifier);
  const accessToken = tokens.accessToken;

  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoResponse.ok) {
    return c.json({ error: "Failed to fetch Google profile." }, 502);
  }
  const googleUser: {
    sub: string;
    email: string;
    email_verified: boolean;
    name?: string;
  } = await userInfoResponse.json();

  const { userId } = await findOrCreateOAuthUser({
    provider: "google",
    providerUserId: googleUser.sub,
    email: googleUser.email,
    name: googleUser.name ?? null,
    emailVerified: googleUser.email_verified,
    accessToken: tokens.accessToken,
    refreshToken: "refreshToken" in tokens ? tokens.refreshToken : null,
    expiresAt: "accessTokenExpiresAt" in tokens ? tokens.accessTokenExpiresAt : null,
  });

  await createSessionAndRedirect(c, userId);
  return c.redirect(new URL("/", env.APP_URL).toString());
});

type OAuthUserInput = {
  provider: "github" | "google";
  providerUserId: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
};

async function findOrCreateOAuthUser(input: OAuthUserInput) {
  const accountRows = await db
    .select()
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, input.provider),
        eq(oauthAccounts.providerUserId, input.providerUserId),
      ),
    )
    .limit(1);

  if (accountRows.length > 0) {
    await db
      .update(oauthAccounts)
      .set({
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
      })
      .where(eq(oauthAccounts.id, accountRows[0].id));

    return { userId: accountRows[0].userId };
  }

  const userRows = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  const existingUser = userRows[0];
  const userId = existingUser?.id ?? randomUUID();

  if (!existingUser) {
    await db.insert(users).values({
      id: userId,
      email: input.email,
      name: input.name,
      emailVerified: input.emailVerified,
    });
  }

  await db.insert(oauthAccounts).values({
    id: randomUUID(),
    userId,
    provider: input.provider,
    providerUserId: input.providerUserId,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    expiresAt: input.expiresAt,
  });

  return { userId };
}

async function createSessionAndRedirect(c: Context<AppEnv>, userId: string) {
  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  c.header("Set-Cookie", sessionCookie.serialize(), { append: true });
}

export { auth as authRoutes };
