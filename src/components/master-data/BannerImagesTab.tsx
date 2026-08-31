"use client";

import React, { useState } from "react";
import { Plus, Search, Edit2, Trash2, Image as ImageIcon, MapPin, X, Loader2, UploadCloud } from "lucide-react";
import {
  createMasterBannerImage,
  updateMasterBannerImage,
  deleteMasterBannerImage,
} from "@/actions/master-data";
import { useRouter } from "next/navigation";

interface BannerImageItem {
  id: string;
  label: string;
  imageUrl: string;
  destinationCityId: string | null;
  destinationCity?: { id: string; name: string; country: string } | null;
}

interface CityOption {
  id: string;
  name: string;
  country: string;
}

export function BannerImagesTab({
  initialData,
  cities,
}: {
  initialData: BannerImageItem[];
  cities: CityOption[];
}) {
  const router = useRouter();
  const [data, setData] = useState<BannerImageItem[]>(initialData);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BannerImageItem | null>(null);

  const [formData, setFormData] = useState({
    label: "",
    imageUrl: "",
    destinationCityId: "",
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = data.filter(
    (b) =>
      b.label.toLowerCase().includes(search.toLowerCase()) ||
      (b.destinationCity && b.destinationCity.name.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditingItem(null);
    setFormData({
      label: "",
      imageUrl: "",
      destinationCityId: cities[0]?.id || "",
    });
    setModalOpen(true);
  };

  const openEdit = (item: BannerImageItem) => {
    setEditingItem(item);
    setFormData({
      label: item.label,
      imageUrl: item.imageUrl,
      destinationCityId: item.destinationCityId || "",
    });
    setModalOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const resData = await res.json();
      if (resData.url) {
        setFormData((prev) => ({ ...prev, imageUrl: resData.url }));
      } else {
        alert("Upload failed: " + resData.error);
      }
    } catch (err) {
      alert("Error uploading image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label || !formData.imageUrl) return;
    setSaving(true);
    try {
      const payload = {
        label: formData.label,
        imageUrl: formData.imageUrl,
        destinationCityId: formData.destinationCityId || undefined,
      };

      if (editingItem) {
        const res = await updateMasterBannerImage(editingItem.id, payload);
        if (res.success && res.data) {
          const updated = {
            ...res.data,
            destinationCity: cities.find((c) => c.id === res.data!.destinationCityId) || null,
          } as BannerImageItem;
          setData((prev) => prev.map((b) => (b.id === editingItem.id ? updated : b)));
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to update banner");
        }
      } else {
        const res = await createMasterBannerImage(payload);
        if (res.success && res.data) {
          const created = {
            ...res.data,
            destinationCity: cities.find((c) => c.id === res.data!.destinationCityId) || null,
          } as BannerImageItem;
          setData((prev) => [created, ...prev]);
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to create banner");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Are you sure you want to delete banner image "${label}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteMasterBannerImage(id);
      if (res.success) {
        setData((prev) => prev.filter((b) => b.id !== id));
        router.refresh();
      } else {
        alert(res.error || "Failed to delete banner");
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
            Curated Banner & Cover Library
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            High-resolution hero images linked to destination cities, selectable in Step 1
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Banner Image</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search banner library..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-lg">
            No banner images found.
          </div>
        ) : (
          filtered.map((b) => (
            <div
              key={b.id}
              className="bg-white border border-[#B8944F]/20 rounded-lg overflow-hidden craft-card flex flex-col justify-between hover:shadow-md transition-all group"
            >
              <div className="h-40 relative bg-zinc-100 overflow-hidden">
                <img
                  src={b.imageUrl}
                  alt={b.label}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {b.destinationCity && (
                  <span className="absolute bottom-2 left-2 bg-[#14213D]/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center">
                    <MapPin className="h-3 w-3 mr-1 text-[#B8944F]" />
                    {b.destinationCity.name}
                  </span>
                )}
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#14213D] line-clamp-1">{b.label}</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate max-w-[180px]">
                    {b.imageUrl}
                  </p>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => openEdit(b)}
                    className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-[#B8944F] cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id, b.label)}
                    disabled={deletingId === b.id}
                    className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 cursor-pointer"
                  >
                    {deletingId === b.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces">
                {editingItem ? "Edit Banner Image" : "Add Banner Image"}
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
                  Banner Label *
                </label>
                <input
                  type="text"
                  required
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g. Bali - Tropical Luxury Pool Villa"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Destination City Linking
                </label>
                <select
                  value={formData.destinationCityId}
                  onChange={(e) =>
                    setFormData({ ...formData, destinationCityId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none bg-white"
                >
                  <option value="">-- All Destinations / Global --</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Image File Upload
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#B8944F]/10 file:text-[#B8944F] hover:file:bg-[#B8944F]/20 cursor-pointer disabled:opacity-50"
                  />
                  {uploading && (
                    <span className="text-xs text-zinc-500 flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1 text-[#B8944F]" /> Uploading...
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Or Image Web URL *
                </label>
                <input
                  type="text"
                  required
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              {formData.imageUrl && (
                <div className="h-28 rounded-lg overflow-hidden border border-zinc-200">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

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
                  {editingItem ? "Update Banner" : "Save Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
