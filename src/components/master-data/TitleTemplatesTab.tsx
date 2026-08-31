"use client";

import React, { useState } from "react";
import { Plus, Search, Edit2, Trash2, Type, X, Loader2 } from "lucide-react";
import {
  createMasterTitleTemplate,
  updateMasterTitleTemplate,
  deleteMasterTitleTemplate,
} from "@/actions/master-data";
import { useRouter } from "next/navigation";

interface TitleTemplateItem {
  id: string;
  title: string;
}

export function TitleTemplatesTab({ initialData }: { initialData: TitleTemplateItem[] }) {
  const router = useRouter();
  const [data, setData] = useState<TitleTemplateItem[]>(initialData);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TitleTemplateItem | null>(null);
  const [titleValue, setTitleValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = data.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingItem(null);
    setTitleValue("");
    setModalOpen(true);
  };

  const openEdit = (item: TitleTemplateItem) => {
    setEditingItem(item);
    setTitleValue(item.title);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleValue.trim()) return;
    setSaving(true);
    try {
      if (editingItem) {
        const res = await updateMasterTitleTemplate(editingItem.id, titleValue);
        if (res.success && res.data) {
          setData((prev) =>
            prev.map((t) => (t.id === editingItem.id ? res.data! : t))
          );
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to update title template");
        }
      } else {
        const res = await createMasterTitleTemplate(titleValue);
        if (res.success && res.data) {
          setData((prev) => [res.data!, ...prev]);
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to create title template");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete title "${title}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteMasterTitleTemplate(id);
      if (res.success) {
        setData((prev) => prev.filter((t) => t.id !== id));
        router.refresh();
      } else {
        alert(res.error || "Failed to delete title template");
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
            Itinerary Title Templates
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Branded proposal titles selectable directly inside Step 1 of the Trip Blueprint
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Title Template</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search title templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F]"
        />
      </div>

      <div className="bg-white border border-[#B8944F]/20 rounded-lg overflow-hidden craft-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F5] border-b border-zinc-200 text-zinc-600 font-semibold">
            <tr>
              <th className="py-3 px-4">Title Template Text</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-8 text-center text-zinc-400 text-xs">
                  No title templates found.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#14213D] flex items-center">
                    <Type className="h-3.5 w-3.5 text-[#B8944F] mr-2 shrink-0" />
                    {item.title}
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
                        onClick={() => handleDelete(item.id, item.title)}
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces">
                {editingItem ? "Edit Title Template" : "Add Title Template"}
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
                  Title Format *
                </label>
                <input
                  type="text"
                  required
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  placeholder="e.g. Magical 5 Days Bali Luxury Escape"
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
                  {editingItem ? "Update Title" : "Save Title"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
