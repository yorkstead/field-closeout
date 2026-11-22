import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { createChangeOrder } from "@/lib/change-orders";
import { ZodError } from "zod";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await createChangeOrder(body, session);

    return NextResponse.json(
      {
        ok: true,
        changeOrder: result.changeOrder,
        status: result.status,
        approvalToken: result.approvalToken,
        subtotalCents: result.subtotalCents,
        lineItems: result.lineItems,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.issues },
        { status: 400 }
      );
    }

    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("POST /api/change-orders error:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
