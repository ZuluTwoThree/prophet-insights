import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "../env.js";

export const client = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
});

export const db = drizzle(client);
