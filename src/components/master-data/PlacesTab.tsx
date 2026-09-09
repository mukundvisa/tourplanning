"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, MapPin, Landmark, X, Loader2, Tag, Sparkles, ShieldCheck, Check, Save } from "lucide-react";
import { 
  createMasterPlace, 
  updateMasterPlace, 
  deleteMasterPlace,
  getMasterPlaceDefaults,
  updateMasterPlaceDefaults,
  getMasterPlaceCategories,
  createMasterPlaceCategory,
  updateMasterPlaceCategory,
  deleteMasterPlaceCategory,
} from "@/actions/master-data";
import { DEFAULT_PLACE_CATEGORIES } from "@/lib/master-data-defaults";
import { useRouter } from "next/navigation";
import { Pagination } from "./Pagination";
import { executeDeleteWithUndo } from "@/lib/delete-with-undo";

interface PlaceItem {
  id: string;
  name: string;
  cityId: string;
  city?: { id: string; name: string; country: string } | null;
  category: string | null;
  description: string | null;
  requiresSpecialTransport?: boolean;
  specialTransportOptions?: string[];
  inclusions?: string[];
  exclusions?: string[];
  placeSpecificInclusions?: string[];
  placeSpecificExclusions?: string[];
}

interface CityOption {
  id: string;
  name: string;
  country: string;
}

const CATEGORIES = [
  "Sightseeing",
  "Temple / Spiritual",
  "Heritage & Forts",
  "Nature & Outdoors",
  "Beach & Water",
  "Market & Shopping",
  "Museum & Culture",
  "Adventure & Activity",
  "Food & Nightlife",
];

const PRESET_TRANSPORT_OPTIONS = [
  "Car",
  "Auto-rickshaw",
  "Boat",
  "Helicopter",
  "Horse",
  "Palki",
  "Walk",
];

