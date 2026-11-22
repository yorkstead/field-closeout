import { describe, expect, it } from "bun:test";
import {
  getRuntimeMode,
  isDemoAllowed,
  isProtectedPilot,
  assertDemoAllowed,
} from "../../src/lib/runtime-mode";

describe("runtime-mode", () => {
  const originalEnv = process.env.APP_RUNTIME_MODE;

  it("defaults to local when APP_RUNTIME_MODE is unset", () => {
    delete process.env.APP_RUNTIME_MODE;
    expect(getRuntimeMode()).toBe("local");
    expect(isDemoAllowed()).toBe(true);
    expect(isProtectedPilot()).toBe(false);
    expect(() => assertDemoAllowed()).not.toThrow();
  });

  it("handles hosted_demo mode", () => {
    process.env.APP_RUNTIME_MODE = "hosted_demo";
    expect(getRuntimeMode()).toBe("hosted_demo");
    expect(isDemoAllowed()).toBe(true);
    expect(isProtectedPilot()).toBe(false);
    expect(() => assertDemoAllowed()).not.toThrow();
  });

  it("blocks demo in protected_pilot mode", () => {
    process.env.APP_RUNTIME_MODE = "protected_pilot";
    expect(getRuntimeMode()).toBe("protected_pilot");
    expect(isDemoAllowed()).toBe(false);
    expect(isProtectedPilot()).toBe(true);
    expect(() => assertDemoAllowed()).toThrow(
      "Demo actions (role switcher, reset) are disabled in protected_pilot mode."
    );
  });

  it("rejects invalid runtime mode values", () => {
    process.env.APP_RUNTIME_MODE = "invalid_mode";
    expect(() => getRuntimeMode()).toThrow("Invalid APP_RUNTIME_MODE");
  });

  // Restore
  process.env.APP_RUNTIME_MODE = originalEnv;
});
