"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Smartphone, Copy, Check, ExternalLink } from "lucide-react";

interface HandoffActionsProps {
  approvalToken: string;
}

export function HandoffActions({ approvalToken }: HandoffActionsProps) {
  const [copied, setCopied] = useState(false);

  const approvalUrl = typeof window !== "undefined"
    ? `${window.location.origin}/approve/${approvalToken}`
    : `/approve/${approvalToken}`;

  function handleCopy() {
    navigator.clipboard.writeText(approvalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* On-device handoff button */}
        <Link
          href={`/approve/${approvalToken}?mode=on_device`}
          data-testid="hand-phone-to-homeowner-button"
          className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
        >
          <Smartphone className="w-4 h-4" />
          Hand Phone to Homeowner
        </Link>

        {/* Copy Share Link */}
        <button
          type="button"
          data-testid="copy-approval-link-button"
          onClick={handleCopy}
          className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-500" />
              Copy Share Link
            </>
          )}
        </button>
      </div>

      <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 flex items-center justify-between gap-2 overflow-hidden">
        <span className="truncate font-mono select-all text-slate-600">{approvalUrl}</span>
        <a
          href={`/approve/${approvalToken}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 hover:underline shrink-0 flex items-center gap-1 font-semibold"
        >
          Preview <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
