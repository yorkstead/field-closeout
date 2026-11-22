"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, X, RotateCcw, ShieldCheck, ArrowRight, Smartphone } from "lucide-react";
import Link from "next/link";

interface SignaturePadFormProps {
  token: string;
  subtotalDisplay: string;
  isOnDevice: boolean;
  defaultCustomerName?: string;
}

export function SignaturePadForm({
  token,
  subtotalDisplay,
  isOnDevice,
  defaultCustomerName = "",
}: SignaturePadFormProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [signerName, setSignerName] = useState(defaultCustomerName);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function handleClearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function handleDecision(decision: "approved" | "declined") {
    setErrorMessage(null);

    if (!signerName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    let signaturePayload: string | undefined;
    if (decision === "approved" && hasDrawn && canvasRef.current) {
      signaturePayload = canvasRef.current.toDataURL("image/png");
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/public/approve/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          signerName: signerName.trim(),
          approvalMode: isOnDevice ? "on_device" : "share_link",
          signaturePayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to submit decision.");
        setIsSubmitting(false);
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage("Network error processing decision.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 pt-2">
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl">
          {errorMessage}
        </div>
      )}

      {isOnDevice && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-900 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            <strong>On-Device Sign-Off:</strong> Handing phone/tablet to homeowner for review and electronic signature.
          </span>
        </div>
      )}

      {/* Signer Name Input */}
      <div>
        <label htmlFor="signer-name" className="block text-xs font-bold text-slate-800 mb-1">
          Full Legal Name of Homeowner / Signer *
        </label>
        <input
          id="signer-name"
          type="text"
          data-testid="signer-name-input"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="e.g. Casey Vance"
          className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
        />
      </div>

      {/* Signature Canvas */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-800">
            Draw Signature (Touch or Mouse)
          </label>
          {hasDrawn && (
            <button
              type="button"
              onClick={handleClearSignature}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 relative touch-none">
          <canvas
            ref={canvasRef}
            width={480}
            height={140}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-32 cursor-crosshair bg-white"
          />
          {!hasDrawn && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 italic">
              Sign here with finger or mouse
            </div>
          )}
        </div>
      </div>

      {/* Approval Statement */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
        <p>
          By signing, I authorize the technician to proceed with the pre-tax add-on scope totaling{" "}
          <strong className="text-slate-900">{subtotalDisplay}</strong>. Final sales tax is calculated on the contractor invoice.
        </p>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          data-testid="approve-change-order-button"
          disabled={isSubmitting}
          onClick={() => handleDecision("approved")}
          className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          {isSubmitting ? "Submitting..." : `Approve Add-On (${subtotalDisplay})`}
        </button>

        <button
          type="button"
          data-testid="decline-change-order-button"
          disabled={isSubmitting}
          onClick={() => handleDecision("declined")}
          className="w-full py-3.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
        >
          <X className="w-4 h-4 text-slate-400" />
          Decline Add-On
        </button>
      </div>
    </div>
  );
}
