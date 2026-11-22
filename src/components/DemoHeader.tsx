"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { TenantProfile } from "@/lib/tenant-theme";
import type { SessionUser } from "@/lib/session";
import { Wrench, Building2, RotateCcw, ShieldCheck, CheckCircle2 } from "lucide-react";

interface DemoHeaderProps {
  tenant: TenantProfile;
  session: SessionUser | null;
  runtimeMode: string;
  isDemoMode: boolean;
}

export function DemoHeader({ tenant, session, runtimeMode, isDemoMode }: DemoHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const currentRole = session?.role || "tech";

  async function handleSwitchRole(role: "tech" | "office") {
    try {
      const res = await fetch("/api/demo/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        if (role === "tech") {
          router.push("/tech");
        } else {
          router.push("/office");
        }
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to switch role:", err);
    }
  }

  async function handleResetDemo() {
    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch("/api/demo/reset", {
        method: "POST",
      });
      if (res.ok) {
        setResetMessage("Demo data reset to baseline!");
        router.refresh();
        setTimeout(() => setResetMessage(null), 3000);
      } else {
        setResetMessage("Reset failed.");
      }
    } catch {
      setResetMessage("Reset error.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <header className="w-full bg-slate-900 text-white shadow-md border-b border-slate-800">
      {/* Demo Controls Bar (only rendered in local and hosted_demo) */}
      {isDemoMode && (
        <div className="bg-slate-950 px-4 py-1.5 border-b border-slate-800/80 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                data-testid="runtime-mode-badge"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Mode: {runtimeMode}
              </span>
              <span className="text-slate-400 hidden sm:inline">
                Fictional demo data • 0 real PII
              </span>
            </div>

            <div className="flex items-center gap-2">
              {resetMessage && (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {resetMessage}
                </span>
              )}
              <div className="flex items-center rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                <button
                  type="button"
                  data-testid="switch-role-tech"
                  onClick={() => handleSwitchRole("tech")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                    currentRole === "tech"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Wrench className="w-3 h-3" />
                  Tech (Marcus)
                </button>
                <button
                  type="button"
                  data-testid="switch-role-office"
                  onClick={() => handleSwitchRole("office")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                    currentRole === "office"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Building2 className="w-3 h-3" />
                  Office (Dana)
                </button>
              </div>

              <button
                type="button"
                data-testid="reset-demo-button"
                onClick={handleResetDemo}
                disabled={isResetting}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1 font-medium disabled:opacity-50"
              >
                <RotateCcw className={`w-3 h-3 ${isResetting ? "animate-spin" : ""}`} />
                {isResetting ? "Resetting..." : "Reset Demo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Branding & Navigation Top Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center font-bold text-lg text-white shadow-inner">
            FC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span data-testid="tenant-name" className="font-semibold text-slate-100 text-base sm:text-lg tracking-tight">
                {tenant.name}
              </span>
              <span
                data-testid="trade-type-badge"
                className="text-[11px] px-2 py-0.5 rounded font-medium bg-slate-800 text-slate-300 border border-slate-700"
              >
                {tenant.tradeType}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Field Closeout • Change-Order Record System
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center gap-2">
          <Link
            href="/tech"
            data-testid="nav-tech-tab"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${
              pathname.startsWith("/tech")
                ? "bg-sky-600/20 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Wrench className="w-4 h-4" />
            Field Tech
          </Link>
          <Link
            href="/office"
            data-testid="nav-office-tab"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${
              pathname.startsWith("/office")
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Office Queue
          </Link>
        </nav>
      </div>

      {/* Compliance Disclaimer Subheader */}
      <div
        data-testid="disclaimer-banner"
        className="bg-slate-950/60 border-t border-slate-800/60 px-4 py-1.5 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span>{tenant.disclaimerText}</span>
      </div>
    </header>
  );
}
