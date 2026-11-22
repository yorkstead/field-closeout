"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCents } from "@/lib/money";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ArrowUpRight,
  Download,
  AlertCircle,
  X,
  Receipt,
  DollarSign,
  Briefcase,
  Sliders,
} from "lucide-react";

export interface OfficeChangeOrderRow {
  id: string;
  jobNumber: string;
  customerName: string;
  serviceAddress: string;
  status: "pending_office" | "pending_homeowner" | "approved" | "declined" | "reconciled";
  subtotalCents: number;
  notes: string;
  techName: string;
  approvalToken: string;
  reconciledInvoiceRef: string | null;
  reconciledAt: Date | null;
  createdAt: Date;
  lineItems: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
}

interface OfficeQueueTableProps {
  changeOrders: OfficeChangeOrderRow[];
  thresholdCents: number;
}

export function OfficeQueueTable({
  changeOrders,
  thresholdCents,
}: OfficeQueueTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [activeTab, setActiveTab] = useState<
    "all" | "pending_office" | "pending_homeowner" | "approved" | "reconciled" | "declined"
  >("all");

  // Copy link state
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Reconcile Modal state
  const [reconcileModalCo, setReconcileModalCo] = useState<OfficeChangeOrderRow | null>(null);
  const [invoiceRefInput, setInvoiceRefInput] = useState("");
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  // Review & Release Modal state
  const [releaseModalCo, setReleaseModalCo] = useState<OfficeChangeOrderRow | null>(null);
  const [adjustedPrices, setAdjustedPrices] = useState<Record<string, number>>({});
  const [releaseError, setReleaseError] = useState<string | null>(null);

  // Filter rows
  const filteredRows = changeOrders.filter((co) => {
    if (activeTab === "all") return true;
    if (activeTab === "approved") return co.status === "approved" && !co.reconciledInvoiceRef;
    return co.status === activeTab;
  });

  // KPIs
  const recoveredRevenueCents = changeOrders
    .filter((co) => co.status === "approved" || co.status === "reconciled")
    .reduce((sum, co) => sum + co.subtotalCents, 0);

  const unbilledApproved = changeOrders.filter(
    (co) => co.status === "approved" && !co.reconciledInvoiceRef
  );
  const unbilledRevenueCents = unbilledApproved.reduce((sum, co) => sum + co.subtotalCents, 0);

  const pendingOfficeCount = changeOrders.filter((co) => co.status === "pending_office").length;

  function handleCopyApprovalLink(token: string) {
    const url = `${window.location.origin}/approve/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  }

  // Handle Release
  function openReleaseModal(co: OfficeChangeOrderRow) {
    setReleaseModalCo(co);
    setReleaseError(null);
    const initialPrices: Record<string, number> = {};
    for (const item of co.lineItems) {
      initialPrices[item.id] = item.unitPriceCents;
    }
    setAdjustedPrices(initialPrices);
  }

  async function handleConfirmRelease() {
    if (!releaseModalCo) return;
    setReleaseError(null);

    const hasAnyAdjustments = releaseModalCo.lineItems.some(
      (item) => adjustedPrices[item.id] !== item.unitPriceCents
    );

    const payload = hasAnyAdjustments
      ? {
          adjustedItems: releaseModalCo.lineItems.map((item) => ({
            lineItemId: item.id,
            unitPriceCents: adjustedPrices[item.id] ?? item.unitPriceCents,
          })),
        }
      : {};

    startTransition(async () => {
      try {
        const res = await fetch(`/api/office/change-orders/${releaseModalCo.id}/release`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setReleaseError(data.error || "Failed to release change order.");
          return;
        }

        setReleaseModalCo(null);
        router.refresh();
      } catch {
        setReleaseError("Network error during release.");
      }
    });
  }

  // Handle Reconcile
  function openReconcileModal(co: OfficeChangeOrderRow) {
    setReconcileModalCo(co);
    setInvoiceRefInput("");
    setReconcileError(null);
  }

  async function handleConfirmReconcile(e: React.FormEvent) {
    e.preventDefault();
    if (!reconcileModalCo) return;
    setReconcileError(null);

    if (!invoiceRefInput.trim()) {
      setReconcileError("Please enter an invoice number (e.g. INV-4821).");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/office/change-orders/${reconcileModalCo.id}/reconcile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reconciledInvoiceRef: invoiceRefInput.trim() }),
        });

        const data = await res.json();
        if (!res.ok) {
          setReconcileError(data.error || "Failed to reconcile change order.");
          return;
        }

        setReconcileModalCo(null);
        router.refresh();
      } catch {
        setReconcileError("Network error during reconciliation.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* 1. Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Recovered Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
            <span>Recovered Add-On Revenue</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div data-testid="kpi-recovered-revenue" className="text-2xl font-extrabold text-slate-900">
            {formatCents(recoveredRevenueCents)}
          </div>
          <div className="text-[11px] text-slate-400">
            Approved & Reconciled change orders
          </div>
        </div>

        {/* KPI 2: Action Needed (Unbilled Approved) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center justify-between">
            <span>Unbilled Approved (Action Needed)</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div data-testid="kpi-unbilled-approved" className="text-2xl font-extrabold text-indigo-950">
            {formatCents(unbilledRevenueCents)}
          </div>
          <div className="text-[11px] text-slate-400">
            {unbilledApproved.length} approved orders awaiting invoice reconciliation
          </div>
        </div>

        {/* KPI 3: Over-Threshold Office Review */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center justify-between">
            <span>Pending Office Review</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div data-testid="kpi-pending-office" className="text-2xl font-extrabold text-amber-950">
            {pendingOfficeCount}
          </div>
          <div className="text-[11px] text-slate-400">
            Quotes exceeding {formatCents(thresholdCents)} field threshold
          </div>
        </div>
      </div>

      {/* 2. Controls & Tabs Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            type="button"
            data-testid="filter-tab-all"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({changeOrders.length})
          </button>
          <button
            type="button"
            data-testid="filter-tab-pending-office"
            onClick={() => setActiveTab("pending_office")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "pending_office"
                ? "bg-amber-600 text-white"
                : "text-amber-800 hover:bg-amber-50"
            }`}
          >
            Pending Office ({pendingOfficeCount})
          </button>
          <button
            type="button"
            data-testid="filter-tab-approved"
            onClick={() => setActiveTab("approved")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "approved"
                ? "bg-indigo-600 text-white"
                : "text-indigo-800 hover:bg-indigo-50"
            }`}
          >
            Approved — Unbilled ({unbilledApproved.length})
          </button>
          <button
            type="button"
            data-testid="filter-tab-reconciled"
            onClick={() => setActiveTab("reconciled")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "reconciled"
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Reconciled
          </button>
        </div>

        {/* CSV Export Button */}
        <div>
          <a
            href="/api/office/closeout-export.csv"
            data-testid="export-csv-button"
            download
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </a>
        </div>
      </div>

      {/* 3. Queue List / Rows */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
        {filteredRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No change orders found matching this filter tab.
          </div>
        ) : (
          filteredRows.map((co) => {
            const isPendingOffice = co.status === "pending_office";
            const isPendingHomeowner = co.status === "pending_homeowner";
            const isApproved = co.status === "approved";
            const isReconciled = co.status === "reconciled";
            const isDeclined = co.status === "declined";

            return (
              <div
                key={co.id}
                data-testid={`office-row-${co.id}`}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
              >
                {/* Details */}
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {co.jobNumber}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{co.customerName}</span>

                    {/* Status Badges */}
                    {isPendingOffice && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending Office Review (&gt; {formatCents(thresholdCents)})
                      </span>
                    )}
                    {isPendingHomeowner && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Awaiting Homeowner
                      </span>
                    )}
                    {isApproved && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved — Needs Invoice #
                      </span>
                    )}
                    {isReconciled && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Receipt className="w-3 h-3" />
                        Reconciled ({co.reconciledInvoiceRef})
                      </span>
                    )}
                    {isDeclined && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Declined
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-1">
                    {co.serviceAddress} • Tech: {co.techName}
                  </p>
                  {co.notes && (
                    <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                      "{co.notes}"
                    </p>
                  )}
                </div>

                {/* Amount and Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                  <div className="text-right mr-2">
                    <div className="text-base font-bold text-slate-900">
                      {formatCents(co.subtotalCents)}
                    </div>
                    <div className="text-[11px] text-slate-400">Pre-tax subtotal</div>
                  </div>

                  {/* Contextual Actions */}
                  {isPendingOffice && (
                    <button
                      type="button"
                      data-testid={`office-review-release-${co.id}`}
                      onClick={() => openReleaseModal(co)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3" />
                      Review & Release
                    </button>
                  )}

                  {isPendingHomeowner && (
                    <button
                      type="button"
                      data-testid={`office-copy-link-${co.id}`}
                      onClick={() => handleCopyApprovalLink(co.approvalToken)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition flex items-center gap-1"
                    >
                      {copiedToken === co.approvalToken ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          Copy Link
                        </>
                      )}
                    </button>
                  )}

                  {isApproved && (
                    <button
                      type="button"
                      data-testid={`reconcile-button-${co.id}`}
                      onClick={() => openReconcileModal(co)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Mark Reconciled
                    </button>
                  )}

                  {/* Summary packet link */}
                  <Link
                    href={`/office/change-orders/${co.id}/summary`}
                    data-testid={`view-summary-${co.id}`}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs transition"
                    title="View Closeout Summary"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Review & Release Modal */}
      {releaseModalCo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Office Review: {releaseModalCo.customerName}
                </h3>
                <p className="text-xs text-slate-500">
                  Job #{releaseModalCo.jobNumber} • Field quote exceeds {formatCents(thresholdCents)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReleaseModalCo(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {releaseError && (
              <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {releaseError}
              </div>
            )}

            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Line Items (Review or Adjust Unit Prices)
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {releaseModalCo.lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      <div className="text-[11px] text-slate-500">Qty: {item.quantity}</div>
                    </div>

                    <div className="w-32">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Unit Price ($)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        data-testid={`adjust-price-input-${item.id}`}
                        value={Math.round((adjustedPrices[item.id] ?? item.unitPriceCents) / 100)}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0) * 100;
                          setAdjustedPrices((prev) => ({ ...prev, [item.id]: val }));
                        }}
                        className="w-full p-1.5 rounded-md border border-slate-300 text-xs font-bold text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReleaseModalCo(null)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-release-button"
                disabled={isPending}
                onClick={handleConfirmRelease}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
              >
                {isPending ? "Releasing..." : "Approve & Release to Homeowner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Reconciled Modal */}
      {reconcileModalCo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmReconcile}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Reconcile to Final Invoice
              </h3>
              <button
                type="button"
                onClick={() => setReconcileModalCo(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reconcileError && (
              <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {reconcileError}
              </div>
            )}

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                Add-on total:{" "}
                <strong className="text-slate-900 text-sm">
                  {formatCents(reconcileModalCo.subtotalCents)}
                </strong>{" "}
                for <strong>{reconcileModalCo.customerName}</strong>.
              </p>
              <p>
                Enter the final accounting invoice reference (e.g. from QuickBooks, Jobber, or Housecall Pro)
                to lock this change order as reconciled.
              </p>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Final Invoice # *
                </label>
                <input
                  type="text"
                  data-testid="reconcile-invoice-input"
                  value={invoiceRefInput}
                  onChange={(e) => setInvoiceRefInput(e.target.value)}
                  placeholder="e.g. INV-4821"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReconcileModalCo(null)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="confirm-reconcile-button"
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
              >
                {isPending ? "Reconciling..." : "Confirm Reconciled"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
