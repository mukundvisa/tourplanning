"use client";

import React, { useState } from "react";
import { Plus, Search, Edit2, Trash2, MapPin, X, Loader2 } from "lucide-react";
import { createMasterCity, updateMasterCity, deleteMasterCity } from "@/actions/master-data";
import { useRouter } from "next/navigation";

interface CityItem {
  id: string;
  name: string;
  state: string;
  country: string;
}

export function CitiesTab({ initialData }: { initialData: CityItem[] }) {
  const router = useRouter();
  const [data, setData] = useState<CityItem[]>(initialData);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CityItem | null>(null);
  const [formData, setFormData] = useState({ name: "", state: "", country: "India" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = data.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.state.toLowerCase().includes(search.toLowerCase()) ||
      c.country.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ name: "", state: "", country: "India" });
    setModalOpen(true);
  };

  const openEdit = (item: CityItem) => {
    setEditingItem(item);
    setFormData({ name: item.name, state: item.state, country: item.country });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.country) return;
    setSaving(true);
    try {
      if (editingItem) {
        const res = await updateMasterCity(editingItem.id, formData);
        if (res.success && res.data) {
          setData((prev) => prev.map((c) => (c.id === editingItem.id ? res.data! : c)));
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to update city");
        }
      } else {
        const res = await createMasterCity(formData);
        if (res.success && res.data) {
          setData((prev) => [res.data!, ...prev]);
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to create city");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete city "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteMasterCity(id);
      if (res.success) {
        setData((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      } else {
        alert(res.error || "Failed to delete city");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
            Cities & States Directory
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage Indian departure hubs and international destination cities
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New City</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by city name, state, or country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F]"
        />
      </div>

      {/* Table List */}
      <div className="bg-white border border-[#B8944F]/20 rounded-lg overflow-hidden craft-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-zinc-200/80 text-zinc-600 font-semibold">
              <tr>
                <th className="py-3 px-4">City Name</th>
                <th className="py-3 px-4">State / Province</th>
                <th className="py-3 px-4">Country</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-400 text-xs">
                    No cities found matching query.
                  </td>
                </tr>
              ) : (
                filtered.map((city) => (
                  <tr key={city.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#14213D] flex items-center">
                      <MapPin className="h-3.5 w-3.5 text-[#B8944F] mr-1.5 inline" />
                      {city.name}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">{city.state}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          city.country === "India"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-blue-50 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {city.country}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => openEdit(city)}
                          className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-[#B8944F] transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(city.id, city.name)}
                          disabled={deletingId === city.id}
                          className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          {deletingId === city.id ? (
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces">
                {editingItem ? "Edit City" : "Add New City"}
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
                  City Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mumbai, Bali, Dubai"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  State / Province / Region
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. Maharashtra, Bali, Dubai"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Country *
                </label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g. India, Indonesia, UAE"
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
                  {editingItem ? "Update City" : "Save City"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