export function PlacesTab({
  initialData,
  cities,
}: {
  initialData: PlaceItem[];
  cities: CityOption[];
}) {
  const router = useRouter();
  const [data, setData] = useState<PlaceItem[]>(initialData);
  const [selectedCityId, setSelectedCityId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 9;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlaceItem | null>(null);

  const [categories, setCategories] = useState<{ id: string; name: string; isDefault?: boolean }[]>([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null);
  const [catSaving, setCatSaving] = useState(false);

  // Central Default Inclusions & Exclusions State
  const [defaultInclusions, setDefaultInclusions] = useState<string[]>([
    "Entry Ticket & Monument Access",
    "Professional Local Tour Guide",
    "Private Air-Conditioned Vehicle Transfers",
    "Complimentary Bottled Drinking Water",
  ]);
  const [defaultExclusions, setDefaultExclusions] = useState<string[]>([
    "Personal Souvenirs & Shopping Expenses",
    "Optional Adventure / Special Activity Upgrades",
    "Meals, Snacks & Beverages (unless specified)",
    "Special Camera / Video Recording Permissions",
  ]);
  const [newDefaultIncInput, setNewDefaultIncInput] = useState("");
  const [newDefaultExcInput, setNewDefaultExcInput] = useState("");
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [defaultsSavedNotice, setDefaultsSavedNotice] = useState(false);

  // Load defaults and categories from server
  useEffect(() => {
    async function loadData() {
      const [defaultsRes, catRes] = await Promise.all([
        getMasterPlaceDefaults(),
        getMasterPlaceCategories(),
      ]);

      if (defaultsRes.success && defaultsRes.data) {
        if (defaultsRes.data.defaultInclusions && defaultsRes.data.defaultInclusions.length > 0) {
          setDefaultInclusions(defaultsRes.data.defaultInclusions);
        }
        if (defaultsRes.data.defaultExclusions && defaultsRes.data.defaultExclusions.length > 0) {
          setDefaultExclusions(defaultsRes.data.defaultExclusions);
        }
      }

      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    }
    loadData();
  }, []);

  const handleSaveDefaults = async () => {
    setSavingDefaults(true);
    try {
      const res = await updateMasterPlaceDefaults({
        defaultInclusions,
        defaultExclusions,
      });
      if (res.success) {
        setDefaultsSavedNotice(true);
        setTimeout(() => setDefaultsSavedNotice(false), 3000);
        // Refresh place items with new merged defaults
        setData((prev) =>
          prev.map((p) => ({
            ...p,
            inclusions: Array.from(new Set([...defaultInclusions, ...(p.placeSpecificInclusions || p.inclusions || [])])),
            exclusions: Array.from(new Set([...defaultExclusions, ...(p.placeSpecificExclusions || p.exclusions || [])])),
          }))
        );
        router.refresh();
      } else {
        alert(res.error || "Failed to save default inclusions and exclusions.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving place defaults.");
    } finally {
      setSavingDefaults(false);
    }
  };

  const addDefaultInclusion = () => {
    const val = newDefaultIncInput.trim();
    if (!val) return;
    if (!defaultInclusions.includes(val)) {
      setDefaultInclusions((prev) => [...prev, val]);
    }
    setNewDefaultIncInput("");
  };

  const removeDefaultInclusion = (idx: number) => {
    setDefaultInclusions((prev) => prev.filter((_, i) => i !== idx));
  };

  const addDefaultExclusion = () => {
    const val = newDefaultExcInput.trim();
    if (!val) return;
    if (!defaultExclusions.includes(val)) {
      setDefaultExclusions((prev) => [...prev, val]);
    }
    setNewDefaultExcInput("");
  };

  const removeDefaultExclusion = (idx: number) => {
    setDefaultExclusions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Place Form Data State
  const [formData, setFormData] = useState<{
    name: string;
    cityId: string;
    category: string;
    description: string;
    requiresSpecialTransport: boolean;
    specialTransportOptions: string[];
    inclusions: string[];
    exclusions: string[];
  }>({
    name: "",
    cityId: "",
    category: "Sightseeing",
    description: "",
    requiresSpecialTransport: false,
    specialTransportOptions: ["Car", "Auto-rickshaw"],
    inclusions: [],
    exclusions: [],
  });

  const [inclusionInput, setInclusionInput] = useState("");
  const [exclusionInput, setExclusionInput] = useState("");
  const [customTransportInput, setCustomTransportInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredByCity =
    selectedCityId === "all" ? data : data.filter((p) => p.cityId === selectedCityId);
  const filtered = filteredByCity.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
      (p.city && p.city.name.toLowerCase().includes(search.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      cityId: selectedCityId !== "all" ? selectedCityId : cities[0]?.id || "",
      category: "Sightseeing",
      description: "",
      requiresSpecialTransport: false,
      specialTransportOptions: ["Car", "Auto-rickshaw"],
      inclusions: [],
      exclusions: [],
    });
    setInclusionInput("");
    setExclusionInput("");
    setCustomTransportInput("");
    setModalOpen(true);
  };

  const openEdit = (item: PlaceItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      cityId: item.cityId || cities[0]?.id || "",
      category: item.category || "Sightseeing",
      description: item.description || "",
      requiresSpecialTransport: !!item.requiresSpecialTransport,
      specialTransportOptions:
        item.specialTransportOptions && item.specialTransportOptions.length > 0
          ? item.specialTransportOptions
          : ["Car", "Auto-rickshaw"],
      inclusions: item.placeSpecificInclusions || item.inclusions || [],
      exclusions: item.placeSpecificExclusions || item.exclusions || [],
    });
    setInclusionInput("");
    setExclusionInput("");
    setCustomTransportInput("");
    setModalOpen(true);
  };

  const togglePresetTransport = (option: string) => {
    setFormData((prev) => {
      const exists = prev.specialTransportOptions.includes(option);
      return {
        ...prev,
        specialTransportOptions: exists
          ? prev.specialTransportOptions.filter((o) => o !== option)
          : [...prev.specialTransportOptions, option],
      };
    });
  };

  const addCustomTransport = () => {
    const val = customTransportInput.trim();
    if (!val) return;
    if (!formData.specialTransportOptions.includes(val)) {
      setFormData((prev) => ({
        ...prev,
        specialTransportOptions: [...prev.specialTransportOptions, val],
      }));
    }
    setCustomTransportInput("");
  };

  const removeTransportOption = (option: string) => {
    setFormData((prev) => ({
      ...prev,
      specialTransportOptions: prev.specialTransportOptions.filter((o) => o !== option),
    }));
  };

  const addInclusion = () => {
    const val = inclusionInput.trim();
    if (!val) return;
    if (!formData.inclusions.includes(val)) {
      setFormData((prev) => ({ ...prev, inclusions: [...prev.inclusions, val] }));
    }
    setInclusionInput("");
  };

  const removeInclusion = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== idx),
    }));
  };

  const addExclusion = () => {
    const val = exclusionInput.trim();
    if (!val) return;
    if (!formData.exclusions.includes(val)) {
      setFormData((prev) => ({ ...prev, exclusions: [...prev.exclusions, val] }));
    }
    setExclusionInput("");
  };

  const removeExclusion = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      exclusions: prev.exclusions.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.cityId) return;

    setSaving(true);
    try {
      if (editingItem) {
        const res = await updateMasterPlace(editingItem.id, formData);
        if (res.success && res.data) {
          const updated = {
            ...res.data,
            city: cities.find((c) => c.id === res.data!.cityId) || null,
            inclusions: Array.from(new Set([...defaultInclusions, ...(formData.inclusions || [])])),
            exclusions: Array.from(new Set([...defaultExclusions, ...(formData.exclusions || [])])),
            placeSpecificInclusions: formData.inclusions || [],
            placeSpecificExclusions: formData.exclusions || [],
          };
          setData((prev) =>
            prev.map((item) => (item.id === editingItem.id ? (updated as any) : item))
          );
          setModalOpen(false);
          router.refresh();
        }
      } else {
        const res = await createMasterPlace(formData);
        if (res.success && res.data) {
          const created = {
            ...res.data,
            city: cities.find((c) => c.id === res.data!.cityId) || null,
            inclusions: Array.from(new Set([...defaultInclusions, ...(formData.inclusions || [])])),
            exclusions: Array.from(new Set([...defaultExclusions, ...(formData.exclusions || [])])),
            placeSpecificInclusions: formData.inclusions || [],
            placeSpecificExclusions: formData.exclusions || [],
          };
          setData((prev) => [created as any, ...prev]);
          setModalOpen(false);
          router.refresh();
        }
      }
    } catch (err) {
      console.error("Save place error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (place: PlaceItem) => {
    executeDeleteWithUndo<PlaceItem>({
      item: place,
      itemType: "Place",
      itemName: place.name,
      onOptimisticRemove: (p) => {
        setData((prev) => prev.filter((item) => item.id !== p.id));
      },
      onUndo: (p) => {
        setData((prev) => [p, ...prev.filter((item) => item.id !== p.id)]);
      },
      onPermanentDelete: async (p) => {
        const res = await deleteMasterPlace(p.id);
        if (res.success) {
          router.refresh();
        } else {
          throw new Error(res.error || "Failed to delete place");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* CENTRAL DEFAULT INCLUSIONS & EXCLUSIONS SECTION */}
      {/* ========================================================= */}
      <div className="bg-white border border-[#B8944F]/30 rounded-xl p-5 craft-card shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-[#B8944F]" />
              <h3 className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                Default Inclusions & Exclusions
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {defaultsSavedNotice && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-in fade-in flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Saved & Applied to all Places!
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveDefaults}
              disabled={savingDefaults}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#14213D] hover:bg-[#2B2E36] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {savingDefaults ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 text-[#B8944F] mr-1" />
                  <span>Save Default Rules</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Central Default Inclusions */}
          <div className="space-y-2.5 bg-emerald-50/40 border border-emerald-200/60 rounded-lg p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <span>✓ Default Inclusions</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded">
                  {defaultInclusions.length} Rules
                </span>
              </label>
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                value={newDefaultIncInput}
                onChange={(e) => setNewDefaultIncInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDefaultInclusion();
                  }
                }}
                placeholder="Add standard inclusion rule (e.g. Entry Ticket, Local Guide)..."
                className="flex-1 px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-600 font-medium"
              />
              <button
                type="button"
                onClick={addDefaultInclusion}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                + Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {defaultInclusions.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-white text-emerald-900 border border-emerald-300 font-medium shadow-2xs"
                >
                  <span>✓ {item}</span>
                  <button
                    type="button"
                    onClick={() => removeDefaultInclusion(idx)}
                    className="ml-1.5 text-emerald-600 hover:text-red-600 font-bold cursor-pointer"
                    title="Remove default inclusion"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Central Default Exclusions */}
          <div className="space-y-2.5 bg-red-50/40 border border-red-200/60 rounded-lg p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                <span>✗ Default Exclusions</span>
                <span className="text-[10px] bg-red-100 text-red-800 font-semibold px-1.5 py-0.2 rounded">
                  {defaultExclusions.length} Rules
                </span>
              </label>
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                value={newDefaultExcInput}
                onChange={(e) => setNewDefaultExcInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDefaultExclusion();
                  }
                }}
                placeholder="Add standard exclusion rule (e.g. Personal Expenses, Camera Fees)..."
                className="flex-1 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-red-600 font-medium"
              />
              <button
                type="button"
                onClick={addDefaultExclusion}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                + Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {defaultExclusions.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-white text-red-900 border border-red-300 font-medium shadow-2xs"
                >
                  <span>✗ {item}</span>
                  <button
                    type="button"
                    onClick={() => removeDefaultExclusion(idx)}
                    className="ml-1.5 text-red-600 hover:text-red-800 font-bold cursor-pointer"
                    title="Remove default exclusion"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Header controls */}
      <div className="space-y-3">
        {/* Top row: City selector on left, Actions on right */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* City selector filter */}
          <div className="relative min-w-[220px] w-full sm:w-auto">
            <select
              value={selectedCityId}
              onChange={(e) => {
                setSelectedCityId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-64 pl-9 pr-8 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-[#14213D] focus:ring-1 focus:ring-[#B8944F] outline-none cursor-pointer shadow-2xs"
            >
              <option value="all">📍 All Cities ({data.length} Places)</option>
              {cities.map((c) => {
                const count = data.filter((p) => p.cityId === c.id).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name}, {c.country} ({count})
                  </option>
                );
              })}
            </select>
            <MapPin className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setCatModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-zinc-50 border border-[#B8944F]/40 text-[#8F6F33] rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Manage Categories</span>
            </button>

            <button
              onClick={openCreate}
              className="flex items-center space-x-2 px-4 py-2 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Place</span>
            </button>
          </div>
        </div>

        {/* Bottom row: Full-width search bar */}
        <div className="relative w-full">
          <Search className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search places by name, category, city..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] shadow-2xs"
          />
        </div>
      </div>

      {/* Places Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed border-zinc-200 rounded-xl space-y-3">
          <Landmark className="h-10 w-10 text-zinc-300 mx-auto" />
          <p className="text-sm font-semibold text-zinc-600">No places found</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {selectedCityId !== "all"
              ? "No places added for this city yet. Click 'Add Place' to add attractions."
              : "Start by selecting a city and adding sightseeing spots, temples, and attractions."}
          </p>
          <button
            onClick={openCreate}
            className="px-3.5 py-1.5 bg-[#B8944F]/10 text-[#B8944F] hover:bg-[#B8944F]/20 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center space-x-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add First Place</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered
              .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
              .map((place) => {
                const cityName =
                  place.city?.name ||
                  cities.find((c) => c.id === place.cityId)?.name ||
                  "Unknown City";
                return (
                  <div
                    key={place.id}
                    className="bg-white border border-zinc-200/80 rounded-xl p-4 hover:shadow-md transition-all duration-200 space-y-3 relative group flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B8944F]/10 text-[#B8944F]">
                              <MapPin className="h-2.5 w-2.5" />
                              <span>{cityName}</span>
                            </span>
                            {place.category && (
                              <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                                {place.category}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-[#14213D] truncate">{place.name}</h3>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => openEdit(place)}
                            className="p-1.5 text-zinc-400 hover:text-[#B8944F] hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Place"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(place)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Place"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {place.description ? (
                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                          {place.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-300 italic">No description added</p>
                      )}

                      {place.requiresSpecialTransport && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
                          <span className="font-bold">🚖 Special Transport:</span>
                          <span className="truncate">
                            {place.specialTransportOptions && place.specialTransportOptions.length > 0
                              ? place.specialTransportOptions.join(", ")
                              : "Required"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-zinc-100 space-y-1.5">
                      {place.inclusions && place.inclusions.length > 0 && (
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-emerald-700 shrink-0 text-[10px]">Inclusions:</span>
                          <div className="flex flex-wrap gap-1">
                            {place.inclusions.slice(0, 3).map((inc, i) => (
                              <span
                                key={i}
                                className="bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded text-[10px]"
                              >
                                ✓ {inc}
                              </span>
                            ))}
                            {place.inclusions.length > 3 && (
                              <span className="text-[10px] text-zinc-400">
                                +{place.inclusions.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {place.exclusions && place.exclusions.length > 0 && (
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-red-700 shrink-0 text-[10px]">Exclusions:</span>
                          <div className="flex flex-wrap gap-1">
                            {place.exclusions.slice(0, 3).map((exc, i) => (
                              <span
                                key={i}
                                className="bg-red-50 text-red-800 px-1.5 py-0.2 rounded text-[10px]"
                              >
                                ✗ {exc}
                              </span>
                            ))}
                            {place.exclusions.length > 3 && (
                              <span className="text-[10px] text-zinc-400">
                                +{place.exclusions.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center space-x-2">
                <Landmark className="h-4 w-4 text-[#B8944F]" />
                <h3 className="text-sm font-bold text-[#14213D]">
                  {editingItem ? "Edit Place & Services" : "Add New Place & Services"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* City Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  City / Destination *
                </label>
                <select
                  required
                  value={formData.cityId}
                  onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#B8944F] outline-none cursor-pointer"
                >
                  <option value="">Select City...</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}, {c.country}
                    </option>
                  ))}
                </select>
              </div>

              {/* Place Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Place Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mahakaleshwar Jyotirlinga, Kal Bhairav Temple"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] focus:ring-1 focus:ring-[#B8944F] outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => setCatModalOpen(true)}
                    className="text-[11px] text-[#B8944F] hover:underline font-medium cursor-pointer"
                  >
                    + Manage Categories
                  </button>
                </div>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] outline-none cursor-pointer font-medium"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Description / Historical Significance
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed note about the spot, timing recommendations, or significance..."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] outline-none leading-relaxed"
                />
              </div>

              {/* Special Transport Requirement */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.requiresSpecialTransport}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiresSpecialTransport: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-zinc-300 text-[#B8944F] focus:ring-[#B8944F] cursor-pointer shrink-0"
                  />
                  <div className="flex flex-col justify-center">
                    <span className="text-xs font-bold text-[#14213D] leading-tight">
                      Requires Dedicated / Special Transport
                    </span>
                    <p className="text-[11px] text-zinc-500 leading-normal mt-0.5">
                      Check if visitors need special transport to reach this place (e.g. Boat, Helicopter, Horse, Palki, etc.)
                    </p>
                  </div>
                </label>

                {formData.requiresSpecialTransport && (
                  <div className="mt-2.5 ml-6.5 p-3 bg-amber-50/50 border border-amber-200 rounded-lg space-y-2.5 animate-in fade-in duration-150">
                    <label className="block text-xs font-semibold text-amber-950">
                      Available Transport Options for this Place
                    </label>

                    {/* Preset Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_TRANSPORT_OPTIONS.map((opt) => {
                        const isSelected = formData.specialTransportOptions.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => togglePresetTransport(opt)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? "bg-amber-600 text-white font-bold shadow-2xs"
                                : "bg-white border border-amber-200 text-amber-900 hover:bg-amber-100/60"
                            }`}
                          >
                            {isSelected ? `✓ ${opt}` : `+ ${opt}`}
                          </button>
                        );
                      })}
                    </div>

                    {/* Add Custom Transport Option */}
                    <div className="flex gap-1.5 pt-1">
                      <input
                        type="text"
                        value={customTransportInput}
                        onChange={(e) => setCustomTransportInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomTransport();
                          }
                        }}
                        placeholder="Add custom option (e.g. Ropeway, Electric Cart)..."
                        className="flex-1 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={addCustomTransport}
                        className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>

                    {/* Selected Transport Options Tag list */}
                    {formData.specialTransportOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {formData.specialTransportOptions.map((opt) => (
                          <span
                            key={opt}
                            className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-white text-amber-900 border border-amber-300 font-bold shadow-2xs"
                          >
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() => removeTransportOption(opt)}
                              className="ml-1.5 text-amber-700 hover:text-red-600 font-bold cursor-pointer"
                              title="Remove option"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Inclusions */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                <label className="block text-xs font-semibold text-zinc-700">
                  Place Inclusions (e.g. Entry Ticket, VIP Darshan, Guide)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={inclusionInput}
                    onChange={(e) => setInclusionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addInclusion();
                      }
                    }}
                    placeholder="Type inclusion and press Enter or click '+'..."
                    className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#B8944F]"
                  />
                  <button
                    type="button"
                    onClick={addInclusion}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formData.inclusions.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium"
                    >
                      <span>✓ {item}</span>
                      <button
                        type="button"
                        onClick={() => removeInclusion(idx)}
                        className="ml-1.5 text-emerald-600 hover:text-red-600 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Exclusions */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                <label className="block text-xs font-semibold text-zinc-700">
                  Place Exclusions (e.g. Camera Fee, Special Prasad, Personal Expenses)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={exclusionInput}
                    onChange={(e) => setExclusionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addExclusion();
                      }
                    }}
                    placeholder="Type exclusion and press Enter or click '+'..."
                    className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#B8944F]"
                  />
                  <button
                    type="button"
                    onClick={addExclusion}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formData.exclusions.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-red-50 text-red-800 border border-red-200 font-medium"
                    >
                      <span>✗ {item}</span>
                      <button
                        type="button"
                        onClick={() => removeExclusion(idx)}
                        className="ml-1.5 text-red-600 hover:text-red-800 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-600 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.name.trim() || !formData.cityId}
                  className="px-4 py-2 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingItem ? "Update Place" : "Create Place"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#B8944F]" />
                <span>Manage Place Categories</span>
              </h3>
              <button
                onClick={() => {
                  setCatModalOpen(false);
                  setEditingCat(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Add new Category */}
            <div className="space-y-3 mb-4">
              <label className="block text-xs font-semibold text-zinc-700">
                {editingCat ? "Edit Category Name" : "Create New Category"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingCat ? editingCat.name : newCatName}
                  onChange={(e) => {
                    if (editingCat) {
                      setEditingCat({ ...editingCat, name: e.target.value });
                    } else {
                      setNewCatName(e.target.value);
                    }
                  }}
                  placeholder="e.g. Wildlife Safari, Heritage Walk..."
                  className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#B8944F]"
                />
                {editingCat ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={catSaving || !editingCat.name.trim()}
                      onClick={async () => {
                        setCatSaving(true);
                        const res = await updateMasterPlaceCategory(editingCat.id, editingCat.name);
                        if (res.success) {
                          setCategories((prev) =>
                            prev.map((c) => (c.id === editingCat.id ? { ...c, name: editingCat.name.trim() } : c))
                          );
                          setEditingCat(null);
                        }
                        setCatSaving(false);
                      }}
                      className="px-3 py-2 bg-[#B8944F] text-white rounded-lg text-xs font-bold hover:bg-[#8F6F33] disabled:opacity-50 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCat(null)}
                      className="px-2 py-2 border border-zinc-200 text-zinc-600 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={catSaving || !newCatName.trim()}
                    onClick={async () => {
                      setCatSaving(true);
                      const res = await createMasterPlaceCategory(newCatName);
                      if (res.success && res.data) {
                        setCategories((prev) => [...prev, res.data]);
                        setNewCatName("");
                      }
                      setCatSaving(false);
                    }}
                    className="px-3.5 py-2 bg-[#14213D] hover:bg-[#2B2E36] text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                )}
              </div>
            </div>

            {/* Existing Categories List */}
            <div className="border border-zinc-100 rounded-lg max-h-60 overflow-y-auto divide-y divide-zinc-100 bg-zinc-50/50">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2.5 text-xs">
                  <span className="font-semibold text-zinc-800">{cat.name}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setEditingCat({ id: cat.id, name: cat.name })}
                      className="p-1 text-zinc-400 hover:text-[#B8944F] rounded cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        executeDeleteWithUndo<{ id: string; name: string }>({
                          item: cat,
                          itemType: "Place Category",
                          itemName: cat.name,
                          onOptimisticRemove: (item) => {
                            setCategories((prev) => prev.filter((c) => c.id !== item.id));
                          },
                          onUndo: (item) => {
                            setCategories((prev) => [item, ...prev.filter((c) => c.id !== item.id)]);
                          },
                          onPermanentDelete: async (item) => {
                            const res = await deleteMasterPlaceCategory(item.id);
                            if (!res.success) {
                              throw new Error(res.error || "Failed to delete category");
                            }
                          },
                        });
                      }}
                      className="p-1 text-zinc-400 hover:text-red-600 rounded cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  setCatModalOpen(false);
                  setEditingCat(null);
                }}
                className="px-4 py-2 bg-[#14213D] hover:bg-[#2B2E36] text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
