"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CreditCard,
  RefreshCw,
  FileCheck2,
  Info,
  Save,
  Loader2,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { getGlobalPolicy, saveGlobalPolicy } from "@/actions/master-data";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "../RichTextEditor";

export interface GlobalPolicyData {
  id?: string;
  name?: string;
  paymentPolicy: string;
  cancellationPolicy: string;
  visaRules: string;
  generalNotes: string;
}

const DEFAULT_FALLBACK_POLICIES = {
  paymentPolicy:
    "<p><strong>Booking Deposit:</strong> 30% advance payment required upon reservation confirmation.</p><p><strong>Final Balance:</strong> Remaining 70% required at least 15 days prior to travel departure date.</p><p><strong>Modes of Payment:</strong> Direct Bank Transfer (NEFT/RTGS/IMPS), UPI, or Credit/Debit Card.</p>",
  cancellationPolicy:
    "<p><strong>30+ Days Prior:</strong> 100% refundable (less standard banking / administrative processing fees).</p><p><strong>29 to 15 Days Prior:</strong> 50% cancellation fee applies.</p><p><strong>Within 14 Days of Travel:</strong> 100% non-refundable on confirmed flight tickets & non-flexible hotel bookings.</p>",
  visaRules:
    "<p><strong>Passport Validity:</strong> Minimum 6 months passport validity required from scheduled return date.</p><p><strong>Visa Documentation:</strong> Valid tourist visa or approved e-visa required prior to boarding.</p><p><strong>Immigration Discretion:</strong> Final entry permissions remain subject to destination immigration authorities.</p>",
  generalNotes:
    "<p><strong>Hotel Check-in / Check-out:</strong> Standard check-in is 14:00 hrs and check-out is 11:00 hrs.</p><p><strong>Operational Advisory:</strong> Daily private vehicle duty hours up to 10 hours. Itinerary sequence may be adjusted to accommodate local traffic or weather.</p>",
};

