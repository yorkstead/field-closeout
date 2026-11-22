import { z } from "zod";

export const RuntimeModeSchema = z.enum(["local", "hosted_demo", "protected_pilot"]);

export type RuntimeMode = z.infer<typeof RuntimeModeSchema>;

export function getRuntimeMode(): RuntimeMode {
  const envMode = process.env.APP_RUNTIME_MODE || "local";
  const result = RuntimeModeSchema.safeParse(envMode);
  if (!result.success) {
    throw new Error(
      `Invalid APP_RUNTIME_MODE: "${envMode}". Expected "local", "hosted_demo", or "protected_pilot".`
    );
  }
  return result.data;
}

export function isDemoAllowed(mode?: RuntimeMode): boolean {
  const currentMode = mode ?? getRuntimeMode();
  return currentMode === "local" || currentMode === "hosted_demo";
}

export function isProtectedPilot(mode?: RuntimeMode): boolean {
  const currentMode = mode ?? getRuntimeMode();
  return currentMode === "protected_pilot";
}

export function assertDemoAllowed(): void {
  if (!isDemoAllowed()) {
    throw new Error("Demo actions (role switcher, reset) are disabled in protected_pilot mode.");
  }
}
