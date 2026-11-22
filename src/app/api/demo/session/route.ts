import { NextResponse } from "next/server";
import { isProtectedPilot } from "@/lib/runtime-mode";
import { DEMO_USERS, SESSION_COOKIE_NAME } from "@/lib/session";
import { z } from "zod";

const SessionSchema = z.object({
  role: z.enum(["tech", "office"]),
});

export async function POST(request: Request) {
  if (isProtectedPilot()) {
    return NextResponse.json(
      { error: "Demo actions are forbidden in protected_pilot mode." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = SessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'tech' or 'office'." },
        { status: 400 }
      );
    }

    const { role } = parsed.data;
    const user = DEMO_USERS[role];

    const response = NextResponse.json({ ok: true, user });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: role,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Failed to parse request" }, { status: 400 });
  }
}
