"use client";

import React, { useState } from "react";
import { Plus, Search, Edit2, Trash2, Plane, Luggage, X, Loader2, Bus, Train, Car, Clock } from "lucide-react";
import {
  createMasterFlightRoute,
  updateMasterFlightRoute,
  deleteMasterFlightRoute,
} from "@/actions/master-data";
import { useRouter } from "next/navigation";

interface FlightRouteItem {
  id: string;
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

const TRANSPORT_TYPES = ["Flight", "Train", "Bus", "Car", "Sedan", "SUV", "Other"];

export function FlightRoutesTab({
  initialData,
  titleTemplates = [],
}: {
  initialData: FlightRouteItem[];
  titleTemplates?: any[];
}) {
  const router = useRouter();
  const [data, setData] = useState<FlightRouteItem[]>(initialData);
  const [search, setSearch] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FlightRouteItem | null>(null);

  const [formData, setFormData] = useState({
    sector: "",
    airline: "",
    flightCodeDefault: "",
    typicalStops: 0,
    typicalLayoverInfo: "",
    cabinBaggageKg: "7",
    checkInBaggageKg: "20",
    cancellationPolicy: "",
    flightNotes: "",
    type: "Flight",
    travelTime: "12:00 PM",
    titleTemplateId: "",
  });

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = data.filter((f) => {
    const matchesSearch =
      f.sector.toLowerCase().includes(search.toLowerCase()) ||
      f.airline.toLowerCase().includes(search.toLowerCase()) ||
      (f.flightNotes && f.flightNotes.toLowerCase().includes(search.toLowerCase()));
    
    const matchesType = selectedTypeFilter === "All" || (f.type || "Flight") === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  const openCreate = () => {
    setEditingItem(null);
    setFormData({
      sector: "",
      airline: "",
      flightCodeDefault: "",
      typicalStops: 0,
      typicalLayoverInfo: "Non-stop direct transit",
      cabinBaggageKg: "7",
      checkInBaggageKg: "20",
      cancellationPolicy: "Standard cancellation rules apply.",
      flightNotes: "",
      type: selectedTypeFilter !== "All" ? selectedTypeFilter : "Flight",
      travelTime: "08:00 PM",
      titleTemplateId: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item: FlightRouteItem) => {
    setEditingItem(item);
    setFormData({
      sector: item.sector,
      airline: item.airline,
      flightCodeDefault: item.flightCodeDefault || "",
      typicalStops: item.typicalStops,
      typicalLayoverInfo: item.typicalLayoverInfo || "",
      cabinBaggageKg: item.cabinBaggageKg?.toString() || "7",
      checkInBaggageKg: item.checkInBaggageKg?.toString() || "20",
      cancellationPolicy: item.cancellationPolicy || "",
      flightNotes: item.flightNotes || "",
      type: item.type || "Flight",
      travelTime: item.travelTime || "12:00 PM",
      titleTemplateId: item.titleTemplateId || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sector || !formData.airline) return;
    setSaving(true);
    try {
      const payload = {
        sector: formData.sector,
        airline: formData.airline,
        flightCodeDefault: formData.flightCodeDefault || undefined,
        typicalStops: Number(formData.typicalStops),
        typicalLayoverInfo: formData.typicalLayoverInfo || undefined,
        cabinBaggageKg: parseInt(formData.cabinBaggageKg) || 7,
        checkInBaggageKg: parseInt(formData.checkInBaggageKg) || 20,
        cancellationPolicy: formData.cancellationPolicy || undefined,
        flightNotes: formData.flightNotes || undefined,
        type: formData.type,
        travelTime: formData.travelTime || undefined,
        titleTemplateId: formData.titleTemplateId || undefined,
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

  const handleDelete = async (id: string, sector: string) => {
    if (!confirm(`Are you sure you want to delete route "${sector}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteMasterFlightRoute(id);
      if (res.success) {
        setData((prev) => prev.filter((f) => f.id !== id));
        router.refresh();
      } else {
        alert(res.error || "Failed to delete route");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case "Flight":
        return <Plane className="h-3.5 w-3.5 text-[#B8944F] mr-2" />;
      case "Train":
        return <Train className="h-3.5 w-3.5 text-[#B8944F] mr-2" />;
      case "Bus":
        return <Bus className="h-3.5 w-3.5 text-[#B8944F] mr-2" />;
      case "Car":
      case "Sedan":
      case "SUV":
        return <Car className="h-3.5 w-3.5 text-[#B8944F] mr-2" />;
      default:
        return <Car className="h-3.5 w-3.5 text-[#B8944F] mr-2" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
            Transportation & Routes Catalog
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure Flights, Trains, Buses, and Cars with preferred travel timings for automatic proposal suggestions.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Route Option</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-1">
        <button
          onClick={() => setSelectedTypeFilter("All")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedTypeFilter === "All"
              ? "bg-[#B8944F] text-white shadow-sm"
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          All
        </button>
        {TRANSPORT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedTypeFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedTypeFilter === type
                ? "bg-[#B8944F] text-white shadow-sm"
                : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search routes by sector, provider, or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F]"
        />
      </div>

      <div className="bg-white border border-[#B8944F]/20 rounded-lg overflow-hidden craft-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-zinc-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Type & Sector</th>
                <th className="py-3 px-4">Carrier / Provider</th>
                <th className="py-3 px-4">Travel Time & Transit</th>
                <th className="py-3 px-4">Allowances / Layovers</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400 text-xs">
                    No transportation options found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((route) => (
                  <tr key={route.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#14213D] flex items-center">
                      {getTransportIcon(route.type || "Flight")}
                      <div className="flex flex-col">
                        <span>{route.sector}</span>
                        <span className="text-[10px] text-zinc-400 font-normal capitalize">Type: {route.type || "Flight"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-700">
                      {route.airline} {route.flightCodeDefault ? `(${route.flightCodeDefault})` : ""}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      <div className="flex items-center space-x-1.5 font-bold text-[#B8944F]">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{route.travelTime || "Any Time"}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {route.typicalStops === 0 ? "Non-stop" : `${route.typicalStops} Stop(s)`}
                        {route.typicalLayoverInfo ? ` • ${route.typicalLayoverInfo}` : ""}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      {(route.type === "Flight" || !route.type) ? (
                        <div className="flex items-center space-x-2 text-[11px]">
                          <span className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono">
                            Cabin: {route.cabinBaggageKg || 7}
                          </span>
                          <span className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono">
                            Cargo: {route.checkInBaggageKg || 20}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-[10px]">No Baggage Limit</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => openEdit(route)}
                          className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-[#B8944F] cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(route.id, route.sector)}
                          disabled={deletingId === route.id}
                          className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 cursor-pointer"
                        >
                          {deletingId === route.id ? (
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
                {editingItem ? "Edit Route Option" : "Add Route Option"}
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
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Transportation Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none bg-white cursor-pointer"
                  >
                    {TRANSPORT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Associated Title Template
                  </label>
                  <select
                    value={formData.titleTemplateId}
                    onChange={(e) => setFormData({ ...formData, titleTemplateId: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none bg-white cursor-pointer"
                  >
                    <option value="">No Template Association</option>
                    {titleTemplates.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Preferred Travel Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.travelTime}
                    onChange={(e) => setFormData({ ...formData, travelTime: e.target.value })}
                    placeholder="e.g. 08:00 PM or 09:30 AM"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Route Sector * (e.g. Vadodara to Ahmedabad, or Ahmedabad to Udaipur)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    placeholder="e.g. Vadodara to Ahmedabad"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Carrier / Provider Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.airline}
                    onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                    placeholder="e.g. Indian Railways, GSRTC, Private Sedan"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Route / Vehicle Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.flightCodeDefault}
                    onChange={(e) =>
                      setFormData({ ...formData, flightCodeDefault: e.target.value })
                    }
                    placeholder="e.g. Train No, Flight No, Plate No"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Number of Stops / Layover Points
                  </label>
                  <select
                    value={formData.typicalStops}
                    onChange={(e) =>
                      setFormData({ ...formData, typicalStops: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none bg-white"
                  >
                    <option value={0}>0 (Non-stop direct)</option>
                    <option value={1}>1 Stop Layover</option>
                    <option value={2}>2 Stops</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Transit Details (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.typicalLayoverInfo}
                    onChange={(e) =>
                      setFormData({ ...formData, typicalLayoverInfo: e.target.value })
                    }
                    placeholder="e.g. via Himmatnagar, or 2h at BOM"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                {formData.type === "Flight" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Cabin Baggage (KG)
                      </label>
                      <input
                        type="number"
                        value={formData.cabinBaggageKg}
                        onChange={(e) =>
                          setFormData({ ...formData, cabinBaggageKg: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Check-in Baggage (KG)
                      </label>
                      <input
                        type="number"
                        value={formData.checkInBaggageKg}
                        onChange={(e) =>
                          setFormData({ ...formData, checkInBaggageKg: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Cancellation / Advisory Policy
                  </label>
                  <input
                    type="text"
                    value={formData.cancellationPolicy}
                    onChange={(e) =>
                      setFormData({ ...formData, cancellationPolicy: e.target.value })
                    }
                    placeholder="e.g. Free cancellation up to 24h before departure."
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Route Notes & Advisory
                  </label>
                  <textarea
                    rows={2}
                    value={formData.flightNotes}
                    onChange={(e) =>
                      setFormData({ ...formData, flightNotes: e.target.value })
                    }
                    placeholder="e.g. Recommended for night transit to Udaipur."
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
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
                  {editingItem ? "Update Route" : "Save Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
