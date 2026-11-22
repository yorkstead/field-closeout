import { pool } from "./index";

export async function checkMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    const requiredTables = [
      "tenants",
      "users",
      "catalog_items",
      "jobs",
      "change_orders",
      "change_order_line_items",
      "approval_events",
    ];

    const res = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
    );
    const existingTables = new Set(res.rows.map((r: { table_name: string }) => r.table_name));

    const missing = requiredTables.filter((t) => !existingTables.has(t));
    if (missing.length > 0) {
      throw new Error(`Missing expected database tables: ${missing.join(", ")}`);
    }

    console.log(`[✓] Migration check passed: all ${requiredTables.length} tables verified.`);
  } finally {
    client.release();
  }
}

if (import.meta.main) {
  checkMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[✗] Migration check failed:", err.message);
      await pool.end();
      process.exit(1);
    });
}
