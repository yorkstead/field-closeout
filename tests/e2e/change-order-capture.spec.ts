import { test, expect } from "@playwright/test";

test.describe("002 Field Add-On Capture & Threshold Routing", () => {
  test.beforeEach(async ({ request }) => {
    // Reset to clean demo baseline before each test
    await request.post("/api/demo/reset");
  });

  test("creates under-threshold change order ($180 <= $500) routing to homeowner approval", async ({
    page,
  }) => {
    // 1. Visit Tech job list
    await page.goto("/tech");
    await expect(page.getByRole("heading", { name: "Today's Assigned Jobs" })).toBeVisible();

    // 2. Click "+ Add Change Order" for Job 104 (Casey Vance)
    await page.getByTestId("capture-addon-JOB-2026-104").click();
    await expect(page).toHaveURL(/\/tech\/jobs\/.*\/new-change-order/);
    await expect(page.getByRole("heading", { name: "Casey Vance" })).toBeVisible();

    // 3. Select flat-rate catalog item: Replace Corroded Shutoff Valve ($180.00)
    await page.getByRole("button", { name: /Replace Corroded Shutoff Valve/i }).click();

    // 4. Verify live total preview shows $180.00
    await expect(page.getByTestId("live-total-cents")).toHaveText("$180.00");

    // 5. Threshold banner indicates within tech authority
    await expect(page.getByTestId("threshold-status-banner")).toContainText(
      "Within Tech Authority — Ready for Homeowner Approval"
    );

    // 6. Select a sample photo
    await page.getByTestId("sample-photo-shutoff-valve").click();
    await expect(page.getByText("Ready to submit with change order")).toBeVisible();

    // 7. Add notes
    await page.getByTestId("change-order-notes").fill("Packing nut dripping near main shutoff.");

    // 8. Submit change order
    await page.getByTestId("submit-change-order").click();

    // 9. Redirects to handoff screen
    await expect(page).toHaveURL(/\/tech\/change-orders\/.*/, { timeout: 15000 });
    await expect(page.getByTestId("status-pending-homeowner-card")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Approved for Field Presentation" })).toBeVisible();

    // 10. Homeowner handoff CTAs are available
    await expect(page.getByTestId("hand-phone-to-homeowner-button")).toBeVisible();
    await expect(page.getByTestId("copy-approval-link-button")).toBeVisible();
    await expect(page.getByTestId("handoff-subtotal-cents")).toHaveText("$180.00");
  });

  test("creates over-threshold change order ($650 > $500) routing to office review", async ({
    page,
  }) => {
    // 1. Visit Tech job list
    await page.goto("/tech");

    // 2. Click "+ Add Change Order" for Job 101
    await page.getByTestId("capture-addon-JOB-2026-101").click();

    // 3. Select catalog item: Run Dedicated 20A Circuit ($650.00)
    await page.getByRole("button", { name: /Run Dedicated 20A Circuit/i }).click();

    // 4. Verify live total shows $650.00
    await expect(page.getByTestId("live-total-cents")).toHaveText("$650.00");

    // 5. Threshold banner indicates office approval needed
    await expect(page.getByTestId("threshold-status-banner")).toContainText(
      "Over $500 Threshold — Requires Office Approval"
    );

    // 6. Submit change order
    await page.getByTestId("submit-change-order").click();

    // 7. Redirects to handoff screen showing Office Review banner
    await expect(page).toHaveURL(/\/tech\/change-orders\/.*/, { timeout: 15000 });
    await expect(page.getByTestId("status-pending-office-card")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sent to Office for Price Review" })).toBeVisible();
    await expect(page.getByText("Dana Reyes in the office has been routed this change order")).toBeVisible();
    await expect(page.getByTestId("handoff-subtotal-cents")).toHaveText("$650.00");
  });
});
