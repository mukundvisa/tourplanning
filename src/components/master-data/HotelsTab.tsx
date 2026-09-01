"use client";

import React, { useState } from "react";
import { Plus, Search, Edit2, Trash2, BedDouble, Star, MapPin, X, Loader2, UploadCloud, Image as ImageIcon } from "lucide-react";
import { createMasterHotel, updateMasterHotel, deleteMasterHotel } from "@/actions/master-data";
import { useRouter } from "next/navigation";

interface HotelItem {
  id: string;
  name: string;
  cityId: string | null;
  city?: { id: string; name: string; country: string } | null;
  starRating: number;
  roomTypes: string[];
  mealPlans: string[];
  guestScore: number | null;
  guestScoreLabel: string | null;
  facilities: string[];
  nearbyAttractions: any;
  nearbyRestaurants: any;
  photos: string[];
  titleTemplateId: string | null;
}

interface CityOption {
  id: string;
  name: string;
  country: string;
}

export function HotelsTab({
  initialData,
  cities,
}: {
  initialData: HotelItem[];
  cities: CityOption[];
}) {
  const router = useRouter();
  const [data, setData] = useState<HotelItem[]>(initialData);
  const [selectedCityId, setSelectedCityId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HotelItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    cityId: "",
    starRating: 4,
    roomTypes: [] as string[],
    mealPlans: [] as string[],
    guestScore: "4.5",
    guestScoreLabel: "Very Good",
    facilities: [] as string[],
    nearbyAttractions: [] as { name: string; distanceKm: number }[],
    nearbyRestaurants: [] as { name: string; distance: string }[],
    photos: [] as string[],
  });

  const [roomInput, setRoomInput] = useState("");
  const [mealInput, setMealInput] = useState("");
  const [facilityInput, setFacilityInput] = useState("");
  const [attractionName, setAttractionName] = useState("");
  const [attractionDist, setAttractionDist] = useState("");
  const [restName, setRestName] = useState("");
  const [restDist, setRestDist] = useState("");
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredByCity = selectedCityId === "all" ? data : data.filter((h) => h.cityId === selectedCityId);
  const filtered = filteredByCity.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      (h.city && h.city.name.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      cityId: selectedCityId !== "all" ? selectedCityId : (cities[0]?.id || ""),
      starRating: 4,
      roomTypes: ["Standard Room"],
      mealPlans: ["CP (Breakfast Included)"],
      guestScore: "4.5",
      guestScoreLabel: "Very Good",
      facilities: ["Free Wi-Fi", "Swimming Pool"],
      nearbyAttractions: [],
      nearbyRestaurants: [],
      photos: [],
    });
    setModalOpen(true);
  };

  const openEdit = (item: HotelItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      cityId: item.cityId || "",
      starRating: item.starRating,
      roomTypes: item.roomTypes || [],
      mealPlans: item.mealPlans || [],
      guestScore: item.guestScore?.toString() || "4.5",
      guestScoreLabel: item.guestScoreLabel || "Very Good",
      facilities: item.facilities || [],
      nearbyAttractions: typeof item.nearbyAttractions === "string" ? JSON.parse(item.nearbyAttractions) : item.nearbyAttractions || [],
      nearbyRestaurants: typeof item.nearbyRestaurants === "string" ? JSON.parse(item.nearbyRestaurants) : item.nearbyRestaurants || [],
      photos: item.photos || [],
    });
    setModalOpen(true);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const resData = await res.json();
      if (res.ok && resData.url) {
        setFormData((prev) => ({
          ...prev,
          photos: [...prev.photos, resData.url],
        }));
      } else {
        alert("Upload failed: " + resData.error);
      }
    } catch (err) {
      alert("Error uploading image");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        cityId: formData.cityId || undefined,
        starRating: Number(formData.starRating),
        roomTypes: formData.roomTypes,
        mealPlans: formData.mealPlans,
        guestScore: parseFloat(formData.guestScore) || undefined,
        guestScoreLabel: formData.guestScoreLabel || undefined,
        facilities: formData.facilities,
        nearbyAttractions: formData.nearbyAttractions,
        nearbyRestaurants: formData.nearbyRestaurants,
        photos: formData.photos,
      };

      if (editingItem) {
        const res = await updateMasterHotel(editingItem.id, payload);
        if (res.success && res.data) {
          const updated = {
            ...res.data,
            city: cities.find((c) => c.id === res.data!.cityId) || null,
          } as HotelItem;
          setData((prev) => prev.map((h) => (h.id === editingItem.id ? updated : h)));
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to update hotel");
        }
      } else {
        const res = await createMasterHotel(payload);
        if (res.success && res.data) {
          const created = {
            ...res.data,
            city: cities.find((c) => c.id === res.data!.cityId) || null,
          } as HotelItem;
          setData((prev) => [created, ...prev]);
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to create hotel");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete hotel "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteMasterHotel(id);
      if (res.success) {
        setData((prev) => prev.filter((h) => h.id !== id));
        router.refresh();
      } else {
        alert(res.error || "Failed to delete hotel");
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
            Hotels & Resorts Inventory
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage verified properties and accommodations across destinations
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Master Hotel</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search hotels by property name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F]"
          />
        </div>

        <select
          value={selectedCityId}
          onChange={(e) => setSelectedCityId(e.target.value)}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-lg">
            No hotels found. Click "Add Master Hotel" to create one.
          </div>
        ) : (
          filtered.map((hotel) => (
            <div
              key={hotel.id}
              className="bg-white border border-[#B8944F]/20 rounded-lg p-5 craft-card flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#14213D] line-clamp-1">
                      {hotel.name}
                    </h3>
                    <div className="flex items-center space-x-2 text-[11px] text-zinc-500 mt-1">
                      {hotel.city && (
                        <span className="flex items-center font-semibold text-[#B8944F]">
                          <MapPin className="h-3 w-3 mr-1" />
                          {hotel.city.name}, {hotel.city.country}
                        </span>
                      )}
                      <span className="flex items-center text-amber-500 font-bold">
                        <Star className="h-3 w-3 fill-amber-500 mr-0.5" />
                        {hotel.starRating} Star
                      </span>
                      {hotel.guestScore && (
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-bold text-[10px]">
                          {hotel.guestScore}★ ({hotel.guestScoreLabel || "Superb"})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => openEdit(hotel)}
                      className="p-1 rounded hover:bg-zinc-100 text-zinc-500 hover:text-[#B8944F] cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(hotel.id, hotel.name)}
                      disabled={deletingId === hotel.id}
                      className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 cursor-pointer"
                    >
                      {deletingId === hotel.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Photos preview */}
                {hotel.photos && hotel.photos.length > 0 && (
                  <div className="flex space-x-2 overflow-x-auto py-2">
                    {hotel.photos.slice(0, 3).map((p, idx) => (
                      <div
                        key={idx}
                        className="h-16 w-24 rounded-lg overflow-hidden shrink-0 border border-zinc-200"
                      >
                        <img src={p} alt="Photo" className="h-full w-full object-cover" />
                      </div>
                    ))}
                    {hotel.photos.length > 3 && (
                      <div className="h-16 w-16 rounded-lg bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0">
                        +{hotel.photos.length - 3}
                      </div>
                    )}
                  </div>
                )}

                {/* Scoped Room Types & Meal Plans */}
                <div className="space-y-1.5 pt-3 border-t border-zinc-100 text-[11px]">
                  <div>
                    <span className="font-semibold text-[#14213D]">Room Types: </span>
                    <span className="text-zinc-600">
                      {hotel.roomTypes?.join(", ") || "Standard"}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#14213D]">Meal Plans: </span>
                    <span className="text-zinc-600">
                      {hotel.mealPlans?.join(", ") || "CP"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-2xl w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4 sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces">
                {editingItem ? "Edit Master Hotel" : "Add Master Hotel"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Hotel Property Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. The Seminyak Beach Resort & Spa"
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
                    <option value="">-- Select Destination City --</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Star Rating (1-5 Stars)
                  </label>
                  <select
                    value={formData.starRating}
                    onChange={(e) =>
                      setFormData({ ...formData, starRating: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none bg-white"
                  >
                    <option value={3}>3 Star Hotel</option>
                    <option value={4}>4 Star Deluxe Hotel</option>
                    <option value={5}>5 Star Luxury Resort / Villa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Guest Score (e.g. 4.8)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.guestScore}
                    onChange={(e) => setFormData({ ...formData, guestScore: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Guest Score Label (e.g. Exceptional)
                  </label>
                  <input
                    type="text"
                    value={formData.guestScoreLabel}
                    onChange={(e) =>
                      setFormData({ ...formData, guestScoreLabel: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>
              </div>

              {/* Scoped Room Types */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Scoped Room Types (Options available to select in Step 4)
                </label>
                <div className="flex gap-1 mb-2">
                  <input
                    type="text"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (roomInput.trim()) {
                          setFormData({
                            ...formData,
                            roomTypes: [...formData.roomTypes, roomInput.trim()],
                          });
                          setRoomInput("");
                        }
                      }
                    }}
                    placeholder="e.g. Beachfront Pool Villa (Press Enter)"
                    className="flex-1 px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (roomInput.trim()) {
                        setFormData({
                          ...formData,
                          roomTypes: [...formData.roomTypes, roomInput.trim()],
                        });
                        setRoomInput("");
                      }
                    }}
                    className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold"
                  >
                    + Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formData.roomTypes.map((r, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200"
                    >
                      {r}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            roomTypes: formData.roomTypes.filter((_, idx) => idx !== i),
                          })
                        }
                        className="ml-1 text-amber-700 hover:text-amber-950"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Scoped Meal Plans */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Scoped Meal Plans (Options available in Step 4)
                </label>
                <div className="flex gap-1 mb-2">
                  <input
                    type="text"
                    value={mealInput}
                    onChange={(e) => setMealInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (mealInput.trim()) {
                          setFormData({
                            ...formData,
                            mealPlans: [...formData.mealPlans, mealInput.trim()],
                          });
                          setMealInput("");
                        }
                      }
                    }}
                    placeholder="e.g. Breakfast Included (CP)"
                    className="flex-1 px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (mealInput.trim()) {
                        setFormData({
                          ...formData,
                          mealPlans: [...formData.mealPlans, mealInput.trim()],
                        });
                        setMealInput("");
                      }
                    }}
                    className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold"
                  >
                    + Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formData.mealPlans.map((m, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200"
                    >
                      {m}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            mealPlans: formData.mealPlans.filter((_, idx) => idx !== i),
                          })
                        }
                        className="ml-1 text-blue-700 hover:text-blue-950"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Facilities */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Property Amenities & Facilities
                </label>
                <div className="flex gap-1 mb-2">
                  <input
                    type="text"
                    value={facilityInput}
                    onChange={(e) => setFacilityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (facilityInput.trim()) {
                          setFormData({
                            ...formData,
                            facilities: [...formData.facilities, facilityInput.trim()],
                          });
                          setFacilityInput("");
                        }
                      }
                    }}
                    placeholder="e.g. Infinity Pool, Spa, Tennis Court"
                    className="flex-1 px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (facilityInput.trim()) {
                        setFormData({
                          ...formData,
                          facilities: [...formData.facilities, facilityInput.trim()],
                        });
                        setFacilityInput("");
                      }
                    }}
                    className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold"
                  >
                    + Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formData.facilities.map((f, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200"
                    >
                      {f}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            facilities: formData.facilities.filter((_, idx) => idx !== i),
                          })
                        }
                        className="ml-1 text-zinc-400 hover:text-zinc-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Photo Uploads & Links */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Property High-Res Photos
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadPhoto}
                    disabled={uploadingPhoto}
                    className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#B8944F]/10 file:text-[#B8944F] hover:file:bg-[#B8944F]/20 cursor-pointer disabled:opacity-50"
                  />
                  {uploadingPhoto && (
                    <span className="text-xs text-zinc-500 flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1 text-[#B8944F]" /> Uploading...
                    </span>
                  )}
                </div>
                <div className="flex gap-1 mb-2">
                  <input
                    type="text"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    placeholder="Or paste image URL directly..."
                    className="flex-1 px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (photoUrlInput.trim()) {
                        setFormData({
                          ...formData,
                          photos: [...formData.photos, photoUrlInput.trim()],
                        });
                        setPhotoUrlInput("");
                      }
                    }}
                    className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold"
                  >
                    Add URL
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {formData.photos.map((p, idx) => (
                    <div
                      key={idx}
                      className="relative h-16 rounded-lg overflow-hidden border border-zinc-200 group"
                    >
                      <img src={p} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            photos: formData.photos.filter((_, i) => i !== idx),
                          })
                        }
                        className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold transition-opacity"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 sticky bottom-0 bg-white">
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
                  {editingItem ? "Update Hotel" : "Save Hotel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
