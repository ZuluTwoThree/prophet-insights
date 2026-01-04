import "dotenv/config";

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

const databaseUrl = process.env.DATABASE_URL ?? "";
const appUrl = process.env.APP_URL ?? "http://localhost:8080";

if (isProduction && !databaseUrl) {
  throw new Error("DATABASE_URL is required in production.");
}

if (isProduction && !process.env.APP_URL) {
  throw new Error("APP_URL is required in production.");
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: Number(process.env.PORT ?? "8787"),
  DATABASE_URL: databaseUrl,
  APP_URL: appUrl,
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN ?? appUrl,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ?? "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ?? "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
};

export const isProd = env.NODE_ENV === "production";
