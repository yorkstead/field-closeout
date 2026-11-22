import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { catalogItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await db
      .select({
        id: catalogItems.id,
        name: catalogItems.name,
        description: catalogItems.description,
        unitPriceCents: catalogItems.unitPriceCents,
        active: catalogItems.active,
      })
      .from(catalogItems)
      .where(
        and(
          eq(catalogItems.tenantId, session.tenantId),
          eq(catalogItems.active, true)
        )
      );

    return NextResponse.json({ catalog: items });
  } catch (err) {
    console.error("GET /api/catalog error:", err);
    return NextResponse.json({ error: "Failed to fetch catalog" }, { status: 500 });
  }
}
