"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Plane,
  Luggage,
  X,
  Loader2,
  Bus,
  Train,
  Car,
  Clock,
  Filter,
  ArrowRight,
  MapPin,
  Compass,
  Navigation,
  Tag,
  Settings,
  Check,
} from "lucide-react";
import {
  createMasterFlightRoute,
  updateMasterFlightRoute,
  deleteMasterFlightRoute,
  getMasterVehicleTypes,
  createMasterVehicleType,
  updateMasterVehicleType,
  deleteMasterVehicleType,
} from "@/actions/master-data";
import { DEFAULT_VEHICLE_TYPES } from "@/lib/master-data-defaults";
import { useRouter } from "next/navigation";
import { Pagination } from "./Pagination";
import { executeDeleteWithUndo } from "@/lib/delete-with-undo";
import toast from "react-hot-toast";

export interface FlightRouteItem {
  id: string;
  transportCategory?: string;
  fromCity?: string | null;
  fromCityId?: string | null;
  toCity?: string | null;
  toCityId?: string | null;
  cityId?: string | null;
  city?: { id: string; name: string; country: string } | null;
  sector: string;
  airline: string;
  flightCodeDefault: string | null;
  typicalStops: number;
  typicalLayoverInfo: string | null;
  cabinBaggageKg: number | null;
  checkInBaggageKg: number | null;
  cancellationPolicy: string | null;
  flightNotes: string | null;
  type: string;
  travelTime: string | null;
  titleTemplateId: string | null;
}

interface CityOption {
  id: string;
  name: string;
  country: string;
}

interface VehicleTypeItem {
  id: string;
  name: string;
  applicableFields: string[];
  isDefault?: boolean;
}

const ALL_POSSIBLE_FIELDS = [
  { key: "flightCodeDefault", label: "Flight / Route Code" },
  { key: "travelTime", label: "Travel Time / Duration" },
  { key: "typicalStops", label: "Stops Count" },
  { key: "typicalLayoverInfo", label: "Layover / Transit Details" },
  { key: "cabinBaggageKg", label: "Cabin Baggage Allowance" },
  { key: "checkInBaggageKg", label: "Check-in Baggage Allowance" },
  { key: "cancellationPolicy", label: "Cancellation Policy" },
  { key: "flightNotes", label: "Transit Notes & Instructions" },
];

