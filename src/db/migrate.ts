import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";

export async function runMigrations(): Promise<void> {
  console.log("Applying database migrations from ./drizzle...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied successfully.");
}

if (import.meta.main) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Migration failed:", err);
      await pool.end();
      process.exit(1);
    });
}
