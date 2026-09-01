"use client";

import React, { useState } from "react";
import { Plus, Search, Edit2, Trash2, UtensilsCrossed, Star, MapPin, X, Loader2, Check } from "lucide-react";
import {
  createMasterRestaurant,
  updateMasterRestaurant,
  deleteMasterRestaurant,
} from "@/actions/master-data";
import { useRouter } from "next/navigation";

interface RestaurantItem {
  id: string;
  name: string;
  cityId: string | null;
  city?: { id: string; name: string; country: string } | null;
  cuisineType: string;
  categoryType: string;
  starRating: number | null;
  reviewsCount: number | null;
  offersPureVegJain: boolean;
  titleTemplateId: string | null;
}

interface CityOption {
  id: string;
  name: string;
  country: string;
}

export function RestaurantsTab({
  initialData,
  cities,
}: {
  initialData: RestaurantItem[];
  cities: CityOption[];
}) {
  const router = useRouter();
  const [data, setData] = useState<RestaurantItem[]>(initialData);
  const [selectedCityFilter, setSelectedCityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RestaurantItem | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    cityId: "",
    cuisineType: "North & South Indian",
    categoryType: "Restaurant",
    starRating: "4.5",
    reviewsCount: "100",
    offersPureVegJain: false,
  });

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredByCity = selectedCityFilter === "all" ? data : data.filter((r) => r.cityId === selectedCityFilter);
  const filtered = filteredByCity.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisineType.toLowerCase().includes(search.toLowerCase()) ||
      (r.city && r.city.name.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      cityId: selectedCityFilter !== "all" ? selectedCityFilter : (cities[0]?.id || ""),
      cuisineType: "Indian & Continental",
      categoryType: "Restaurant",
      starRating: "4.5",
      reviewsCount: "150",
      offersPureVegJain: true,
    });
    setModalOpen(true);
  };

  const openEdit = (item: RestaurantItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      cityId: item.cityId || "",
      cuisineType: item.cuisineType,
      categoryType: item.categoryType || "Restaurant",
      starRating: item.starRating?.toString() || "4.5",
      reviewsCount: item.reviewsCount?.toString() || "100",
      offersPureVegJain: item.offersPureVegJain,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.cuisineType) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        cityId: formData.cityId || undefined,
        cuisineType: formData.cuisineType,
        categoryType: formData.categoryType,
        starRating: parseFloat(formData.starRating) || 4.5,
        reviewsCount: parseInt(formData.reviewsCount) || 100,
        offersPureVegJain: formData.offersPureVegJain,
      };

      if (editingItem) {
        const res = await updateMasterRestaurant(editingItem.id, payload);
        if (res.success && res.data) {
          const updated = {
            ...res.data,
            city: cities.find((c) => c.id === res.data!.cityId) || null,
          } as RestaurantItem;
          setData((prev) => prev.map((r) => (r.id === editingItem.id ? updated : r)));
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to update restaurant");
        }
      } else {
        const res = await createMasterRestaurant(payload);
        if (res.success && res.data) {
          const created = {
            ...res.data,
            city: cities.find((c) => c.id === res.data!.cityId) || null,
          } as RestaurantItem;
          setData((prev) => [created, ...prev]);
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to create restaurant");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete restaurant "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteMasterRestaurant(id);
      if (res.success) {
        setData((prev) => prev.filter((r) => r.id !== id));
        router.refresh();
      } else {
        alert(res.error || "Failed to delete restaurant");
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
            Dining & Hotspots Guide
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage recommended dining places, Indian restaurants, beach clubs, and cafes across destinations
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Master Dining</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search dining by name, cuisine, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F]"
          />
        </div>

        <select
          value={selectedCityFilter}
          onChange={(e) => setSelectedCityFilter(e.target.value)}
          className="px-3.5 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none cursor-pointer"
        >
          <option value="all">📍 All Destinations & Cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}, {c.country}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-[#B8944F]/20 rounded-lg overflow-hidden craft-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-zinc-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Dining Spot</th>
                <th className="py-3 px-4">Location / City</th>
                <th className="py-3 px-4">Category & Cuisine</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Dietary</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400 text-xs">
                    No dining suggestions found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#14213D] flex items-center">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-[#B8944F] mr-2" />
                      {item.name}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      {item.city ? `${item.city.name}, ${item.city.country}` : "Universal"}
                    </td>
                    <td className="py-3 px-4 text-zinc-650">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(item.categoryType || "Restaurant").split(",").map((c: string, idx: number) => (
                          <span key={idx} className="bg-zinc-100 text-[#14213D] text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-zinc-200">
                            {c.trim()}
                          </span>
                        ))}
                        <span className="text-zinc-400 text-xs ml-0.5 font-medium">• {item.cuisineType}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-amber-600 font-bold flex items-center">
                        <Star className="h-3 w-3 fill-amber-500 mr-0.5 inline" />
                        {item.starRating || 4.5} ({item.reviewsCount || 100}+)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.offersPureVegJain ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Pure Veg / Jain
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-[11px]">Standard</span>
                      )}
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
                {editingItem ? "Edit Restaurant" : "Add Restaurant"}
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
                    Restaurant / Club Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Queen's Tandoor Seminyak"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Destination City *
                  </label>
                  <select
                    value={formData.cityId}
                    onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none bg-white"
                  >
                    <option value="">-- Universal --</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                    Category Types (Select all that apply) *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {["Restaurant", "Beach Club", "Night Club", "Cafe", "Rooftop Bar", "Bakery", "Bar", "Lounge"].map((cat) => {
                      const selected = formData.categoryType
                        ? formData.categoryType.split(",").map((c: string) => c.trim()).includes(cat)
                        : false;
                      return (
                        <label
                          key={cat}
                          className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer text-xs select-none transition-all ${
                            selected
                              ? "border-[#B8944F] bg-[#B8944F]/5 font-bold text-[#14213D]"
                              : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              const currentArray = formData.categoryType
                                ? formData.categoryType.split(",").map((c: string) => c.trim()).filter(Boolean)
                                : [];
                              let updatedArray: string[];
                              if (currentArray.includes(cat)) {
                                updatedArray = currentArray.filter((c) => c !== cat);
                              } else {
                                updatedArray = [...currentArray, cat];
                              }
                              setFormData({
                                ...formData,
                                categoryType: updatedArray.length > 0 ? updatedArray.join(", ") : "Restaurant",
                              });
                            }}
                            className="rounded text-[#B8944F] focus:ring-[#B8944F] border-zinc-300 h-4 w-4 cursor-pointer"
                          />
                          <span>{cat}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Cuisine Specialties *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cuisineType}
                    onChange={(e) =>
                      setFormData({ ...formData, cuisineType: e.target.value })
                    }
                    placeholder="e.g. North & South Indian, Mughlai, Italian Seafood"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Star Rating (e.g. 4.7)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.starRating}
                    onChange={(e) =>
                      setFormData({ ...formData, starRating: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Reviews Count (e.g. 850)
                  </label>
                  <input
                    type="number"
                    value={formData.reviewsCount}
                    onChange={(e) =>
                      setFormData({ ...formData, reviewsCount: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div className="col-span-2 pt-2">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.offersPureVegJain}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          offersPureVegJain: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-zinc-300 text-[#B8944F] focus:ring-[#B8944F]"
                    />
                    <span>Offers Dedicated Pure Veg / Jain Food Options</span>
                  </label>
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
                  {editingItem ? "Update Dining Spot" : "Save Dining Spot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
