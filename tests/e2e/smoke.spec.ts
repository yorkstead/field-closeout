import { test, expect } from "@playwright/test";

test.describe("Field Closeout App Shell Smoke Tests", () => {
  test("loads root shell with tenant branding, disclaimer, and navigates between roles", async ({
    page,
  }) => {
    // 1. Visit root page - should redirect to /tech (default role)
    await page.goto("/");
    await expect(page).toHaveURL(/\/tech/);

    // 2. Check tenant branding & compliance disclaimer
    await expect(page.getByTestId("tenant-name")).toHaveText("Northstar Mechanical & Plumbing");
    await expect(page.getByTestId("trade-type-badge")).toHaveText("HVAC & Plumbing");
    await expect(page.getByTestId("disclaimer-banner")).toContainText("Change-Order Record Only");

    // 3. Switch role to Office Manager
    await page.getByTestId("switch-role-office").click();
    await expect(page).toHaveURL(/\/office/);
    await expect(page.getByRole("heading", { name: "Change-Order Closeout Queue" })).toBeVisible();

    // 4. Switch role back to Field Tech
    await page.getByTestId("switch-role-tech").click();
    await expect(page).toHaveURL(/\/tech/);
    await expect(page.getByRole("heading", { name: "Today's Assigned Jobs" })).toBeVisible();

    // 5. Test Reset Demo Data button
    await page.getByTestId("reset-demo-button").click();
    await expect(page.getByText("Demo data reset to baseline!")).toBeVisible();
  });

  test("health check API returns 200 OK with connected database", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(json.database).toBe("connected");
    expect(json.runtimeMode).toBe("local");
  });
});
