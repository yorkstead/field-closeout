import { cookies } from "next/headers";
import { isProtectedPilot } from "./runtime-mode";
import {
  DEMO_TENANT_ID,
  DEMO_TECH_USER_ID,
  DEMO_OFFICE_USER_ID,
} from "../db/seed";

export type UserRole = "tech" | "office" | "owner";

export interface SessionUser {
  tenantId: string;
  userId: string;
  role: UserRole;
  displayName: string;
  email: string;
}

export const DEMO_USERS: Record<"tech" | "office", SessionUser> = {
  tech: {
    tenantId: DEMO_TENANT_ID,
    userId: DEMO_TECH_USER_ID,
    role: "tech",
    displayName: "Marcus Cole",
    email: "marcus.cole@example-demo.northstar.test",
  },
  office: {
    tenantId: DEMO_TENANT_ID,
    userId: DEMO_OFFICE_USER_ID,
    role: "office",
    displayName: "Dana Reyes",
    email: "dana.reyes@example-demo.northstar.test",
  },
};

export const SESSION_COOKIE_NAME = "fc_demo_role";

/**
 * Server-side session reader.
 * In local and hosted_demo modes, resolves the active demo session (defaulting to tech).
 * In protected_pilot, demo role-switching is disabled.
 */
export async function getServerSession(): Promise<SessionUser | null> {
  if (isProtectedPilot()) {
    // In protected_pilot mode, demo switching cookies are rejected.
    // Real auth is introduced in Phase 2 (004).
    return null;
  }

  const cookieStore = await cookies();
  const roleCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (roleCookie === "office") {
    return DEMO_USERS.office;
  }

  // Default to field tech
  return DEMO_USERS.tech;
}
