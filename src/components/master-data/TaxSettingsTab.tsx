"use client";

import React, { useState } from "react";
import { Percent, Save, CheckCircle2, History, AlertCircle, Loader2 } from "lucide-react";
import { saveMasterTaxSetting } from "@/actions/master-data";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface TaxSettingItem {
  id: string;
  currentTcsPercentage: number;
  effectiveFrom: Date | string;
  notes: string | null;
  isActive: boolean;
}

export function TaxSettingsTab({ initialData }: { initialData: TaxSettingItem[] }) {
  const router = useRouter();
  const activeSetting = initialData.find((t) => t.isActive) || initialData[0] || {
    id: "",
    currentTcsPercentage: 5.0,
    effectiveFrom: new Date(),
    notes: "",
    isActive: true,
  };

  const [currentRate, setCurrentRate] = useState(activeSetting.currentTcsPercentage.toString());
  const [notes, setNotes] = useState(activeSetting.notes || "");
  const [history, setHistory] = useState<TaxSettingItem[]>(initialData);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await saveMasterTaxSetting({
        currentTcsPercentage: parseFloat(currentRate),
        notes,
      });
      if (res.success && res.data) {
        setHistory((prev) => [
          { ...res.data!, isActive: true },
          ...prev.map((h) => ({ ...h, isActive: false })),
        ]);
        setSavedSuccess(true);
        router.refresh();
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert(res.error || "Failed to update tax setting");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
          Statutory Tax & TCS Regulations
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Configures the single active Tax Collected at Source (TCS) rate automatically enforced on all trip quotations.
        </p>
      </div>

      {/* Active Rate Configuration Card */}
      <div className="bg-white border border-[#B8944F]/30 rounded-lg p-6 craft-card space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-[#B8944F]/15 text-[#B8944F] flex items-center justify-center font-bold">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#14213D]">
                Active Overseas Tour Package TCS
              </h3>
              <p className="text-xs text-zinc-400">
                Single active rule enforced across Step 2 of the Trip Blueprint
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Active Policy
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Standard TCS Percentage (%) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={currentRate}
                  onChange={(e) => setCurrentRate(e.target.value)}
                  className="w-full pl-4 pr-8 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-bold text-[#14213D] focus:bg-white focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  %
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Standard RBI/Income Tax benchmark: 5.0% for packages up to 7 Lakh INR.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Effective Timestamp
              </label>
              <div className="px-4 py-2.5 bg-zinc-100/70 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-600">
                {format(new Date(activeSetting.effectiveFrom), "MMMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Statutory Notes & Invoice Disclaimer
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Government rules impose flat 5% TCS on overseas tour spends per financial year. Clients can claim full credit in annual ITR filing."
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-700 focus:bg-white focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            {savedSuccess ? (
              <span className="text-xs text-emerald-700 font-bold flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Rate updated & locked across workspace!
              </span>
            ) : (
              <span className="text-[11px] text-zinc-400 flex items-center">
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                Updating this immediately locks the read-only TCS % in all new trips
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1.5" /> Save & Activate Tax Rate
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Historical Audit Trail */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#14213D] flex items-center">
          <History className="h-4 w-4 mr-1.5 text-zinc-400" />
          Audit Log of Previous Tax Settings
        </h3>
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden craft-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-zinc-200 text-zinc-500 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Effective Date</th>
                <th className="py-2.5 px-4">TCS Rate</th>
                <th className="py-2.5 px-4">Notes</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {history.map((h, i) => (
                <tr key={h.id || i} className="hover:bg-zinc-50/50">
                  <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-600">
                    {format(new Date(h.effectiveFrom), "MMM d, yyyy")}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-[#14213D]">
                    {h.currentTcsPercentage}%
                  </td>
                  <td className="py-2.5 px-4 text-zinc-500 line-clamp-1 max-w-xs">
                    {h.notes || "—"}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {h.isActive ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-500">
                        Archived
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
