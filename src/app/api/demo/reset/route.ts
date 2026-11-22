import { NextResponse } from "next/server";
import { isProtectedPilot } from "@/lib/runtime-mode";
import { seedDemoData } from "@/db/seed";

export async function POST() {
  if (isProtectedPilot()) {
    return NextResponse.json(
      { error: "Demo reset is forbidden in protected_pilot mode." },
      { status: 403 }
    );
  }

  try {
    await seedDemoData();
    return NextResponse.json({ ok: true, message: "Demo data reset successfully." });
  } catch (err) {
    console.error("Demo reset failed:", err);
    return NextResponse.json({ error: "Failed to reset demo data." }, { status: 500 });
  }
}