export function PolicyTab({
  initialData,
}: {
  initialData?: GlobalPolicyData | GlobalPolicyData[];
}) {
  const router = useRouter();

  // Normalize initialData whether passed as single object or array
  const activePolicy: GlobalPolicyData = Array.isArray(initialData)
    ? initialData[0] || DEFAULT_FALLBACK_POLICIES
    : initialData || DEFAULT_FALLBACK_POLICIES;

  const [formData, setFormData] = useState<GlobalPolicyData>({
    paymentPolicy: activePolicy.paymentPolicy || DEFAULT_FALLBACK_POLICIES.paymentPolicy,
    cancellationPolicy: activePolicy.cancellationPolicy || DEFAULT_FALLBACK_POLICIES.cancellationPolicy,
    visaRules: activePolicy.visaRules || DEFAULT_FALLBACK_POLICIES.visaRules,
    generalNotes: activePolicy.generalNotes || DEFAULT_FALLBACK_POLICIES.generalNotes,
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  useEffect(() => {
    async function loadLatestPolicy() {
      if (!initialData || (Array.isArray(initialData) && initialData.length === 0)) {
        setLoadingInitial(true);
        const res = await getGlobalPolicy();
        if (res.success && res.data) {
          setFormData({
            paymentPolicy: res.data.paymentPolicy || DEFAULT_FALLBACK_POLICIES.paymentPolicy,
            cancellationPolicy: res.data.cancellationPolicy || DEFAULT_FALLBACK_POLICIES.cancellationPolicy,
            visaRules: res.data.visaRules || DEFAULT_FALLBACK_POLICIES.visaRules,
            generalNotes: res.data.generalNotes || DEFAULT_FALLBACK_POLICIES.generalNotes,
          });
        }
        setLoadingInitial(false);
      }
    }
    loadLatestPolicy();
  }, [initialData]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await saveGlobalPolicy(formData);
      if (res.success) {
        setSaveSuccess(true);
        router.refresh();
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert(res.error || "Failed to save global policy configuration");
      }
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const resetToStandardDefaults = () => {
    if (confirm("Reset all 4 policy sections to standard industry defaults?")) {
      setFormData(DEFAULT_FALLBACK_POLICIES);
    }
  };

  if (loadingInitial) {
    return (
      <div className="py-16 text-center text-xs text-zinc-500 flex items-center justify-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin text-[#B8944F]" />
        <span>Loading global policy configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
              Master Policy & Terms
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
              System Default Active
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Configure the single global policy for the entire system. These 4 policy sections automatically apply to all trips and travel blueprints across the platform.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            type="button"
            onClick={resetToStandardDefaults}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Reset to standard defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset Standard</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? "Saving Policy..." : "Save Policy Configuration"}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Global policy saved successfully! All trip blueprints will now display these updated policy terms.</span>
        </div>
      )}

      {/* 4 WYSIWYG Policy Sections */}
      <div className="space-y-6">
        {/* 1. Payment Policy */}
        <div className="bg-white border border-[#B8944F]/25 hover:border-[#B8944F]/60 rounded-xl p-5 shadow-2xs craft-card transition-all">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-zinc-100 mb-4">
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/60 text-[#B8944F]">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#14213D] flex items-center space-x-1.5">
                <span>1. Payment Policy</span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Specify mandatory booking deposits, stage payment schedules, and final settlement deadlines.
              </p>
            </div>
          </div>

          <RichTextEditor
            value={formData.paymentPolicy}
            onChange={(val) => setFormData((prev) => ({ ...prev, paymentPolicy: val }))}
            placeholder="Specify booking deposit terms, payment milestones, and acceptable payment modes..."
          />
        </div>

        {/* 2. Cancellation Policy */}
        <div className="bg-white border border-[#B8944F]/25 hover:border-[#B8944F]/60 rounded-xl p-5 shadow-2xs craft-card transition-all">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-zinc-100 mb-4">
            <div className="p-2 rounded-lg bg-red-50 border border-red-200/60 text-red-600">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#14213D] flex items-center space-x-1.5">
                <span>2. Cancellation Policy</span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Detail refund percentages and penalty tier thresholds prior to scheduled departure.
              </p>
            </div>
          </div>

          <RichTextEditor
            value={formData.cancellationPolicy}
            onChange={(val) => setFormData((prev) => ({ ...prev, cancellationPolicy: val }))}
            placeholder="Specify cancellation penalty milestones (30+ days, 15-29 days, under 14 days)..."
          />
        </div>

        {/* 3. Visa Rules & Passport Validity */}
        <div className="bg-white border border-[#B8944F]/25 hover:border-[#B8944F]/60 rounded-xl p-5 shadow-2xs craft-card transition-all">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-zinc-100 mb-4">
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-600">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#14213D] flex items-center space-x-1.5">
                <span>3. Visa Rules & Passport Validity</span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Specify minimum passport validity duration, tourist e-visa rules, and mandatory documents.
              </p>
            </div>
          </div>

          <RichTextEditor
            value={formData.visaRules}
            onChange={(val) => setFormData((prev) => ({ ...prev, visaRules: val }))}
            placeholder="Specify passport validity guidelines, visa processing timelines, and entry requirements..."
          />
        </div>

        {/* 4. General Notes & Operational Advisory */}
        <div className="bg-white border border-[#B8944F]/25 hover:border-[#B8944F]/60 rounded-xl p-5 shadow-2xs craft-card transition-all">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-zinc-100 mb-4">
            <div className="p-2 rounded-lg bg-purple-50 border border-purple-200/60 text-purple-600">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#14213D] flex items-center space-x-1.5">
                <span>4. General Notes & Operational Advisory</span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Detail standard hotel check-in/out hours, daily driver duty hours, weather clauses, and baggage notes.
              </p>
            </div>
          </div>

          <RichTextEditor
            value={formData.generalNotes}
            onChange={(val) => setFormData((prev) => ({ ...prev, generalNotes: val }))}
            placeholder="Specify hotel check-in/out times, transport limits, advisory notes, and force majeure terms..."
          />
        </div>
      </div>

      {/* Bottom Floating Save Button */}
      <div className="pt-4 flex justify-end border-t border-zinc-200">
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saving ? "Saving Changes..." : "Save Policy Configuration"}</span>
        </button>
      </div>
    </div>
  );
}