export function FlightRoutesTab({
  initialData,
  cities = [],
}: {
  initialData: FlightRouteItem[];
  cities?: CityOption[];
}) {
  const router = useRouter();
  const [data, setData] = useState<FlightRouteItem[]>(initialData);
  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<"All" | "Inter-City Transfer" | "Local Transfer">("All");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FlightRouteItem | null>(null);

  // Dynamic Vehicle Types State
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeItem[]>([]);
  const [vtModalOpen, setVtModalOpen] = useState(false);
  const [newVtName, setNewVtName] = useState("");
  const [newVtFields, setNewVtFields] = useState<string[]>([
    "travelTime",
    "flightNotes",
  ]);
  const [editingVt, setEditingVt] = useState<VehicleTypeItem | null>(null);
  const [vtSaving, setVtSaving] = useState(false);

  const [formData, setFormData] = useState({
    transportCategory: "Inter-City Transfer" as "Inter-City Transfer" | "Local Transfer",
    fromCity: "",
    toCity: "",
    cityName: "",
    sector: "",
    airline: "",
    flightCodeDefault: "",
    typicalStops: 0,
    typicalLayoverInfo: "",
    cabinBaggageKg: "7",
    checkInBaggageKg: "20",
    cancellationPolicy: "",
    flightNotes: "",
    type: "Car",
    travelTime: "08:00 AM",
  });

  const [saving, setSaving] = useState(false);

  // Fetch Vehicle Types
  useEffect(() => {
    async function loadVehicleTypes() {
      const res = await getMasterVehicleTypes();
      if (res.success && res.data) {
        setVehicleTypes(res.data as VehicleTypeItem[]);
      }
    }
    loadVehicleTypes();
  }, []);

  const activeVehicleType = vehicleTypes.find((vt) => vt.name.toLowerCase() === formData.type.toLowerCase()) || {
    id: "default",
    name: formData.type,
    applicableFields: ["travelTime", "flightNotes", "cabinBaggageKg", "checkInBaggageKg", "typicalStops"],
  };

  const isFieldApplicable = (fieldKey: string) => {
    if (!activeVehicleType.applicableFields || activeVehicleType.applicableFields.length === 0) {
      return true;
    }
    return activeVehicleType.applicableFields.includes(fieldKey);
  };

  const filtered = data.filter((f) => {
    const category = f.transportCategory || (f.fromCity && f.toCity ? "Inter-City Transfer" : "Local Transfer");
    const matchesCategory = selectedCategoryFilter === "All" || category === selectedCategoryFilter;

    const matchesSearch =
      f.sector.toLowerCase().includes(search.toLowerCase()) ||
      f.airline.toLowerCase().includes(search.toLowerCase()) ||
      (f.fromCity && f.fromCity.toLowerCase().includes(search.toLowerCase())) ||
      (f.toCity && f.toCity.toLowerCase().includes(search.toLowerCase())) ||
      (f.flightNotes && f.flightNotes.toLowerCase().includes(search.toLowerCase()));

    const matchesType = selectedTypeFilter === "All" || (f.type || "Flight") === selectedTypeFilter;
    return matchesCategory && matchesSearch && matchesType;
  });

  const paginatedData = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const openCreate = () => {
    setEditingItem(null);
    const defaultType = vehicleTypes[0]?.name || "Car";
    setFormData({
      transportCategory: "Inter-City Transfer",
      fromCity: cities[0]?.name || "",
      toCity: cities[1]?.name || "",
      cityName: cities[0]?.name || "",
      sector: cities[0] && cities[1] ? `${cities[0].name} to ${cities[1].name}` : "",
      airline: "Dedicated AC Vehicle",
      flightCodeDefault: "",
      typicalStops: 0,
      typicalLayoverInfo: "Non-stop direct transfer",
      cabinBaggageKg: "7",
      checkInBaggageKg: "20",
      cancellationPolicy: "Partially refundable up to 48 hours prior to departure.",
      flightNotes: "Private chauffeur transfer with toll & parking included.",
      type: defaultType,
      travelTime: "08:00 AM",
    });
    setModalOpen(true);
  };

  const openEdit = (item: FlightRouteItem) => {
    setEditingItem(item);
    const category = (item.transportCategory || (item.fromCity && item.toCity ? "Inter-City Transfer" : "Local Transfer")) as "Inter-City Transfer" | "Local Transfer";
    setFormData({
      transportCategory: category,
      fromCity: item.fromCity || "",
      toCity: item.toCity || "",
      cityName: item.city?.name || item.fromCity || "",
      sector: item.sector,
      airline: item.airline,
      flightCodeDefault: item.flightCodeDefault || "",
      typicalStops: item.typicalStops || 0,
      typicalLayoverInfo: item.typicalLayoverInfo || "",
      cabinBaggageKg: item.cabinBaggageKg?.toString() || "7",
      checkInBaggageKg: item.checkInBaggageKg?.toString() || "20",
      cancellationPolicy: item.cancellationPolicy || "",
      flightNotes: item.flightNotes || "",
      type: item.type || "Car",
      travelTime: item.travelTime || "08:00 AM",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let computedSector = formData.sector.trim();
    if (formData.transportCategory === "Inter-City Transfer") {
      if (!formData.fromCity || !formData.toCity) {
        toast.error("Please select both From City and To City for an Inter-City route.");
        return;
      }
      if (!computedSector) {
        computedSector = `${formData.fromCity} to ${formData.toCity}`;
      }
    } else {
      if (!formData.cityName) {
        toast.error("Please select a City for this Local Transfer.");
        return;
      }
      if (!computedSector) {
        computedSector = `${formData.cityName} Local Transfer`;
      }
    }

    if (!formData.airline.trim()) {
      toast.error("Please enter a Carrier / Vehicle Provider Name.");
      return;
    }

    const matchedCity = cities.find((c) => c.name.toLowerCase() === formData.cityName.toLowerCase());
    const matchedFromCity = cities.find((c) => c.name.toLowerCase() === formData.fromCity.toLowerCase());
    const matchedToCity = cities.find((c) => c.name.toLowerCase() === formData.toCity.toLowerCase());

    setSaving(true);
    try {
      const payload = {
        transportCategory: formData.transportCategory,
        fromCity: formData.transportCategory === "Inter-City Transfer" ? formData.fromCity : undefined,
        fromCityId: formData.transportCategory === "Inter-City Transfer" ? matchedFromCity?.id : undefined,
        toCity: formData.transportCategory === "Inter-City Transfer" ? formData.toCity : undefined,
        toCityId: formData.transportCategory === "Inter-City Transfer" ? matchedToCity?.id : undefined,
        cityId: formData.transportCategory === "Local Transfer" ? matchedCity?.id : undefined,
        sector: computedSector,
        airline: formData.airline.trim(),
        flightCodeDefault: isFieldApplicable("flightCodeDefault") ? (formData.flightCodeDefault.trim() || undefined) : undefined,
        typicalStops: isFieldApplicable("typicalStops") ? Number(formData.typicalStops || 0) : 0,
        typicalLayoverInfo: isFieldApplicable("typicalLayoverInfo") ? (formData.typicalLayoverInfo.trim() || undefined) : undefined,
        cabinBaggageKg: isFieldApplicable("cabinBaggageKg") ? (parseInt(formData.cabinBaggageKg) || 7) : undefined,
        checkInBaggageKg: isFieldApplicable("checkInBaggageKg") ? (parseInt(formData.checkInBaggageKg) || 20) : undefined,
        cancellationPolicy: isFieldApplicable("cancellationPolicy") ? (formData.cancellationPolicy.trim() || undefined) : undefined,
        flightNotes: isFieldApplicable("flightNotes") ? (formData.flightNotes.trim() || undefined) : undefined,
        type: formData.type,
        travelTime: isFieldApplicable("travelTime") ? (formData.travelTime.trim() || undefined) : undefined,
      };

      if (editingItem) {
        const res = await updateMasterFlightRoute(editingItem.id, payload);
        if (res.success && res.data) {
          setData((prev) =>
            prev.map((f) => (f.id === editingItem.id ? (res.data! as any) : f))
          );
          toast.success("Transportation route updated successfully");
          setModalOpen(false);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to update transportation route");
        }
      } else {
        const res = await createMasterFlightRoute(payload);
        if (res.success && res.data) {
          setData((prev) => [(res.data! as any), ...prev]);
          toast.success("Transportation route created successfully");
          setModalOpen(false);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to create transportation route");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (route: FlightRouteItem) => {
    executeDeleteWithUndo<FlightRouteItem>({
      item: route,
      itemType: "Transportation Option",
      itemName: route.sector,
      onOptimisticRemove: (r) => {
        setData((prev) => prev.filter((item) => item.id !== r.id));
      },
      onUndo: (r) => {
        setData((prev) => [r, ...prev.filter((item) => item.id !== r.id)]);
      },
      onPermanentDelete: async (r) => {
        const res = await deleteMasterFlightRoute(r.id);
        if (res.success) {
          router.refresh();
        } else {
          throw new Error(res.error || "Failed to delete route");
        }
      },
    });
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case "Flight":
        return <Plane className="h-3.5 w-3.5 text-[#B8944F] mr-2 shrink-0" />;
      case "Train":
        return <Train className="h-3.5 w-3.5 text-[#B8944F] mr-2 shrink-0" />;
      case "Bus":
      case "Luxury Coach":
        return <Bus className="h-3.5 w-3.5 text-[#B8944F] mr-2 shrink-0" />;
      case "Car":
      case "Sedan":
      case "SUV":
      case "Tempo Traveller":
        return <Car className="h-3.5 w-3.5 text-[#B8944F] mr-2 shrink-0" />;
      default:
        return <Navigation className="h-3.5 w-3.5 text-[#B8944F] mr-2 shrink-0" />;
    }
  };

  const toggleFieldInList = (list: string[], fieldKey: string) => {
    return list.includes(fieldKey) ? list.filter((f) => f !== fieldKey) : [...list, fieldKey];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
            Transportation
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage Inter-City Transfer routes (paired from-to cities) and Local City Transfers with vehicle type field routing.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setVtModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-[#B8944F]/40 hover:bg-zinc-50 text-[#8F6F33] text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Manage Vehicle Types</span>
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Transport Option</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200/90 shadow-2xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedCategoryFilter("All");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategoryFilter === "All"
                ? "bg-[#14213D] text-white shadow-xs"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            All Transfers ({data.length})
          </button>
          <button
            onClick={() => {
              setSelectedCategoryFilter("Inter-City Transfer");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              selectedCategoryFilter === "Inter-City Transfer"
                ? "bg-[#B8944F] text-white shadow-xs"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Inter-City Transfers</span>
          </button>
          <button
            onClick={() => {
              setSelectedCategoryFilter("Local Transfer");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              selectedCategoryFilter === "Local Transfer"
                ? "bg-[#6B7A5E] text-white shadow-xs"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Local City Transfers</span>
          </button>
        </div>

        {/* Type Filter dropdown */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-zinc-400 font-medium hidden sm:inline">Vehicle Type:</span>
          <select
            value={selectedTypeFilter}
            onChange={(e) => {
              setSelectedTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 outline-none cursor-pointer"
          >
            <option value="All">All Types</option>
            {vehicleTypes.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by sector route, carrier/airline, city, or notes..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200/90 rounded-xl text-xs text-[#14213D] placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] shadow-2xs"
        />
      </div>

      {/* Routes List Cards */}
      {paginatedData.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-zinc-200 p-6">
          <p className="text-zinc-500 text-xs font-medium">No transportation records found matching your filters.</p>
          <button
            onClick={openCreate}
            className="mt-3 text-xs font-bold text-[#B8944F] hover:underline"
          >
            + Create your first transport option
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedData.map((route) => {
            const isInterCity = (route.transportCategory || (route.fromCity && route.toCity ? "Inter-City Transfer" : "Local Transfer")) === "Inter-City Transfer";

            return (
              <div
                key={route.id}
                className="bg-white border border-zinc-200/90 hover:border-[#B8944F]/50 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                        isInterCity
                          ? "bg-[#B8944F]/15 text-[#B8944F]"
                          : "bg-[#6B7A5E]/15 text-[#6B7A5E]"
                      }`}
                    >
                      {isInterCity ? "Inter-City Transfer" : "Local Transfer"}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full flex items-center">
                      {getTransportIcon(route.type || "Flight")}
                      {route.type || "Flight"}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#14213D] font-fraunces flex items-center gap-1.5 mb-1">
                    {isInterCity && route.fromCity && route.toCity ? (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span>{route.fromCity}</span>
                        <ArrowRight className="h-3 w-3 text-[#B8944F]" />
                        <span>{route.toCity}</span>
                      </span>
                    ) : (
                      <span>{route.sector}</span>
                    )}
                  </h3>

                  <div className="text-xs text-zinc-600 font-semibold mb-2">
                    Carrier / Operator: <span className="text-[#14213D]">{route.airline}</span>
                    {route.flightCodeDefault && (
                      <span className="ml-2 font-mono text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-500">
                        {route.flightCodeDefault}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 py-2 border-t border-zinc-100">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="h-3 w-3 text-zinc-400" />
                      <span>{route.travelTime || "Anytime"}</span>
                    </div>
                    {(route.cabinBaggageKg != null || route.checkInBaggageKg != null) ? (
                      <div className="flex items-center space-x-1.5">
                        <Luggage className="h-3 w-3 text-zinc-400" />
                        <span>
                          Cabin: {route.cabinBaggageKg ?? 7}kg | Checkin: {route.checkInBaggageKg ?? 20}kg
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5">
                        <Car className="h-3 w-3 text-zinc-400" />
                        <span>Private Chauffeur Service</span>
                      </div>
                    )}
                  </div>

                  {route.flightNotes && (
                    <p className="text-[11px] text-zinc-500 italic line-clamp-2 mt-1">
                      "{route.flightNotes}"
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => openEdit(route)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-[#14213D] hover:bg-zinc-100 transition-colors"
                    title="Edit Option"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(route)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete Option"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces">
                {editingItem ? "Edit Transportation Option" : "Add New Transport Option"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Radio Toggle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Transport Category *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transportCategory: "Inter-City Transfer" })}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      formData.transportCategory === "Inter-City Transfer"
                        ? "border-[#B8944F] bg-[#B8944F]/10 text-[#14213D] font-bold"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-white"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Compass className="h-3.5 w-3.5 text-[#B8944F]" />
                      <span>Inter-City Transfer</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-normal mt-0.5">
                      Connects 2 distinct cities (From City &rarr; To City).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transportCategory: "Local Transfer" })}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      formData.transportCategory === "Local Transfer"
                        ? "border-[#6B7A5E] bg-[#6B7A5E]/10 text-[#14213D] font-bold"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-white"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#6B7A5E]" />
                      <span>Local City Transfer</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-normal mt-0.5">
                      Scoped to a single city (e.g. station &rarr; hotel).
                    </p>
                  </button>
                </div>
              </div>

              {/* Dynamic City Linkings */}
              {formData.transportCategory === "Inter-City Transfer" ? (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-700">
                      From City *
                    </label>
                    <select
                      value={formData.fromCity}
                      onChange={(e) => {
                        const from = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          fromCity: from,
                          sector: from && prev.toCity ? `${from} to ${prev.toCity}` : prev.sector,
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-medium outline-none cursor-pointer"
                    >
                      <option value="">-- Select Departure City --</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} ({c.country})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-700">
                      To City *
                    </label>
                    <select
                      value={formData.toCity}
                      onChange={(e) => {
                        const to = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          toCity: to,
                          sector: prev.fromCity && to ? `${prev.fromCity} to ${to}` : prev.sector,
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-medium outline-none cursor-pointer"
                    >
                      <option value="">-- Select Destination City --</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} ({c.country})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-xl space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    City Location *
                  </label>
                  <select
                    value={formData.cityName}
                    onChange={(e) => {
                      const cityName = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        cityName: cityName,
                        sector: cityName ? `${cityName} Station / Hotel Transfer` : prev.sector,
                      }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-medium outline-none cursor-pointer"
                  >
                    <option value="">-- Select City Location --</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.country})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sector Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Route / Transfer Label *
                  </label>
                  <input
                    type="text"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    placeholder="e.g. Ahmedabad to Udaipur"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Vehicle / Transit Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer font-semibold"
                  >
                    {vehicleTypes.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Carrier & Route Code (Conditional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Carrier / Provider Name *
                  </label>
                  <input
                    type="text"
                    value={formData.airline}
                    onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                    placeholder="e.g. Dedicated AC Sedan / IndiGo"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                    required
                  />
                </div>

                {isFieldApplicable("flightCodeDefault") && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-700">
                      Route / Flight / Train Code
                    </label>
                    <input
                      type="text"
                      value={formData.flightCodeDefault}
                      onChange={(e) => setFormData({ ...formData, flightCodeDefault: e.target.value })}
                      placeholder="e.g. 6E-2041 or 12952"
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Preferred Travel Time (Conditional) */}
              {isFieldApplicable("travelTime") && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Preferred Travel Time / Duration
                  </label>
                  <input
                    type="text"
                    value={formData.travelTime}
                    onChange={(e) => setFormData({ ...formData, travelTime: e.target.value })}
                    placeholder="e.g. 08:00 AM or 4h 30m"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                </div>
              )}

              {/* Baggage Allowances & Stops (Dynamic based on selected Vehicle Type) */}
              {(isFieldApplicable("cabinBaggageKg") || isFieldApplicable("checkInBaggageKg") || isFieldApplicable("typicalStops")) && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl">
                  {isFieldApplicable("cabinBaggageKg") && (
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-700">
                        Cabin Baggage (kg)
                      </label>
                      <input
                        type="number"
                        value={formData.cabinBaggageKg}
                        onChange={(e) => setFormData({ ...formData, cabinBaggageKg: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                      />
                    </div>
                  )}
                  {isFieldApplicable("checkInBaggageKg") && (
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-700">
                        Check-in (kg)
                      </label>
                      <input
                        type="number"
                        value={formData.checkInBaggageKg}
                        onChange={(e) => setFormData({ ...formData, checkInBaggageKg: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                      />
                    </div>
                  )}
                  {isFieldApplicable("typicalStops") && (
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-700">
                        Stops Count
                      </label>
                      <input
                        type="number"
                        value={formData.typicalStops}
                        onChange={(e) => setFormData({ ...formData, typicalStops: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Layover Info (Conditional) */}
              {isFieldApplicable("typicalLayoverInfo") && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Layover & Transit Information
                  </label>
                  <input
                    type="text"
                    value={formData.typicalLayoverInfo}
                    onChange={(e) => setFormData({ ...formData, typicalLayoverInfo: e.target.value })}
                    placeholder="e.g. 2h 15m layover at Mumbai Airport (BOM)"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                </div>
              )}

              {/* Cancellation Policy (Conditional) */}
              {isFieldApplicable("cancellationPolicy") && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Cancellation & Rescheduling Policy
                  </label>
                  <input
                    type="text"
                    value={formData.cancellationPolicy}
                    onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                    placeholder="e.g. Partially refundable up to 48 hours prior to departure."
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                </div>
              )}

              {/* Notes (Conditional) */}
              {isFieldApplicable("flightNotes") && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Route Notes & Transit Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={formData.flightNotes}
                    onChange={(e) => setFormData({ ...formData, flightNotes: e.target.value })}
                    placeholder="e.g. Dedicated chauffeur assigned. Toll, driver allowances and parking included."
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none resize-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingItem ? "Update Transport" : "Create Transport"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VEHICLE TYPES MANAGEMENT MODAL */}
      {vtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#B8944F]" />
                <span>Manage Vehicle Types & Field Config</span>
              </h3>
              <button
                onClick={() => {
                  setVtModalOpen(false);
                  setEditingVt(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Create or Edit Vehicle Type Form */}
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
              <h4 className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                {editingVt ? `Edit Vehicle Type: ${editingVt.name}` : "Add New Vehicle Type"}
              </h4>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-700">Vehicle Type Name *</label>
                <input
                  type="text"
                  value={editingVt ? editingVt.name : newVtName}
                  onChange={(e) => {
                    if (editingVt) {
                      setEditingVt({ ...editingVt, name: e.target.value });
                    } else {
                      setNewVtName(e.target.value);
                    }
                  }}
                  placeholder="e.g. Electric Sedan, Speedboat, Helicopter..."
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#B8944F]"
                />
              </div>

              {/* Related Vehicle Type Fields Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  Related Vehicle Type Fields (Applicable Fields)
                </label>
                <p className="text-[11px] text-zinc-500">
                  Select which form fields will be enabled when creating routes with this vehicle type:
                </p>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {ALL_POSSIBLE_FIELDS.map((field) => {
                    const currentFields = editingVt ? editingVt.applicableFields : newVtFields;
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
                            if (editingVt) {
                              setEditingVt({
                                ...editingVt,
                                applicableFields: toggleFieldInList(editingVt.applicableFields, field.key),
                              });
                            } else {
                              setNewVtFields(toggleFieldInList(newVtFields, field.key));
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
                {editingVt && (
                  <button
                    type="button"
                    onClick={() => setEditingVt(null)}
                    className="px-3 py-1.5 border border-zinc-200 text-zinc-600 rounded-lg text-xs font-semibold hover:bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  disabled={vtSaving || (editingVt ? !editingVt.name.trim() : !newVtName.trim())}
                  onClick={async () => {
                    setVtSaving(true);
                    try {
                      if (editingVt) {
                        const res = await updateMasterVehicleType(
                          editingVt.id,
                          editingVt.name,
                          editingVt.applicableFields
                        );
                        if (res.success && res.data) {
                          setVehicleTypes((prev) =>
                            prev.map((vt) => (vt.id === editingVt.id ? (res.data! as any) : vt))
                          );
                          toast.success(`Vehicle type "${editingVt.name}" updated successfully`);
                          setEditingVt(null);
                        } else {
                          toast.error(res.error || "Failed to update vehicle type");
                        }
                      } else {
                        const targetName = newVtName.trim();
                        const res = await createMasterVehicleType(targetName, newVtFields);
                        if (res.success && res.data) {
                          setVehicleTypes((prev) => [...prev, res.data! as any]);
                          setNewVtName("");
                          setNewVtFields(["travelTime", "flightNotes"]);
                          toast.success(`Vehicle type "${targetName}" added successfully`);
                        } else {
                          toast.error(res.error || "Failed to create vehicle type");
                        }
                      }
                    } finally {
                      setVtSaving(false);
                    }
                  }}
                  className="px-4 py-1.5 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-1"
                >
                  {vtSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>{editingVt ? "Save Vehicle Type" : "Add Vehicle Type"}</span>
                </button>
              </div>
            </div>

            {/* Vehicle Types Catalog List */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Configured Vehicle Types ({vehicleTypes.length})
              </label>
              <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-100 max-h-56 overflow-y-auto">
                {vehicleTypes.map((vt) => (
                  <div key={vt.id} className="p-3 flex items-start justify-between gap-2 hover:bg-zinc-50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-[#14213D]">{vt.name}</span>
                        {vt.isDefault && (
                          <span className="text-[10px] bg-zinc-100 text-zinc-500 font-semibold px-1.5 py-0.2 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {vt.applicableFields?.map((f) => {
                          const matched = ALL_POSSIBLE_FIELDS.find((p) => p.key === f);
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
                        onClick={() => setEditingVt(vt)}
                        className="p-1 text-zinc-400 hover:text-[#B8944F] rounded cursor-pointer"
                        title="Edit Vehicle Type"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          executeDeleteWithUndo<VehicleTypeItem>({
                            item: vt,
                            itemType: "Vehicle Type",
                            itemName: vt.name,
                            onOptimisticRemove: (item) => {
                              setVehicleTypes((prev) => prev.filter((v) => v.id !== item.id));
                            },
                            onUndo: (item) => {
                              setVehicleTypes((prev) => [item, ...prev.filter((v) => v.id !== item.id)]);
                            },
                            onPermanentDelete: async (item) => {
                              const res = await deleteMasterVehicleType(item.id);
                              if (!res.success) {
                                throw new Error(res.error || "Failed to delete vehicle type");
                              }
                            },
                          });
                        }}
                        className="p-1 text-zinc-400 hover:text-red-600 rounded cursor-pointer"
                        title="Delete Vehicle Type"
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
                  setVtModalOpen(false);
                  setEditingVt(null);
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

