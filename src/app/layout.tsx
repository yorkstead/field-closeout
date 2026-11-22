import type { Metadata } from "next";
import "./globals.css";
import { DemoHeader } from "@/components/DemoHeader";
import { getServerSession } from "@/lib/session";
import { getRuntimeMode, isDemoAllowed } from "@/lib/runtime-mode";
import { CANONICAL_DEMO_TENANT, resolveTenantProfile } from "@/lib/tenant-theme";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Field Closeout — Mid-Job Add-On Capture",
  description: "Capture mid-job add-ons, get zero-login homeowner approval, and reconcile before final invoicing.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const runtimeMode = getRuntimeMode();
  const demoAllowed = isDemoAllowed(runtimeMode);
  const session = await getServerSession();

  let tenant = CANONICAL_DEMO_TENANT;
  try {
    const rows = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, CANONICAL_DEMO_TENANT.id))
      .limit(1);
    if (rows.length > 0) {
      tenant = resolveTenantProfile(rows[0]);
    }
  } catch (err) {
    console.warn("Using fallback tenant profile in layout:", err);
  }

  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen flex flex-col text-slate-900 antialiased">
        <DemoHeader
          tenant={tenant}
          session={session}
          runtimeMode={runtimeMode}
          isDemoMode={demoAllowed}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Field Closeout • Yorkstead SaaS • Change-Order Record System</p>
        </footer>
      </body>
    </html>
  );
}
