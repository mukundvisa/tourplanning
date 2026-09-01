"use client";

import React, { useState } from "react";
import { Plus, Search, Edit2, Trash2, Tag, X, Loader2, DollarSign } from "lucide-react";
import {
  createMasterPricingLabel,
  updateMasterPricingLabel,
  deleteMasterPricingLabel,
} from "@/actions/master-data";
import { useRouter } from "next/navigation";

interface PricingLabelItem {
  id: string;
  name: string;
  price: number;
  titleTemplateId: string | null;
}

interface TitleTemplateItem {
  id: string;
  title: string;
}

export function PricingLabelsTab({
  initialData,
  titleTemplates,
}: {
  initialData: PricingLabelItem[];
  titleTemplates: TitleTemplateItem[];
}) {
  const router = useRouter();
  const [data, setData] = useState<PricingLabelItem[]>(initialData);
  const [selectedTitleId, setSelectedTitleId] = useState<string>(() => {
    return titleTemplates[0]?.id || "";
  });
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PricingLabelItem | null>(null);
  const [labelName, setLabelName] = useState("");
  const [labelPrice, setLabelPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredByTemplate = data.filter((p) => p.titleTemplateId === selectedTitleId);
  const filtered = filteredByTemplate.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    if (!selectedTitleId) {
      alert("Please select a Title Template first.");
      return;
    }
    setEditingItem(null);
    setLabelName("");
    setLabelPrice("");
    setModalOpen(true);
  };

  const openEdit = (item: PricingLabelItem) => {
    setEditingItem(item);
    setLabelName(item.name);
    setLabelPrice(item.price.toString());
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelName.trim() || !selectedTitleId) return;
    setSaving(true);
    const priceNum = parseFloat(labelPrice) || 0;
    try {
      if (editingItem) {
        const res = await updateMasterPricingLabel(editingItem.id, labelName, priceNum);
        if (res.success && res.data) {
          setData((prev) =>
            prev.map((p) => (p.id === editingItem.id ? (res.data as any) : p))
          );
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to update pricing label");
        }
      } else {
        const res = await createMasterPricingLabel(labelName, priceNum, selectedTitleId);
        if (res.success && res.data) {
          setData((prev) => [res.data as any, ...prev]);
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to create pricing label");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete label "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteMasterPricingLabel(id);
      if (res.success) {
        setData((prev) => prev.filter((p) => p.id !== id));
        router.refresh();
      } else {
        alert(res.error || "Failed to delete pricing label");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const selectedTemplate = titleTemplates.find((t) => t.id === selectedTitleId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
            Standard Pricing Line Items
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage quotation line items and per-person prices associated with proposal Title Templates.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={!selectedTitleId}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          <span>Add Pricing Item</span>
        </button>
      </div>

      {/* Template Selection Dropdown */}
      <div className="bg-white border border-[#B8944F]/10 rounded-lg p-4 craft-card space-y-3">
        <label className="block text-xs font-bold text-zinc-700">
          Select Title Template to Configure Pricing:
        </label>
        <select
          value={selectedTitleId}
          onChange={(e) => setSelectedTitleId(e.target.value)}
          className="w-full max-w-md px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] focus:bg-white focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none cursor-pointer"
        >
          <option value="">-- Choose a Title Template --</option>
          {titleTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        {selectedTemplate && (
          <p className="text-[11px] text-zinc-500 font-semibold flex items-center mt-1">
            <DollarSign className="h-3.5 w-3.5 text-[#B8944F] mr-1" />
            Configuring per-person rates for: <span className="text-[#14213D] ml-1">"{selectedTemplate.title}"</span>
          </p>
        )}
      </div>

      {selectedTitleId ? (
        <>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search pricing items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F]"
            />
          </div>

          <div className="bg-white border border-[#B8944F]/20 rounded-lg overflow-hidden craft-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-zinc-200 text-zinc-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Line Item Label</th>
                  <th className="py-3 px-4">Per-Person Price</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-zinc-400 text-xs">
                      No pricing items configured for this template.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#14213D] flex items-center">
                        <Tag className="h-3.5 w-3.5 text-[#B8944F] mr-2" />
                        {item.name}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#14213D]">
                        ₹{item.price.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-[#B8944F] transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            disabled={deletingId === item.id}
                            className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-lg">
          Please select a Title Template from the dropdown above to manage its pricing.
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces">
                {editingItem ? "Edit Pricing Item" : "Add Pricing Item"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Pricing Item Description *
                </label>
                <input
                  type="text"
                  required
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                  placeholder="e.g. 5-Star Beachfront Luxury Villa (4 Nights)"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Per-Person Price (INR) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={labelPrice}
                  onChange={(e) => setLabelPrice(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none font-mono"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  This price will be treated as per-person and multiplied by the number of travellers in the trip blueprint.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center"
                >
                  {saving && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  {editingItem ? "Update Item" : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
