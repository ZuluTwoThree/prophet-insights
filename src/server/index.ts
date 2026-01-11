import { Hono } from "hono";
import type { AppEnv } from "./types.js";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { authRoutes } from "./routes/auth.js";
import { patentsRoutes } from "./routes/patents.js";
import { env, isProd } from "./env.js";
import { sessionMiddleware } from "./middleware/session.js";

const app = new Hono<AppEnv>();

app.use("*", logger());
app.use("/api/*", cors({ origin: env.ALLOWED_ORIGIN, credentials: true }));
app.use("/api/*", sessionMiddleware);

app.get("/api/health", (c) => c.json({ status: "ok" }));
app.route("/api/auth", authRoutes);
app.route("/api/patents", patentsRoutes);

if (isProd) {
  const clientDir = path.resolve(process.cwd(), "dist/client");

  app.use("/assets/*", serveStatic({ root: clientDir }));
  app.use("/favicon.ico", serveStatic({ root: clientDir }));
  app.use("/robots.txt", serveStatic({ root: clientDir }));
  app.use("/placeholder.svg", serveStatic({ root: clientDir }));

  app.get("*", async (c) => {
    const html = await readFile(path.join(clientDir, "index.html"), "utf-8");
    return c.html(html);
  });
} else {
  app.get("/", (c) => c.text("API running"));
}

serve({ fetch: app.fetch, port: env.PORT });
