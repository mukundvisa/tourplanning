"use client";

import React, { useState } from "react";
import { Plus, Search, Edit2, Trash2, User, Phone, Mail, X, Loader2 } from "lucide-react";
import { createMasterConsultant, updateMasterConsultant, deleteMasterConsultant } from "@/actions/master-data";
import { useRouter } from "next/navigation";

interface ConsultantItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

export function ConsultantsTab({ initialData }: { initialData: ConsultantItem[] }) {
  const router = useRouter();
  const [data, setData] = useState<ConsultantItem[]>(initialData);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConsultantItem | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = data.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ name: "", phone: "", email: "" });
    setModalOpen(true);
  };

  const openEdit = (item: ConsultantItem) => {
    setEditingItem(item);
    setFormData({ name: item.name, phone: item.phone, email: item.email || "" });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    setSaving(true);
    try {
      if (editingItem) {
        const res = await updateMasterConsultant(editingItem.id, formData);
        if (res.success && res.data) {
          setData((prev) => prev.map((c) => (c.id === editingItem.id ? res.data! : c)));
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to update consultant");
        }
      } else {
        const res = await createMasterConsultant(formData);
        if (res.success && res.data) {
          setData((prev) => [res.data!, ...prev]);
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to create consultant");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete consultant "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteMasterConsultant(id);
      if (res.success) {
        setData((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      } else {
        alert(res.error || "Failed to delete consultant");
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
            Travel Consultants
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage travel advisors whose contact details are stamped on customer proposals
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Consultant</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by advisor name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F]"
        />
      </div>

      <div className="bg-white border border-[#B8944F]/20 rounded-lg overflow-hidden craft-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-zinc-200/80 text-zinc-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Consultant Name</th>
                <th className="py-3 px-4">Direct Phone</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-400 text-xs">
                    No consultants found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#14213D] flex items-center">
                      <div className="h-7 w-7 rounded-full bg-[#B8944F]/15 text-[#B8944F] font-bold flex items-center justify-center mr-2.5 text-xs">
                        {item.name[0]}
                      </div>
                      {item.name}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 font-mono text-[11px]">
                      <span className="flex items-center">
                        <Phone className="h-3 w-3 mr-1 text-zinc-400" />
                        {item.phone}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {item.email ? (
                        <span className="flex items-center">
                          <Mail className="h-3 w-3 mr-1 text-zinc-400" />
                          {item.email}
                        </span>
                      ) : (
                        <span className="text-zinc-300 italic">Not set</span>
                      )}
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
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces">
                {editingItem ? "Edit Consultant" : "Add Consultant"}
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
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Akshar Patel"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Contact Phone / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Work Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. akshar@tripcraft.com"
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
                  {editingItem ? "Update Advisor" : "Save Advisor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
