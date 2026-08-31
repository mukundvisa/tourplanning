"use client";

import React, { useState } from "react";
import { Plus, Search, Edit2, Trash2, Ticket, DollarSign, X, Loader2 } from "lucide-react";
import {
  createMasterAddOn,
  updateMasterAddOn,
  deleteMasterAddOn,
} from "@/actions/master-data";
import { useRouter } from "next/navigation";

interface AddOnItem {
  id: string;
  name: string;
  type: string;
  visaType: string | null;
  validityLength: string | null;
  validityWindow: string | null;
  defaultPrice: number;
  detailsDescription: string | null;
}

export function AddOnsTab({ initialData }: { initialData: AddOnItem[] }) {
  const router = useRouter();
  const [data, setData] = useState<AddOnItem[]>(initialData);
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

  const filtered = data.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.visaType && a.visaType.toLowerCase().includes(search.toLowerCase())) ||
      (a.detailsDescription && a.detailsDescription.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      type: "Visa",
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
            prev.map((a) => (a.id === editingItem.id ? res.data! : a))
          );
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to update add-on");
        }
      } else {
        const res = await createMasterAddOn(payload);
        if (res.success && res.data) {
          setData((prev) => [res.data!, ...prev]);
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
            Add-ons, Visas & Experience Upgrades
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pre-fills visa categories, validity rules, and default selling prices in Step 6
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

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search add-ons by package name or visa type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F]"
        />
      </div>

      <div className="bg-white border border-[#B8944F]/20 rounded-lg overflow-hidden craft-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-zinc-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Add-on / Visa Package</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Validity Details</th>
                <th className="py-3 px-4">Default Price</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400 text-xs">
                    No add-ons found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#14213D]">
                      <div className="flex items-center">
                        <Ticket className="h-3.5 w-3.5 text-[#B8944F] mr-2 shrink-0" />
                        <div>
                          <span>{item.name}</span>
                          {item.detailsDescription && (
                            <p className="text-[10px] text-zinc-400 font-normal mt-0.5 line-clamp-1">
                              {item.detailsDescription}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      {item.visaType && <p className="font-semibold">{item.visaType}</p>}
                      {(item.validityLength || item.validityWindow) && (
                        <p className="text-[10px] text-zinc-400">
                          {item.validityLength} {item.validityWindow ? `(${item.validityWindow})` : ""}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#14213D] font-mono">
                      ₹{item.defaultPrice?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-[#B8944F] cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          disabled={deletingId === item.id}
                          className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 cursor-pointer"
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
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-150">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Add-on / Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Indonesia Official E-VOA (Electronic Visa on Arrival)"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Add-on Category
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none bg-white"
                  >
                    <option value="Visa">Visa Service</option>
                    <option value="Insurance">Travel Insurance</option>
                    <option value="SIM">eSIM / Data Roaming</option>
                    <option value="Transfer">VIP Transit Upgrade</option>
                    <option value="Experience">Dining / Club Pass</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Default Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.defaultPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultPrice: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Visa Type / Sub-heading
                  </label>
                  <input
                    type="text"
                    value={formData.visaType}
                    onChange={(e) => setFormData({ ...formData, visaType: e.target.value })}
                    placeholder="e.g. Tourist E-VOA (30 Days Single Entry)"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Validity Length
                  </label>
                  <input
                    type="text"
                    value={formData.validityLength}
                    onChange={(e) =>
                      setFormData({ ...formData, validityLength: e.target.value })
                    }
                    placeholder="e.g. 30 Days"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Validity Window
                  </label>
                  <input
                    type="text"
                    value={formData.validityWindow}
                    onChange={(e) =>
                      setFormData({ ...formData, validityWindow: e.target.value })
                    }
                    placeholder="e.g. 90 Days from issuance"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Service Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.detailsDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, detailsDescription: e.target.value })
                    }
                    placeholder="e.g. Pre-approved electronic visa clearance barcode for dedicated VIP e-gates."
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>
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
                  {editingItem ? "Update Add-on" : "Save Add-on"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
