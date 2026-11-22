"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCents, parseDollarsToCents } from "@/lib/money";
import { SAMPLE_PHOTOS, compressImageToDataUrl } from "@/lib/photo-client";
import {
  Wrench,
  Plus,
  Minus,
  Trash2,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  X,
} from "lucide-react";

interface CatalogItem {
  id: string;
  name: string;
  description: string;
  unitPriceCents: number;
}

interface SelectedItem {
  catalogItemId?: string;
  title: string;
  description?: string;
  quantity: number;
  unitPriceCents: number; // for display only in client; server validates/overrides
}

interface CaptureChangeOrderFormProps {
  job: {
    id: string;
    jobNumber: string;
    customerName: string;
    serviceAddress: string;
  };
  catalog: CatalogItem[];
  approvalThresholdCents: number;
}

export function CaptureChangeOrderForm({
  job,
  catalog,
  approvalThresholdCents,
}: CaptureChangeOrderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoPreviewName, setPhotoPreviewName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Custom Item Modal/Drawer State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customPriceDollars, setCustomPriceDollars] = useState("");
  const [customQty, setCustomQty] = useState(1);
  const [customError, setCustomError] = useState<string | null>(null);

  // Live total calculation in client for preview
  const liveSubtotalCents = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0
  );
  const isOverThreshold = liveSubtotalCents > approvalThresholdCents;

  // Toggle or increment catalog item
  function handleSelectCatalogItem(cat: CatalogItem) {
    setSelectedItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.catalogItemId === cat.id);
      if (existingIndex >= 0) {
        // Increment quantity
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          catalogItemId: cat.id,
          title: cat.name,
          description: cat.description,
          quantity: 1,
          unitPriceCents: cat.unitPriceCents,
        },
      ];
    });
  }

  function handleUpdateQuantity(index: number, delta: number) {
    setSelectedItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  }

  function handleRemoveItem(index: number) {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddCustomItem(e: React.FormEvent) {
    e.preventDefault();
    setCustomError(null);

    if (!customTitle.trim()) {
      setCustomError("Item title is required.");
      return;
    }

    let cents = 0;
    try {
      cents = parseDollarsToCents(customPriceDollars);
      if (cents <= 0) {
        setCustomError("Price must be greater than $0.00.");
        return;
      }
    } catch {
      setCustomError("Enter a valid dollar amount (e.g. 75.00).");
      return;
    }

    setSelectedItems((prev) => [
      ...prev,
      {
        title: customTitle.trim(),
        description: customDesc.trim() || undefined,
        quantity: customQty,
        unitPriceCents: cents,
      },
    ]);

    setCustomTitle("");
    setCustomDesc("");
    setCustomPriceDollars("");
    setCustomQty(1);
    setShowCustomModal(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageToDataUrl(file);
      setPhotoDataUrl(compressed);
      setPhotoPreviewName(file.name);
    } catch (err) {
      console.error("Compression error:", err);
      setErrorMessage("Could not process photo. Please try a standard JPEG or PNG.");
    }
  }

  function handleSelectSamplePhoto(sample: (typeof SAMPLE_PHOTOS)[0]) {
    setPhotoDataUrl(sample.url);
    setPhotoPreviewName(`${sample.name} (Sample)`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedItems.length === 0) {
      setErrorMessage("Please select at least one catalog item or add a custom item.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          jobId: job.id,
          notes: notes.trim() || undefined,
          photoDataUrl: photoDataUrl || undefined,
          items: selectedItems.map((item) => ({
            catalogItemId: item.catalogItemId,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
          })),
        };

        const res = await fetch("/api/change-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data.error || "Failed to create change order.");
          return;
        }

        router.push(`/tech/change-orders/${data.changeOrder.id}`);
        router.refresh();
      } catch (err) {
        console.error("Submit error:", err);
        setErrorMessage("Network error creating change order.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Flat-Rate Add-On Catalog Quick Pick */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-sky-600" />
              1. Tap to Select Flat-Rate Add-On
            </h2>
            <p className="text-xs text-slate-500">
              One-tap catalog selection • Locked pre-tax pricing
            </p>
          </div>
          <button
            type="button"
            data-testid="add-custom-item-button"
            onClick={() => setShowCustomModal(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            + Custom Item
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {catalog.map((cat) => {
            const selected = selectedItems.find((i) => i.catalogItemId === cat.id);
            return (
              <button
                type="button"
                key={cat.id}
                data-testid={`catalog-item-${cat.id}`}
                onClick={() => handleSelectCatalogItem(cat)}
                className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                  selected
                    ? "bg-sky-50/70 border-sky-500 ring-2 ring-sky-400/20"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div>
                  <div className="font-semibold text-xs text-slate-900 leading-snug">
                    {cat.name}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {cat.description}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">
                    {formatCents(cat.unitPriceCents)}
                  </span>
                  {selected ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-600 text-white">
                      Qty: {selected.quantity}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">+ Add</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selected Items & Quantities */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
          <span>2. Order Scope ({selectedItems.length} items)</span>
          <span className="text-xs text-slate-500 font-normal">Pre-tax line items</span>
        </h2>

        {selectedItems.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
            No items selected yet. Tap an add-on above or click "+ Custom Item".
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {selectedItems.map((item, idx) => (
              <div
                key={idx}
                data-testid={`selected-item-row-${idx}`}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-slate-900 truncate">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatCents(item.unitPriceCents)} each
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    <button
                      type="button"
                      data-testid={`qty-minus-${idx}`}
                      onClick={() => handleUpdateQuantity(idx, -1)}
                      className="p-1 rounded text-slate-600 hover:bg-slate-200 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span
                      data-testid={`qty-val-${idx}`}
                      className="px-2 text-xs font-bold text-slate-800"
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      data-testid={`qty-plus-${idx}`}
                      onClick={() => handleUpdateQuantity(idx, 1)}
                      className="p-1 rounded text-slate-600 hover:bg-slate-200 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-sm font-bold text-slate-900 w-16 text-right">
                    {formatCents(item.quantity * item.unitPriceCents)}
                  </span>

                  <button
                    type="button"
                    data-testid={`remove-item-${idx}`}
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-slate-400 hover:text-red-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Photo Attachment (Camera/Upload + Fast Demo Samples) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-sky-600" />
            3. Job-Site Photo (Optional)
          </span>
          <span className="text-xs text-slate-400 font-normal">Auto-compressed &le;250KB</span>
        </h2>

        {photoDataUrl ? (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={photoDataUrl}
                alt="Selected attachment"
                className="w-16 h-12 object-cover rounded-lg border border-slate-200 bg-slate-900"
              />
              <div>
                <div className="text-xs font-bold text-slate-800">
                  {photoPreviewName || "Attached Photo"}
                </div>
                <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Ready to submit with change order
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPhotoDataUrl(null);
                setPhotoPreviewName(null);
              }}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 p-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Quick Demo Sample Photos */}
            <div>
              <div className="text-xs text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                One-tap sample photos (for fast demo walkthrough):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SAMPLE_PHOTOS.map((sample) => (
                  <button
                    type="button"
                    key={sample.id}
                    data-testid={`sample-photo-${sample.id}`}
                    onClick={() => handleSelectSamplePhoto(sample)}
                    className="p-2.5 rounded-lg border border-slate-200 hover:border-sky-400 bg-slate-50/60 hover:bg-sky-50/40 text-left transition flex items-center gap-2"
                  >
                    <img
                      src={sample.url}
                      alt={sample.name}
                      className="w-10 h-8 object-cover rounded border border-slate-300"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{sample.name}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{sample.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Standard File Upload */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <label
                htmlFor="photo-file-upload"
                className="cursor-pointer px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
              >
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                Upload / Snap Photo
              </label>
              <input
                id="photo-file-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="text-[11px] text-slate-400">JPEG, PNG, or WebP</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Tech Notes */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
        <label htmlFor="notes" className="text-base font-bold text-slate-900 block">
          4. Field Notes (Optional)
        </label>
        <textarea
          id="notes"
          data-testid="change-order-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="e.g. Shutoff valve was leaking into bucket; customer requested replacement while water was off."
          className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* 5. Live Summary & Routing Indicator */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="text-xs text-slate-500">Pre-Tax Total</div>
            <div data-testid="live-total-cents" className="text-3xl font-extrabold text-slate-900">
              {formatCents(liveSubtotalCents)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-500">Tech Authority Threshold</div>
            <div className="text-sm font-bold text-slate-700">
              {formatCents(approvalThresholdCents)}
            </div>
          </div>
        </div>

        {/* Threshold Status Banner */}
        {selectedItems.length > 0 && (
          <div
            data-testid="threshold-status-banner"
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isOverThreshold
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}
          >
            {isOverThreshold ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-xs font-bold">
                {isOverThreshold
                  ? "Over $500 Threshold — Requires Office Approval"
                  : "Within Tech Authority — Ready for Homeowner Approval"}
              </div>
              <p className="text-[11px] mt-0.5 opacity-90">
                {isOverThreshold
                  ? `Amount exceeds ${formatCents(approvalThresholdCents)}. Submitting will route this directly to Dana Reyes in Office Review.`
                  : "Submitting routes directly to homeowner on-device or shareable approval link."}
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          data-testid="submit-change-order"
          disabled={isPending || selectedItems.length === 0}
          className="w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            "Creating Change Order..."
          ) : (
            <>
              Confirm & Create Change Order
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Custom Item Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Custom Line Item</h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {customError && (
              <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {customError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Item Title *
                </label>
                <input
                  type="text"
                  data-testid="custom-title-input"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Custom Pipe Transition Fitting"
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  data-testid="custom-desc-input"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="e.g. Copper to PEX conversion with crimp ring"
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Unit Price ($) *
                  </label>
                  <input
                    type="text"
                    data-testid="custom-price-input"
                    value={customPriceDollars}
                    onChange={(e) => setCustomPriceDollars(e.target.value)}
                    placeholder="e.g. 75.00"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    data-testid="custom-qty-input"
                    value={customQty}
                    onChange={(e) => setCustomQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-add-custom-item"
                onClick={handleAddCustomItem}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-xs font-bold text-white shadow-sm"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
