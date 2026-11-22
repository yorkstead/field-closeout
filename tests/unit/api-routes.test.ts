import { describe, expect, it, afterEach } from "bun:test";
import { POST as handleSessionPost } from "../../src/app/api/demo/session/route";
import { POST as handleResetPost } from "../../src/app/api/demo/reset/route";

describe("API Demo Endpoints — Runtime Boundary Enforcement", () => {
  const originalEnv = process.env.APP_RUNTIME_MODE;

  afterEach(() => {
    process.env.APP_RUNTIME_MODE = originalEnv;
  });

  it("POST /api/demo/session returns 403 in protected_pilot mode", async () => {
    process.env.APP_RUNTIME_MODE = "protected_pilot";

    const request = new Request("http://localhost:3000/api/demo/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "office" }),
    });

    const response = await handleSessionPost(request);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("forbidden in protected_pilot mode");
  });

  it("POST /api/demo/reset returns 403 in protected_pilot mode", async () => {
    process.env.APP_RUNTIME_MODE = "protected_pilot";

    const response = await handleResetPost();
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("forbidden in protected_pilot mode");
  });

  it("POST /api/demo/session rejects invalid role with 400", async () => {
    process.env.APP_RUNTIME_MODE = "local";

    const request = new Request("http://localhost:3000/api/demo/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "superadmin" }),
    });

    const response = await handleSessionPost(request);
    expect(response.status).toBe(400);
  });

  it("POST /api/demo/session accepts valid role in local mode and sets cookie", async () => {
    process.env.APP_RUNTIME_MODE = "local";

    const request = new Request("http://localhost:3000/api/demo/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "office" }),
    });

    const response = await handleSessionPost(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.user.role).toBe("office");

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("fc_demo_role=office");
  });
});
