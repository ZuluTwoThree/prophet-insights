import type { MiddlewareHandler } from "hono";
import { lucia } from "../auth/lucia";
import type { AppEnv } from "../types";

export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const cookieHeader = c.req.header("Cookie") ?? "";
  const sessionId = lucia.readSessionCookie(cookieHeader);

  if (!sessionId) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  const { session, user } = await lucia.validateSession(sessionId);

  if (session?.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    c.header("Set-Cookie", sessionCookie.serialize(), { append: true });
  }

  if (!session) {
    const blankCookie = lucia.createBlankSessionCookie();
    c.header("Set-Cookie", blankCookie.serialize(), { append: true });
  }

  c.set("user", user);
  c.set("session", session);
  await next();
};
