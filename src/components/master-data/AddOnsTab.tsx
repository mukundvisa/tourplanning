"use client";

import React, { useState, useEffect } from "react";
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
  Tag,
  Settings,
} from "lucide-react";
import {
  createMasterAddOn,
  updateMasterAddOn,
  deleteMasterAddOn,
  getMasterAddOnCategories,
  createMasterAddOnCategory,
  updateMasterAddOnCategory,
  deleteMasterAddOnCategory,
} from "@/actions/master-data";
import { DEFAULT_ADDON_CATEGORIES } from "@/lib/master-data-defaults";
import { useRouter } from "next/navigation";
import { Pagination } from "./Pagination";
import { executeDeleteWithUndo } from "@/lib/delete-with-undo";
import toast from "react-hot-toast";

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

interface AddOnCategoryItem {
  id: string;
  name: string;
  applicableFields: string[];
  isDefault?: boolean;
}

const ALL_ADDON_FIELDS = [
  { key: "visaType", label: "Visa / Package Subtype" },
  { key: "validityLength", label: "Stay Validity" },
  { key: "validityWindow", label: "Window / Expiry" },
  { key: "detailsDescription", label: "Description / Inclusions" },
  { key: "defaultPrice", label: "Default Cost (₹)" },
  { key: "cityId", label: "Connected City / Destination" },
];

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

  // Dynamic Addon Categories State
  const [categories, setCategories] = useState<AddOnCategoryItem[]>([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatFields, setNewCatFields] = useState<string[]>([
    "detailsDescription",
    "defaultPrice",
    "cityId",
  ]);
  const [editingCat, setEditingCat] = useState<AddOnCategoryItem | null>(null);
  const [catSaving, setCatSaving] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    type: string;
    cityId: string;
    visaType: string;
    validityLength: string;
    validityWindow: string;
    defaultPrice: string;
    detailsDescription: string;
  }>({
    name: "",
    type: "Visa",
    cityId: "",
    visaType: "",
    validityLength: "",
    validityWindow: "",
    defaultPrice: "3500",
    detailsDescription: "",
  });

  const [saving, setSaving] = useState(false);

  // Fetch Addon Categories
  useEffect(() => {
    async function loadCategories() {
      const res = await getMasterAddOnCategories();
      if (res.success && res.data) {
        setCategories(res.data as AddOnCategoryItem[]);
      }
    }
    loadCategories();
  }, []);

  const activeCategory = categories.find((c) => c.name.toLowerCase() === formData.type.toLowerCase()) || {
    id: "default",
    name: formData.type,
    applicableFields: ["visaType", "validityLength", "validityWindow", "detailsDescription", "defaultPrice", "cityId"],
  };

  const isFieldApplicable = (fieldKey: string) => {
    if (!activeCategory.applicableFields || activeCategory.applicableFields.length === 0) {
      return true;
    }
    return activeCategory.applicableFields.includes(fieldKey);
  };

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
    const defaultCityId = selectedCityId !== "All" ? selectedCityId : "";
    const defaultType = categories[0]?.name || "Visa";
    setFormData({
      name: "",
      type: selectedType !== "All" ? selectedType : defaultType,
      cityId: defaultCityId,
      visaType: defaultType === "Visa" ? "Tourist E-Visa (Single Entry)" : "",
      validityLength: defaultType === "Visa" ? "30 Days" : "",
      validityWindow: defaultType === "Visa" ? "90 Days from issue" : "",
      defaultPrice: "3500",
      detailsDescription: "Fast-track processing with dedicated customer support.",
    });
    setModalOpen(true);
  };

  const openEdit = (item: AddOnItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type || "Visa",
      cityId: item.cityId || (item.cityIds && item.cityIds[0]) || "",
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
        cityId: isFieldApplicable("cityId") ? (formData.cityId || undefined) : undefined,
        cityIds: isFieldApplicable("cityId") && formData.cityId ? [formData.cityId] : [],
        visaType: isFieldApplicable("visaType") ? (formData.visaType || undefined) : undefined,
        validityLength: isFieldApplicable("validityLength") ? (formData.validityLength || undefined) : undefined,
        validityWindow: isFieldApplicable("validityWindow") ? (formData.validityWindow || undefined) : undefined,
        defaultPrice: isFieldApplicable("defaultPrice") ? (parseFloat(formData.defaultPrice) || 0) : 0,
        detailsDescription: isFieldApplicable("detailsDescription") ? (formData.detailsDescription || undefined) : undefined,
      };

      if (editingItem) {
        const res = await updateMasterAddOn(editingItem.id, payload);
        if (res.success && res.data) {
          const updated = {
            ...res.data,
            city: cities.find((c) => c.id === (res.data as any).cityId) || null,
          };
          setData((prev) =>
            prev.map((a) => (a.id === editingItem.id ? (updated as any) : a))
          );
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to update add-on");
        }
      } else {
        const res = await createMasterAddOn(payload);
        if (res.success && res.data) {
          const created = {
            ...res.data,
            city: cities.find((c) => c.id === (res.data as any).cityId) || null,
          };
          setData((prev) => [created as any, ...prev]);
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
      case "SIM Card":
        return <Smartphone className="h-4 w-4 text-purple-600" />;
      case "Activity":
      case "Special Experience":
      case "Cruises & Water Sports":
        return <Sparkles className="h-4 w-4 text-[#B8944F]" />;
      default:
        return <Layers className="h-4 w-4 text-zinc-500" />;
    }
  };

  const getCityNamesForCard = (item: AddOnItem) => {
    if (item.city?.name) return item.city.name;
    if (item.cityId) {
      const matched = cities.find((c) => c.id === item.cityId);
      if (matched) return matched.name;
    }
    if (item.cityIds && item.cityIds.length > 0) {
      const matched = cities.filter((c) => item.cityIds?.includes(c.id)).map((c) => c.name);
      if (matched.length > 0) return matched.join(", ");
    }
    return "All Cities / Universal";
  };

  const toggleFieldInList = (list: string[], fieldKey: string) => {
    return list.includes(fieldKey) ? list.filter((f) => f !== fieldKey) : [...list, fieldKey];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
            Add-ons
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCatModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-[#B8944F]/40 hover:bg-zinc-50 text-[#8F6F33] text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Manage Add-on Categories</span>
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Master Add-on</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* City Filter Dropdown */}
        <div className="relative min-w-[220px] w-full sm:w-64 shrink-0">
          <MapPin className="h-4 w-4 text-[#B8944F] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedCityId}
            onChange={(e) => handleCityFilterChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none cursor-pointer shadow-2xs"
          >
            <option value="All">📍 All Cities ({data.length} Add-ons)</option>
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

        {/* Big Width Search Bar */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search add-ons by package name, city, or description..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] shadow-2xs"
          />
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
                {editingItem ? "Edit Add-on / Package" : "Add Master Add-on"}
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

              {/* Category Selection */}
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
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {isFieldApplicable("defaultPrice") && (
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
                )}
              </div>

              {/* Clean Connected City Select Dropdown (Replacing old checkboxes) */}
              {isFieldApplicable("cityId") && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Connected City / Destination
                  </label>
                  <select
                    value={formData.cityId}
                    onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none bg-white cursor-pointer"
                  >
                    <option value="">-- Universal / All Cities --</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name} {city.country ? `(${city.country})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Select a specific city to prioritize this add-on in day itineraries, or leave as Universal.
                  </p>
                </div>
              )}

              {isFieldApplicable("visaType") && (
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
              )}

              {(isFieldApplicable("validityLength") || isFieldApplicable("validityWindow")) && (
                <div className="grid grid-cols-2 gap-3">
                  {isFieldApplicable("validityLength") && (
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
                  )}

                  {isFieldApplicable("validityWindow") && (
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
                  )}
                </div>
              )}

              {isFieldApplicable("detailsDescription") && (
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
                  {editingItem ? "Update Package" : "Save Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MANAGEMENT MODAL */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#B8944F]" />
                <span>Manage Add-on Categories & Fields</span>
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

            {/* Create or Edit Category Form */}
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
              <h4 className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                {editingCat ? `Edit Category: ${editingCat.name}` : "Create New Add-on Category"}
              </h4>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-700">Category Name *</label>
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
                  placeholder="e.g. Sightseeing Pass, Cruise, Luxury Upgrade..."
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#B8944F]"
                />
              </div>

              {/* Related Fields Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  Applicable Fields for this Category
                </label>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {ALL_ADDON_FIELDS.map((field) => {
                    const currentFields = editingCat ? editingCat.applicableFields : newCatFields;
                    const isSelected = currentFields.includes(field.key);
                    return (
                      <label
                        key={field.key}
                        className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          isSelected
                            ? "bg-[#B8944F]/10 border-[#B8944F] font-bold text-[#14213D]"
                            : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (editingCat) {
                              setEditingCat({
                                ...editingCat,
                                applicableFields: toggleFieldInList(editingCat.applicableFields, field.key),
                              });
                            } else {
                              setNewCatFields(toggleFieldInList(newCatFields, field.key));
                            }
                          }}
                          className="h-3.5 w-3.5 rounded text-[#B8944F] focus:ring-[#B8944F] border-zinc-300"
                        />
                        <span className="truncate">{field.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                {editingCat && (
                  <button
                    type="button"
                    onClick={() => setEditingCat(null)}
                    className="px-3 py-1.5 border border-zinc-200 text-zinc-600 rounded-lg text-xs font-semibold hover:bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  disabled={catSaving || (editingCat ? !editingCat.name.trim() : !newCatName.trim())}
                  onClick={async () => {
                    setCatSaving(true);
                    try {
                      if (editingCat) {
                        const res = await updateMasterAddOnCategory(
                          editingCat.id,
                          editingCat.name,
                          editingCat.applicableFields
                        );
                        if (res.success && res.data) {
                          setCategories((prev) =>
                            prev.map((c) => (c.id === editingCat.id ? (res.data! as any) : c))
                          );
                          toast.success(`Category "${editingCat.name}" updated`);
                          setEditingCat(null);
                        } else {
                          toast.error(res.error || "Failed to update addon category");
                        }
                      } else {
                        const targetName = newCatName.trim();
                        const res = await createMasterAddOnCategory(targetName, newCatFields);
                        if (res.success && res.data) {
                          setCategories((prev) => [...prev, res.data! as any]);
                          setNewCatName("");
                          setNewCatFields(["defaultPrice", "detailsDescription"]);
                          toast.success(`Category "${targetName}" created`);
                        } else {
                          toast.error(res.error || "Failed to create addon category");
                        }
                      }
                    } finally {
                      setCatSaving(false);
                    }
                  }}
                  className="px-4 py-1.5 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-1"
                >
                  {catSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>{editingCat ? "Save Category" : "Add Category"}</span>
                </button>
              </div>
            </div>

            {/* Categories List */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Configured Add-on Categories ({categories.length})
              </label>
              <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-100 max-h-56 overflow-y-auto">
                {categories.map((cat) => (
                  <div key={cat.id} className="p-3 flex items-start justify-between gap-2 hover:bg-zinc-50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-[#14213D]">{cat.name}</span>
                        {cat.isDefault && (
                          <span className="text-[10px] bg-zinc-100 text-zinc-500 font-semibold px-1.5 py-0.2 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cat.applicableFields?.map((f) => {
                          const matched = ALL_ADDON_FIELDS.find((p) => p.key === f);
                          return (
                            <span
                              key={f}
                              className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/70 px-1.5 py-0.2 rounded"
                            >
                              {matched ? matched.label : f}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingCat(cat)}
                        className="p-1 text-zinc-400 hover:text-[#B8944F] rounded cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          executeDeleteWithUndo<AddOnCategoryItem>({
                            item: cat,
                            itemType: "Add-on Category",
                            itemName: cat.name,
                            onOptimisticRemove: (item) => {
                              setCategories((prev) => prev.filter((c) => c.id !== item.id));
                            },
                            onUndo: (item) => {
                              setCategories((prev) => [item, ...prev.filter((c) => c.id !== item.id)]);
                            },
                            onPermanentDelete: async (item) => {
                              const res = await deleteMasterAddOnCategory(item.id);
                              if (!res.success) {
                                throw new Error(res.error || "Failed to delete category");
                              }
                            },
                          });
                        }}
                        className="p-1 text-zinc-400 hover:text-red-600 rounded cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-100">
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

