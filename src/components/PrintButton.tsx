"use client";

import React from "react";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      data-testid="print-summary-button"
      onClick={() => window.print()}
      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition print:hidden"
    >
      <Printer className="w-4 h-4" />
      Print / Save PDF
    </button>
  );
}
