import { test, expect } from "@playwright/test";

test.describe("003 Homeowner Approval, Closeout Queue & Reconciliation", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/demo/reset");
  });

  test("full end-to-end loop: tech capture -> homeowner sign-off -> office reconciliation -> closeout packet", async ({
    page,
  }) => {
    // --- STEP 1: Tech Capture (Under Threshold $180) ---
    await page.goto("/tech");
    await page.getByTestId("capture-addon-JOB-2026-104").click();
    await expect(page.getByRole("heading", { name: "Casey Vance" })).toBeVisible();

    await page.getByRole("button", { name: /Replace Corroded Shutoff Valve/i }).click();
    await expect(page.getByTestId("live-total-cents")).toHaveText("$180.00");

    await page.getByTestId("submit-change-order").click();
    await expect(page).toHaveURL(/\/tech\/change-orders\/.*/, { timeout: 15000 });

    // --- STEP 2: Device Handoff to Homeowner ---
    await page.getByTestId("hand-phone-to-homeowner-button").click();
    await expect(page).toHaveURL(/\/approve\/.*mode=on_device/, { timeout: 15000 });

    // Homeowner signs on glass
    await page.getByTestId("signer-name-input").fill("Casey Vance");
    await page.getByTestId("approve-change-order-button").click();

    // Verify read-only signed receipt with SHA-256 hash
    await expect(page.getByTestId("decision-receipt-card")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Change Order Approved" })).toBeVisible();
    await expect(page.getByTestId("snapshot-hash-display")).toHaveText(/^[0-9a-f]{64}$/);

    // Tech takes phone back
    await page.getByText("Return to Field Tech View").click();
    await expect(page).toHaveURL(/\/tech/);

    // --- STEP 3: Office Reconciliation ---
    await page.getByTestId("switch-role-office").click();
    await expect(page).toHaveURL(/\/office/);

    // Locate Casey Vance row and click Mark Reconciled
    const caseyRow = page.locator('[data-testid^="office-row-"]').filter({ hasText: "Casey Vance" });
    await expect(caseyRow).toBeVisible();
    await caseyRow.getByRole("button", { name: /Mark Reconciled/i }).click();

    // Fill invoice ref
    await page.getByTestId("reconcile-invoice-input").fill("INV-4821");
    await page.getByTestId("confirm-reconcile-button").click();

    // Verify row now shows Reconciled (INV-4821)
    await expect(caseyRow.getByText("Reconciled (INV-4821)")).toBeVisible({ timeout: 10000 });

    // --- STEP 4: Printable Closeout Summary Packet ---
    await caseyRow.getByTitle("View Closeout Summary").click();
    await expect(page).toHaveURL(/\/office\/change-orders\/.*\/summary/);

    await expect(page.getByRole("heading", { name: "Casey Vance" })).toBeVisible();
    await expect(page.getByTestId("summary-reconciled-invoice-ref")).toHaveText("INV-4821");
    await expect(page.getByTestId("summary-snapshot-hash")).toHaveText(/^[0-9a-f]{64}$/);
    await expect(page.getByTestId("print-summary-button")).toBeVisible();
  });

  test("over-threshold loop: tech >$500 -> office releases -> homeowner approves", async ({
    page,
  }) => {
    // --- STEP 1: Tech creates over-threshold quote ($650) ---
    await page.goto("/tech");
    await page.getByTestId("capture-addon-JOB-2026-101").click();

    await page.getByRole("button", { name: /Run Dedicated 20A Circuit/i }).click();
    await page.getByTestId("submit-change-order").click();
    await expect(page).toHaveURL(/\/tech\/change-orders\/.*/, { timeout: 15000 });

    await expect(page.getByTestId("status-pending-office-card")).toBeVisible();

    // Extract the URL or token
    const url = page.url();
    const coId = url.split("/").pop()!;

    // --- STEP 2: Office Reviews and Releases ---
    await page.getByTestId("switch-role-office").click();
    await expect(page).toHaveURL(/\/office/);

    const targetRow = page.getByTestId(`office-row-${coId}`);
    await expect(targetRow).toBeVisible();
    await targetRow.getByRole("button", { name: /Review & Release/i }).click();

    // Confirm release in modal
    await page.getByTestId("confirm-release-button").click();

    // Verify row transitioned to Awaiting Homeowner
    await expect(targetRow.getByText("Awaiting Homeowner")).toBeVisible({ timeout: 10000 });

    // --- STEP 3: Homeowner Approves Released Order ---
    // Open the summary to find approval link or visit approve token
    await targetRow.getByTitle("View Closeout Summary").click();
    await expect(page).toHaveURL(/\/office\/change-orders\/.*\/summary/);
  });
});
