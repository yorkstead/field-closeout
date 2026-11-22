import { pool, db } from "./index";
import {
  tenants,
  users,
  catalogItems,
  jobs,
  changeOrders,
  changeOrderLineItems,
  approvalEvents,
} from "./schema";
import { eq, sql } from "drizzle-orm";
import { createHash } from "crypto";

export const DEMO_TENANT_ID = "a0000000-0000-4000-8000-000000000001";
export const DEMO_TECH_USER_ID = "b0000000-0000-4000-8000-000000000001";
export const DEMO_OFFICE_USER_ID = "b0000000-0000-4000-8000-000000000002";

export async function seedDemoData(): Promise<void> {
  console.log("Seeding synthetic demo data for Northstar Mechanical & Plumbing...");

  // Temporarily set session_replication_role to replica to allow demo reset cleaning
  await db.execute(sql`SET session_replication_role = 'replica';`);

  // 1. Clean existing records for the demo tenant in reverse dependency order
  await db.delete(approvalEvents).where(eq(approvalEvents.tenantId, DEMO_TENANT_ID));
  await db.delete(changeOrderLineItems).where(eq(changeOrderLineItems.tenantId, DEMO_TENANT_ID));
  await db.delete(changeOrders).where(eq(changeOrders.tenantId, DEMO_TENANT_ID));
  await db.delete(jobs).where(eq(jobs.tenantId, DEMO_TENANT_ID));
  await db.delete(catalogItems).where(eq(catalogItems.tenantId, DEMO_TENANT_ID));
  await db.delete(users).where(eq(users.tenantId, DEMO_TENANT_ID));
  await db.delete(tenants).where(eq(tenants.id, DEMO_TENANT_ID));

  // 2. Insert Demo Tenant
  await db.insert(tenants).values({
    id: DEMO_TENANT_ID,
    slug: "northstar-mechanical",
    name: "Northstar Mechanical & Plumbing",
    tradeType: "HVAC & Plumbing",
    approvalThresholdCents: 50000, // $500.00
    disclaimerText:
      "Change-Order Record Only — pre-tax flat-rate estimate. Not payment processing, tax advice, or legal advice.",
    themeConfig: {
      primaryColor: "#0284c7",
      accentColor: "#0f172a",
      badgeLabel: "HVAC & Plumbing",
    },
  });

  // 3. Insert Demo Users
  await db.insert(users).values([
    {
      id: DEMO_TECH_USER_ID,
      tenantId: DEMO_TENANT_ID,
      role: "tech",
      displayName: "Marcus Cole",
      email: "marcus.cole@example-demo.northstar.test",
    },
    {
      id: DEMO_OFFICE_USER_ID,
      tenantId: DEMO_TENANT_ID,
      role: "office",
      displayName: "Dana Reyes",
      email: "dana.reyes@example-demo.northstar.test",
    },
  ]);

  // 4. Insert 6 Flat-Rate Catalog Items
  const catalogList = [
    {
      id: "c0000000-0000-4000-8000-000000000001",
      tenantId: DEMO_TENANT_ID,
      name: "Replace Corroded Shutoff Valve",
      description: "Replace degraded 1/2in or 3/4in ball valve with premium quarter-turn brass valve.",
      unitPriceCents: 18000,
      active: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000002",
      tenantId: DEMO_TENANT_ID,
      name: "Install Surge Protector on Condenser",
      description: "Add dedicated whole-condenser surge protective device (SPD) to disconnect.",
      unitPriceCents: 24500,
      active: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000003",
      tenantId: DEMO_TENANT_ID,
      name: "Upgrade to Smart Thermostat",
      description: "Supply and install WiFi-enabled smart thermostat, configure app, and calibrate.",
      unitPriceCents: 32000,
      active: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000004",
      tenantId: DEMO_TENANT_ID,
      name: "Replace Expansion Tank",
      description: "Remove failing thermal expansion tank and install 2.1-gallon potable expansion tank.",
      unitPriceCents: 39000,
      active: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000005",
      tenantId: DEMO_TENANT_ID,
      name: "Run Dedicated 20A Circuit",
      description: "Run new 20-amp 120V circuit with GFCI protection from panel up to 45 ft.",
      unitPriceCents: 65000,
      active: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000006",
      tenantId: DEMO_TENANT_ID,
      name: "Replace Main Pressure Reducing Valve",
      description: "Replace failing 1in PRV and set household pressure to 65 PSI nominal.",
      unitPriceCents: 58000,
      active: true,
    },
  ];
  await db.insert(catalogItems).values(catalogList);

  // 5. Insert 4 Active Jobs (Synthetic, 0 real PII)
  const jobList = [
    {
      id: "d0000000-0000-4000-8000-000000000001",
      tenantId: DEMO_TENANT_ID,
      jobNumber: "JOB-2026-101",
      customerName: "Alex Rivera",
      serviceAddress: "104 Pinecrest Way, Springfield",
      assignedTechId: DEMO_TECH_USER_ID,
      status: "active" as const,
    },
    {
      id: "d0000000-0000-4000-8000-000000000002",
      tenantId: DEMO_TENANT_ID,
      jobNumber: "JOB-2026-102",
      customerName: "Jordan Bennett",
      serviceAddress: "512 Oakridge Ave, Springfield",
      assignedTechId: DEMO_TECH_USER_ID,
      status: "active" as const,
    },
    {
      id: "d0000000-0000-4000-8000-000000000003",
      tenantId: DEMO_TENANT_ID,
      jobNumber: "JOB-2026-103",
      customerName: "Taylor Morgan",
      serviceAddress: "880 Maple Grove Rd, Springfield",
      assignedTechId: DEMO_TECH_USER_ID,
      status: "active" as const,
    },
    {
      id: "d0000000-0000-4000-8000-000000000004",
      tenantId: DEMO_TENANT_ID,
      jobNumber: "JOB-2026-104",
      customerName: "Casey Vance",
      serviceAddress: "221 Elmwood Court, Springfield",
      assignedTechId: DEMO_TECH_USER_ID,
      status: "active" as const,
    },
  ];
  await db.insert(jobs).values(jobList);

  // 6. Insert 3 Pre-Seeded Change Orders
  // CO 1: Pending Homeowner ($180 <= $500 threshold)
  const co1Id = "e0000000-0000-4000-8000-000000000001";
  await db.insert(changeOrders).values({
    id: co1Id,
    tenantId: DEMO_TENANT_ID,
    jobId: jobList[0].id,
    createdByUserId: DEMO_TECH_USER_ID,
    status: "pending_homeowner",
    subtotalCents: 18000,
    notes: "Shutoff valve leaking around packing nut, recommend replacement while water is isolated.",
    approvalToken: "token_demo_pending_homeowner_001",
  });
  await db.insert(changeOrderLineItems).values({
    id: "f0000000-0000-4000-8000-000000000001",
    tenantId: DEMO_TENANT_ID,
    changeOrderId: co1Id,
    catalogItemId: catalogList[0].id,
    title: catalogList[0].name,
    description: catalogList[0].description,
    quantity: 1,
    unitPriceCents: 18000,
    lineTotalCents: 18000,
  });
  await db.insert(approvalEvents).values({
    id: "a1000000-0000-4000-8000-000000000001",
    tenantId: DEMO_TENANT_ID,
    changeOrderId: co1Id,
    eventType: "submitted",
    actorType: "tech",
    actorName: "Marcus Cole",
    snapshotTotalCents: 18000,
  });

  // CO 2: Pending Office ($650 > $500 threshold)
  const co2Id = "e0000000-0000-4000-8000-000000000002";
  await db.insert(changeOrders).values({
    id: co2Id,
    tenantId: DEMO_TENANT_ID,
    jobId: jobList[1].id,
    createdByUserId: DEMO_TECH_USER_ID,
    status: "pending_office",
    subtotalCents: 65000,
    notes: "Requires dedicated 20A circuit for new basement booster pump. Above tech threshold ($500).",
    approvalToken: "token_demo_pending_office_002",
  });
  await db.insert(changeOrderLineItems).values({
    id: "f0000000-0000-4000-8000-000000000002",
    tenantId: DEMO_TENANT_ID,
    changeOrderId: co2Id,
    catalogItemId: catalogList[4].id,
    title: catalogList[4].name,
    description: catalogList[4].description,
    quantity: 1,
    unitPriceCents: 65000,
    lineTotalCents: 65000,
  });
  await db.insert(approvalEvents).values({
    id: "a1000000-0000-4000-8000-000000000002",
    tenantId: DEMO_TENANT_ID,
    changeOrderId: co2Id,
    eventType: "submitted",
    actorType: "tech",
    actorName: "Marcus Cole",
    snapshotTotalCents: 65000,
  });

  // CO 3: Approved ($320)
  const co3Id = "e0000000-0000-4000-8000-000000000003";
  const co3Hash = createHash("sha256")
    .update(`co:${co3Id}:32000:Taylor Morgan`)
    .digest("hex");

  await db.insert(changeOrders).values({
    id: co3Id,
    tenantId: DEMO_TENANT_ID,
    jobId: jobList[2].id,
    createdByUserId: DEMO_TECH_USER_ID,
    status: "approved",
    subtotalCents: 32000,
    notes: "Homeowner requested smart thermostat upgrade while on site.",
    approvalToken: "token_demo_approved_003",
  });
  await db.insert(changeOrderLineItems).values({
    id: "f0000000-0000-4000-8000-000000000003",
    tenantId: DEMO_TENANT_ID,
    changeOrderId: co3Id,
    catalogItemId: catalogList[2].id,
    title: catalogList[2].name,
    description: catalogList[2].description,
    quantity: 1,
    unitPriceCents: 32000,
    lineTotalCents: 32000,
  });
  await db.insert(approvalEvents).values([
    {
      id: "a1000000-0000-4000-8000-000000000003",
      tenantId: DEMO_TENANT_ID,
      changeOrderId: co3Id,
      eventType: "submitted",
      actorType: "tech",
      actorName: "Marcus Cole",
      snapshotTotalCents: 32000,
    },
    {
      id: "a1000000-0000-4000-8000-000000000004",
      tenantId: DEMO_TENANT_ID,
      changeOrderId: co3Id,
      eventType: "homeowner_approved",
      actorType: "homeowner",
      actorName: "Taylor Morgan",
      approvalMode: "on_device",
      signaturePayload: "sig_synthetic_demo_taylor_morgan",
      snapshotTotalCents: 32000,
      snapshotHash: co3Hash,
    },
  ]);

  // Restore session_replication_role to origin
  await db.execute(sql`SET session_replication_role = 'origin';`);

  console.log("[✓] Synthetic demo data successfully seeded for Northstar Mechanical & Plumbing.");
}

if (import.meta.main) {
  seedDemoData()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[✗] Seeding failed:", err);
      await pool.end();
      process.exit(1);
    });
}
