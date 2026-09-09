"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import {
  createMasterFlightRoute,
  updateMasterFlightRoute,
  deleteMasterFlightRoute,
} from "@/actions/master-data";
import { useRouter } from "next/navigation";
import { Pagination } from "./Pagination";
import { executeDeleteWithUndo } from "@/lib/delete-with-undo";

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

const TRANSPORT_TYPES = ["Flight", "Train", "Bus", "Car", "Sedan", "SUV", "Other"];

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
      type: "Car",
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
        alert("Please select both From City and To City for an Inter-City route.");
        return;
      }
      if (!computedSector) {
        computedSector = `${formData.fromCity} to ${formData.toCity}`;
      }
    } else {
      if (!formData.cityName) {
        alert("Please select a City for this Local Transfer.");
        return;
      }
      if (!computedSector) {
        computedSector = `${formData.cityName} Local Transfer`;
      }
    }

    if (!formData.airline.trim()) {
      alert("Please enter a Carrier / Vehicle Provider Name.");
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
        flightCodeDefault: formData.flightCodeDefault.trim() || undefined,
        typicalStops: Number(formData.typicalStops || 0),
        typicalLayoverInfo: formData.typicalLayoverInfo.trim() || undefined,
        cabinBaggageKg: parseInt(formData.cabinBaggageKg) || 7,
        checkInBaggageKg: parseInt(formData.checkInBaggageKg) || 20,
        cancellationPolicy: formData.cancellationPolicy.trim() || undefined,
        flightNotes: formData.flightNotes.trim() || undefined,
        type: formData.type,
        travelTime: formData.travelTime.trim() || undefined,
      };

      if (editingItem) {
        const res = await updateMasterFlightRoute(editingItem.id, payload);
        if (res.success && res.data) {
          setData((prev) =>
            prev.map((f) => (f.id === editingItem.id ? (res.data! as any) : f))
          );
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to update transportation route");
        }
      } else {
        const res = await createMasterFlightRoute(payload);
        if (res.success && res.data) {
          setData((prev) => [(res.data! as any), ...prev]);
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to create transportation route");
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
        return <Bus className="h-3.5 w-3.5 text-[#B8944F] mr-2 shrink-0" />;
      case "Car":
      case "Sedan":
      case "SUV":
        return <Car className="h-3.5 w-3.5 text-[#B8944F] mr-2 shrink-0" />;
      default:
        return <Navigation className="h-3.5 w-3.5 text-[#B8944F] mr-2 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
            Transportation & Routes Catalog
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage Inter-City Transfer routes (paired from-to cities) and Local City Transfers for auto-suggestion into Trip Blueprints.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Transport Option</span>
        </button>
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
            {TRANSPORT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
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
                    <div className="flex items-center space-x-1.5">
                      <Luggage className="h-3 w-3 text-zinc-400" />
                      <span>
                        Cabin: {route.cabinBaggageKg || 7}kg | Checkin: {route.checkInBaggageKg || 20}kg
                      </span>
                    </div>
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
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md"
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
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer"
                  >
                    {TRANSPORT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Carrier & Travel Time */}
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
              </div>

              {/* Baggage & Stops */}
              <div className="grid grid-cols-3 gap-3">
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
              </div>

              {/* Notes & Cancellation */}
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
    </div>
  );
}
