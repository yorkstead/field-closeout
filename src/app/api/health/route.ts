import { NextResponse } from "next/server";
import { pool } from "@/db";
import { getRuntimeMode } from "@/lib/runtime-mode";

export async function GET() {
  let dbStatus = "connected";
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1;");
    } finally {
      client.release();
    }
  } catch (err) {
    dbStatus = "disconnected";
    console.error("Health check DB error:", err);
  }

  const mode = getRuntimeMode();
  const ok = dbStatus === "connected";

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      runtimeMode: mode,
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
