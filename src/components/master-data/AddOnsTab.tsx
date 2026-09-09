"use client";

import React, { useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Ticket,
  DollarSign,
  X,
  Loader2,
  ShieldCheck,
  Smartphone,
  Car,
  FileCheck,
  Sparkles,
  Layers,
  Filter,
  MapPin,
  Check,
} from "lucide-react";
import {
  createMasterAddOn,
  updateMasterAddOn,
  deleteMasterAddOn,
} from "@/actions/master-data";
import { useRouter } from "next/navigation";
import { Pagination } from "./Pagination";
import { executeDeleteWithUndo } from "@/lib/delete-with-undo";

export interface AddOnCity {
  id: string;
  name: string;
  state?: string;
  country?: string;
}

export interface AddOnItem {
  id: string;
  name: string;
  type: string;
  cityId?: string | null;
  city?: AddOnCity | null;
  cityIds?: string[];
  visaType: string | null;
  validityLength: string | null;
  validityWindow: string | null;
  defaultPrice: number;
  detailsDescription: string | null;
}

const ADDON_TYPES = ["All", "Visa", "Transfer", "Activity", "Insurance", "SIM", "Other"];

export function AddOnsTab({
  initialData,
  cities = [],
}: {
  initialData: AddOnItem[];
  cities?: AddOnCity[];
}) {
  const router = useRouter();
  const [data, setData] = useState<AddOnItem[]>(initialData);
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCityId, setSelectedCityId] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 6;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AddOnItem | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    type: string;
    cityId: string;
    cityIds: string[];
    visaType: string;
    validityLength: string;
    validityWindow: string;
    defaultPrice: string;
    detailsDescription: string;
  }>({
    name: "",
    type: "Visa",
    cityId: "",
    cityIds: [],
    visaType: "",
    validityLength: "",
    validityWindow: "",
    defaultPrice: "3500",
    detailsDescription: "",
  });

  const [saving, setSaving] = useState(false);

  // Filter by Type, City, and Search query
  const filteredByType =
    selectedType === "All" ? data : data.filter((a) => a.type === selectedType);

  const filteredByCity =
    selectedCityId === "All"
      ? filteredByType
      : filteredByType.filter((a) => {
          if (a.cityId === selectedCityId) return true;
          if (a.cityIds && a.cityIds.includes(selectedCityId)) return true;
          if (a.city?.id === selectedCityId) return true;
          return false;
        });

  const filtered = filteredByCity.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.visaType && a.visaType.toLowerCase().includes(search.toLowerCase())) ||
      (a.city?.name && a.city.name.toLowerCase().includes(search.toLowerCase())) ||
      (a.detailsDescription && a.detailsDescription.toLowerCase().includes(search.toLowerCase()))
  );

  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleCityFilterChange = (cityId: string) => {
    setSelectedCityId(cityId);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const openCreate = () => {
    setEditingItem(null);
    const defaultCityId = selectedCityId !== "All" ? selectedCityId : (cities[0]?.id || "");
    setFormData({
      name: "",
      type: selectedType !== "All" ? selectedType : "Visa",
      cityId: defaultCityId,
      cityIds: defaultCityId ? [defaultCityId] : [],
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
    const existingCityIds = item.cityIds && item.cityIds.length > 0
      ? item.cityIds
      : (item.cityId ? [item.cityId] : []);
    
    setFormData({
      name: item.name,
      type: item.type || "Visa",
      cityId: item.cityId || existingCityIds[0] || "",
      cityIds: existingCityIds,
      visaType: item.visaType || "",
      validityLength: item.validityLength || "",
      validityWindow: item.validityWindow || "",
      defaultPrice: item.defaultPrice?.toString() || "0",
      detailsDescription: item.detailsDescription || "",
    });
    setModalOpen(true);
  };

  const toggleCitySelection = (cId: string) => {
    setFormData((prev) => {
      const exists = prev.cityIds.includes(cId);
      const updated = exists
        ? prev.cityIds.filter((id) => id !== cId)
        : [...prev.cityIds, cId];
      return {
        ...prev,
        cityIds: updated,
        cityId: updated[0] || "",
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        cityId: formData.cityId || (formData.cityIds[0] || undefined),
        cityIds: formData.cityIds,
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

  const handleDelete = (addon: AddOnItem) => {
    executeDeleteWithUndo<AddOnItem>({
      item: addon,
      itemType: "Add-on",
      itemName: addon.name,
      onOptimisticRemove: (a) => {
        setData((prev) => prev.filter((item) => item.id !== a.id));
      },
      onUndo: (a) => {
        setData((prev) => [a, ...prev.filter((item) => item.id !== a.id)]);
      },
      onPermanentDelete: async (a) => {
        const res = await deleteMasterAddOn(a.id);
        if (res.success) {
          router.refresh();
        } else {
          throw new Error(res.error || "Failed to delete add-on");
        }
      },
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Visa":
        return <FileCheck className="h-4 w-4 text-emerald-600" />;
      case "Insurance":
        return <ShieldCheck className="h-4 w-4 text-blue-600" />;
      case "Transfer":
        return <Car className="h-4 w-4 text-amber-600" />;
      case "SIM":
        return <Smartphone className="h-4 w-4 text-purple-600" />;
      case "Activity":
        return <Sparkles className="h-4 w-4 text-[#B8944F]" />;
      default:
        return <Layers className="h-4 w-4 text-zinc-500" />;
    }
  };

  const getCityNamesForCard = (item: AddOnItem) => {
    if (!item.cityIds || item.cityIds.length === 0) {
      if (item.city?.name) return item.city.name;
      return "All Cities / Multi-City";
    }
    const matched = cities
      .filter((c) => item.cityIds?.includes(c.id))
      .map((c) => c.name);
    if (matched.length > 0) return matched.join(", ");
    if (item.city?.name) return item.city.name;
    return "All Cities / Multi-City";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
            Add-ons, Visas & Insurance Catalog
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage city-connected visa packages, SIM cards, airport transfers, insurance, and activities
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search add-ons by package name, city, or description..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F]"
          />
        </div>

        {/* City Filter Dropdown */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-white border border-zinc-200 rounded-lg px-3 py-1.5 shadow-2xs">
            <MapPin className="h-3.5 w-3.5 text-[#B8944F]" />
            <select
              value={selectedCityId}
              onChange={(e) => handleCityFilterChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#14213D] outline-none cursor-pointer"
            >
              <option value="All">All Cities ({data.length})</option>
              {cities.map((city) => {
                const count = data.filter(
                  (a) =>
                    a.cityId === city.id ||
                    (a.cityIds && a.cityIds.includes(city.id)) ||
                    a.city?.id === city.id
                ).length;
                return (
                  <option key={city.id} value={city.id}>
                    {city.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Type Filter Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {ADDON_TYPES.map((t) => {
            const count = t === "All" ? data.length : data.filter((a) => a.type === t).length;
            return (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedType === t
                    ? "bg-[#14213D] text-[#DDA74F] shadow-sm"
                    : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {t} {count > 0 ? `(${count})` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add-ons Grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-lg">
              No add-ons found matching your search. Click "Add Master Add-on" to create one.
            </div>
          ) : (
            paginated.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-[#B8944F]/25 hover:border-[#B8944F] rounded-xl p-5 craft-card flex flex-col justify-between hover:shadow-md transition-all duration-200 group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <div className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100">
                        {getTypeIcon(item.type)}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B8944F]/10 text-[#8F6F33] border border-[#B8944F]/20 uppercase tracking-wider">
                        {item.type}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1">
                        <MapPin className="h-2.5 w-2.5" />
                        <span className="truncate max-w-[110px]">{getCityNamesForCard(item)}</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-[#B8944F] transition-colors cursor-pointer"
                        title="Edit Add-on"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete Add-on"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#14213D] group-hover:text-[#8F6F33] transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    {item.visaType && (
                      <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                        {item.visaType}
                      </p>
                    )}
                  </div>

                  {item.detailsDescription && (
                    <p className="text-xs text-zinc-600 bg-[#FAF8F5] p-2.5 rounded-lg border border-zinc-200/60 leading-relaxed line-clamp-2">
                      {item.detailsDescription}
                    </p>
                  )}

                  {(item.validityLength || item.validityWindow) && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 pt-2 border-t border-zinc-100">
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
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-100 flex justify-between items-center mt-3">
                  <span className="text-[11px] text-zinc-400 font-medium">Standard Cost</span>
                  <span className="text-sm font-bold text-[#14213D] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ₹{item.defaultPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
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

              {/* City Relationship Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Connected City / Cities *
                </label>
                <div className="border border-zinc-200 rounded-lg p-2.5 bg-zinc-50/70 space-y-2">
                  <div className="text-[11px] text-zinc-500 mb-1">
                    Select the relevant city or cities associated with this service/visa:
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-white rounded border border-zinc-200">
                    {cities.map((city) => {
                      const isSelected = formData.cityIds.includes(city.id);
                      return (
                        <button
                          type="button"
                          key={city.id}
                          onClick={() => toggleCitySelection(city.id)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#B8944F] text-white shadow-2xs"
                              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                          <span>{city.name}</span>
                        </button>
                      );
                    })}
                    {cities.length === 0 && (
                      <span className="text-xs text-zinc-400 py-1 px-2">
                        No cities found in Master Data. Please add cities in the Cities & States tab.
                      </span>
                    )}
                  </div>
                </div>
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
