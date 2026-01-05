import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { db, client } from "./client.js";

const migrationsFolder = path.resolve(process.cwd(), "drizzle");

await migrate(db, { migrationsFolder });
await client.end();
