"use client";

import React, { useState } from "react";
import { Plus, Search, Edit2, Trash2, Ticket, DollarSign, X, Loader2 } from "lucide-react";
import {
  createMasterAddOn,
  updateMasterAddOn,
  deleteMasterAddOn,
} from "@/actions/master-data";
import { useRouter } from "next/navigation";

export interface AddOnItem {
  id: string;
  name: string;
  type: string;
  visaType: string | null;
  validityLength: string | null;
  validityWindow: string | null;
  defaultPrice: number;
  detailsDescription: string | null;
}

const ADDON_TYPES = ["All", "Visa", "Transfer", "Activity", "Insurance", "SIM", "Other"];

export function AddOnsTab({ initialData }: { initialData: AddOnItem[] }) {
  const router = useRouter();
  const [data, setData] = useState<AddOnItem[]>(initialData);
  const [selectedType, setSelectedType] = useState("All");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AddOnItem | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "Visa",
    visaType: "",
    validityLength: "",
    validityWindow: "",
    defaultPrice: "3500",
    detailsDescription: "",
  });

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredByType = selectedType === "All" ? data : data.filter((a) => a.type === selectedType);
  const filtered = filteredByType.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.visaType && a.visaType.toLowerCase().includes(search.toLowerCase())) ||
      (a.detailsDescription && a.detailsDescription.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      type: selectedType !== "All" ? selectedType : "Visa",
      visaType: "Tourist E-Visa (Single Entry)",
      validityLength: "30 Days",
      validityWindow: "90 Days from issue",
      defaultPrice: "3500",
      detailsDescription: "Fast-track electronic visa processing.",
    });
    setModalOpen(true);
  };

  const openEdit = (item: AddOnItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type || "Visa",
      visaType: item.visaType || "",
      validityLength: item.validityLength || "",
      validityWindow: item.validityWindow || "",
      defaultPrice: item.defaultPrice?.toString() || "0",
      detailsDescription: item.detailsDescription || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        visaType: formData.visaType || undefined,
        validityLength: formData.validityLength || undefined,
        validityWindow: formData.validityWindow || undefined,
        defaultPrice: parseFloat(formData.defaultPrice) || 0,
        detailsDescription: formData.detailsDescription || undefined,
      };

      if (editingItem) {
        const res = await updateMasterAddOn(editingItem.id, payload);
        if (res.success && res.data) {
          setData((prev) =>
            prev.map((a) => (a.id === editingItem.id ? (res.data! as any) : a))
          );
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to update add-on");
        }
      } else {
        const res = await createMasterAddOn(payload);
        if (res.success && res.data) {
          setData((prev) => [res.data! as any, ...prev]);
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to create add-on");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete add-on "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteMasterAddOn(id);
      if (res.success) {
        setData((prev) => prev.filter((a) => a.id !== id));
        router.refresh();
      } else {
        alert(res.error || "Failed to delete add-on");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
            Add-ons, Visas & Insurance Catalog
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage visa packages, international SIM cards, airport lounge access, and travel insurance items
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Master Add-on</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search add-ons by package name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F]"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3.5 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none cursor-pointer"
        >
          {ADDON_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "All" ? "📦 All Add-on Categories" : `${t} Packages`}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-lg">
            No add-ons found. Click "Add Master Add-on" to create one.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-[#B8944F]/20 rounded-lg p-5 craft-card flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B8944F]/10 text-[#8F6F33] border border-[#B8944F]/20 uppercase tracking-wider">
                    {item.type}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1 rounded hover:bg-zinc-100 text-zinc-500 hover:text-[#B8944F] cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      disabled={deletingId === item.id}
                      className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 cursor-pointer"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#14213D] font-fraunces mb-1">
                  {item.name}
                </h3>
                {item.visaType && (
                  <p className="text-xs text-zinc-500 font-medium mb-2">
                    {item.visaType}
                  </p>
                )}

                {item.detailsDescription && (
                  <p className="text-xs text-zinc-600 mb-3 bg-zinc-50 p-2.5 rounded border border-zinc-100">
                    {item.detailsDescription}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 pt-2 border-t border-zinc-100">
                  {item.validityLength && (
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Validity:</span>
                      <span className="font-semibold text-zinc-700">{item.validityLength}</span>
                    </div>
                  )}
                  {item.validityWindow && (
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Window:</span>
                      <span className="font-semibold text-zinc-700">{item.validityWindow}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex justify-between items-center mt-3">
                <span className="text-xs text-zinc-500 font-semibold">Standard Cost:</span>
                <span className="text-sm font-bold text-[#14213D] font-mono">
                  ₹{item.defaultPrice.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces">
                {editingItem ? "Edit Add-on / Visa" : "Add Master Add-on"}
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
                  Package / Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. UAE 30-Day Express Tourist Visa"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Category Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none cursor-pointer"
                  >
                    <option value="Visa">Visa</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Activity">Activity</option>
                    <option value="Insurance">Insurance</option>
                    <option value="SIM">SIM Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Default Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.defaultPrice}
                    onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
                    placeholder="e.g. 3500"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Visa / Service Subtype (Optional)
                </label>
                <input
                  type="text"
                  value={formData.visaType}
                  onChange={(e) => setFormData({ ...formData, visaType: e.target.value })}
                  placeholder="e.g. Single Entry E-Visa"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Stay Validity
                  </label>
                  <input
                    type="text"
                    value={formData.validityLength}
                    onChange={(e) => setFormData({ ...formData, validityLength: e.target.value })}
                    placeholder="e.g. 30 Days Stay"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Window / Expiry
                  </label>
                  <input
                    type="text"
                    value={formData.validityWindow}
                    onChange={(e) => setFormData({ ...formData, validityWindow: e.target.value })}
                    placeholder="e.g. 60 Days from Issue"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Description / Features
                </label>
                <textarea
                  rows={3}
                  value={formData.detailsDescription}
                  onChange={(e) => setFormData({ ...formData, detailsDescription: e.target.value })}
                  placeholder="e.g. Includes mandatory COVID insurance, embassy handling fees, and photo processing."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
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
                  {editingItem ? "Update Package" : "Save Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
