"use client";

import React, { useState } from "react";
import {
  Calculator,
  ShieldAlert,
  Search,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  TrendingUp,
  X,
  Loader2,
  DollarSign,
} from "lucide-react";
import { saveTripCostCalculation, createMasterCostRate, deleteMasterCostRate } from "@/actions/master-data";
import { useRouter } from "next/navigation";

interface TripCostItem {
  id: string;
  title: string;
  destination: string;
  numTravellers: number;
  durationDays: number;
  customerRevenue: number;
  internalCost: number;
  netProfit: number;
  marginPercentage: number;
  hasCalculation: boolean;
  lineItems: any;
}

interface CostRateItem {
  id: string;
  category: string;
  label: string;
  defaultRate: number;
  unit: string;
  notes: string | null;
}

interface AdminCostCalculationTabProps {
  trips: TripCostItem[];
  costRates: CostRateItem[];
}

export function AdminCostCalculationTab({
  trips: initialTrips,
  costRates: initialRates,
}: AdminCostCalculationTabProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<TripCostItem[]>(initialTrips);
  const [rates, setRates] = useState<CostRateItem[]>(initialRates);
  const [search, setSearch] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<TripCostItem | null>(null);

  // Active Cost Sheet state for the selected trip
  const [costItems, setCostItems] = useState<
    { id: string; category: string; label: string; rate: number; quantity: number; unit: string; totalCost: number; notes: string }[]
  >([]);
  const [revenueOverride, setRevenueOverride] = useState<number>(0);
  const [savingCost, setSavingCost] = useState(false);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [newRateForm, setNewRateForm] = useState({
    category: "Hotel",
    label: "",
    defaultRate: "5000",
    unit: "per night",
    notes: "",
  });

  const filteredTrips = trips.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase())
  );

  const openCostSheet = (trip: TripCostItem) => {
    setSelectedTrip(trip);
    setRevenueOverride(trip.customerRevenue || 0);

    let parsedItems: any[] = [];
    try {
      parsedItems = typeof trip.lineItems === "string" ? JSON.parse(trip.lineItems) : trip.lineItems || [];
    } catch (e) {}

    if (parsedItems.length > 0) {
      setCostItems(parsedItems);
    } else {
      // Default baseline line item
      setCostItems([
        {
          id: "item-1",
          category: "Hotel",
          label: "Contracted Hotel Wholesale (4 Nights)",
          rate: 7500,
          quantity: trip.durationDays > 1 ? trip.durationDays - 1 : 1,
          unit: "per night",
          totalCost: 7500 * (trip.durationDays > 1 ? trip.durationDays - 1 : 1),
          notes: "Wholesale contracted rate",
        },
        {
          id: "item-2",
          category: "Transport",
          label: "Chauffeur & AC Coach (Full Itinerary)",
          rate: 3000,
          quantity: trip.durationDays,
          unit: "per day",
          totalCost: 3000 * trip.durationDays,
          notes: "Dedicated coach with fuel",
        },
      ]);
    }
  };

  const addLineItemFromRate = (rate: CostRateItem) => {
    const defaultQty = 1;
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category: rate.category,
      label: rate.label,
      rate: rate.defaultRate,
      quantity: defaultQty,
      unit: rate.unit,
      totalCost: rate.defaultRate * defaultQty,
      notes: rate.notes || "",
    };
    setCostItems((prev) => [...prev, newItem]);
  };

  const addBlankLineItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      category: "Misc",
      label: "Custom Internal Service Cost",
      rate: 1000,
      quantity: 1,
      unit: "unit",
      totalCost: 1000,
      notes: "",
    };
    setCostItems((prev) => [...prev, newItem]);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setCostItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };
      if (field === "rate" || field === "quantity") {
        const r = parseFloat(field === "rate" ? value : current.rate) || 0;
        const q = parseFloat(field === "quantity" ? value : current.quantity) || 0;
        current.totalCost = Math.round(r * q * 100) / 100;
      }
      updated[index] = current;
      return updated;
    });
  };

  const removeLineItem = (index: number) => {
    setCostItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live Computed Metrics
  const calculatedInternalCost = costItems.reduce((acc, item) => acc + (item.totalCost || 0), 0);
  const netProfit = revenueOverride - calculatedInternalCost;
  const marginPercentage = revenueOverride > 0 ? (netProfit / revenueOverride) * 100 : 0;

  const handleSaveCostSheet = async () => {
    if (!selectedTrip) return;
    setSavingCost(true);
    try {
      const res = await saveTripCostCalculation(selectedTrip.id, {
        customerRevenue: revenueOverride,
        internalCost: calculatedInternalCost,
        netProfit: Math.round(netProfit * 100) / 100,
        marginPercentage: Math.round(marginPercentage * 10) / 10,
        lineItems: costItems,
      });

      if (res.success) {
        setTrips((prev) =>
          prev.map((t) =>
            t.id === selectedTrip.id
              ? {
                  ...t,
                  customerRevenue: revenueOverride,
                  internalCost: calculatedInternalCost,
                  netProfit: Math.round(netProfit * 100) / 100,
                  marginPercentage: Math.round(marginPercentage * 10) / 10,
                  hasCalculation: true,
                  lineItems: costItems,
                }
              : t
          )
        );
        setSelectedTrip(null);
        router.refresh();
      } else {
        alert(res.error || "Failed to save cost calculation");
      }
    } finally {
      setSavingCost(false);
    }
  };

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRateForm.label) return;
    const res = await createMasterCostRate({
      category: newRateForm.category,
      label: newRateForm.label,
      defaultRate: parseFloat(newRateForm.defaultRate) || 0,
      unit: newRateForm.unit,
      notes: newRateForm.notes,
    });
    if (res.success && res.data) {
      setRates((prev) => [res.data!, ...prev]);
      setRateModalOpen(false);
      setNewRateForm({ category: "Hotel", label: "", defaultRate: "5000", unit: "per night", notes: "" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Warning Banner (Sage Accent & Confidentiality Warning) */}
      <div className="bg-[#6B7A5E]/10 border border-[#6B7A5E]/30 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-[#6B7A5E] text-white flex items-center justify-center font-bold shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#6B7A5E] uppercase tracking-wider block">
              Internal Admin Only — Confidential Financial Margins
            </span>
            <p className="text-xs text-zinc-600">
              The cost breakdowns, wholesale rates, net profits, and margins computed here are strictly segregated and <strong>never exported to client PDF proposals</strong>.
            </p>
          </div>
        </div>
        <button
          onClick={() => setRateModalOpen(true)}
          className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#6B7A5E] hover:bg-[#58654D] text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Manage Master Rates</span>
        </button>
      </div>

      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
            Trip Profitability & Cost Engine
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Select a trip itinerary to view and adjust line-item wholesale costs, net margins, and profitability.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search trips to view cost sheet and margin..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#6B7A5E] focus:border-[#6B7A5E]"
        />
      </div>

      {/* Trips Profitability Table */}
      <div className="bg-white border border-[#6B7A5E]/25 rounded-lg overflow-hidden craft-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-zinc-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Trip Blueprint Title</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Customer Revenue</th>
                <th className="py-3 px-4">Internal Cost</th>
                <th className="py-3 px-4">Net Profit</th>
                <th className="py-3 px-4">Margin %</th>
                <th className="py-3 px-4 text-right">Cost Sheet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400 text-xs">
                    No trips found.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => {
                  const isProfitable = trip.netProfit >= 0;
                  return (
                    <tr
                      key={trip.id}
                      onClick={() => openCostSheet(trip)}
                      className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-bold text-[#14213D] group-hover:text-[#6B7A5E] transition-colors">
                        {trip.title}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 font-medium">
                        {trip.destination} ({trip.durationDays}D / {trip.numTravellers} Pax)
                      </td>
                      <td className="py-3 px-4 font-bold text-[#14213D] font-mono">
                        ₹{trip.customerRevenue.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 font-mono">
                        ₹{trip.internalCost.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 font-bold font-mono">
                        <span className={isProfitable ? "text-[#6B7A5E]" : "text-red-600"}>
                          {isProfitable ? "+" : ""}₹{trip.netProfit.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            trip.marginPercentage >= 20
                              ? "bg-[#6B7A5E]/15 text-[#6B7A5E] border border-[#6B7A5E]/30"
                              : trip.marginPercentage > 0
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          <TrendingUp className="h-3 w-3 mr-1 inline" />
                          {trip.marginPercentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCostSheet(trip);
                          }}
                          className="px-3 py-1.5 rounded bg-zinc-100 hover:bg-[#6B7A5E] hover:text-white text-zinc-700 font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                        >
                          {trip.hasCalculation ? "Open Sheet" : "Calculate"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COST SHEET MODAL */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-4xl w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-zinc-100 mb-6">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#6B7A5E]/15 text-[#6B7A5E] uppercase tracking-wider">
                    Internal Cost Sheet
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    Trip ID: {selectedTrip.id.slice(0, 8)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#14213D] font-fraunces mt-1">
                  {selectedTrip.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTrip(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profit Margin Metric Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#FAF8F5] border border-[#6B7A5E]/20 mb-6">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  Customer Revenue
                </span>
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={revenueOverride}
                    onChange={(e) => setRevenueOverride(parseFloat(e.target.value) || 0)}
                    className="w-full text-base font-extrabold text-[#14213D] bg-white border border-zinc-200 rounded px-2 py-1 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  Total Internal Cost
                </span>
                <p className="text-lg font-black text-zinc-700 font-mono mt-1">
                  ₹{calculatedInternalCost.toLocaleString("en-IN")}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  Net Profit (Revenue - Cost)
                </span>
                <p
                  className={`text-lg font-black font-mono mt-1 ${
                    netProfit >= 0 ? "text-[#6B7A5E]" : "text-red-600"
                  }`}
                >
                  {netProfit >= 0 ? "+" : ""}₹{netProfit.toLocaleString("en-IN")}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  Profit Margin %
                </span>
                <p
                  className={`text-lg font-black font-mono mt-1 ${
                    marginPercentage >= 20
                      ? "text-[#6B7A5E]"
                      : marginPercentage > 0
                      ? "text-amber-700"
                      : "text-red-600"
                  }`}
                >
                  {Math.round(marginPercentage * 10) / 10}%
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                  Wholesale Cost Line Items
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={addBlankLineItem}
                    className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 rounded text-xs font-semibold text-zinc-700 cursor-pointer"
                  >
                    + Custom Item
                  </button>
                </div>
              </div>

              {/* Master Rates Quick-Add Chips */}
              <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-lg">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  ⚡ Quick Add From Master Cost Rates:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {rates.map((rate) => (
                    <button
                      key={rate.id}
                      type="button"
                      onClick={() => addLineItemFromRate(rate)}
                      className="px-2 py-1 rounded bg-white hover:bg-[#6B7A5E]/10 hover:border-[#6B7A5E] border border-zinc-200 text-[11px] font-medium text-zinc-700 text-left transition-all cursor-pointer"
                    >
                      <span className="font-bold text-[#14213D]">{rate.label}</span> (₹{rate.defaultRate} {rate.unit})
                    </button>
                  ))}
                </div>
              </div>

              {/* Table of Line items */}
              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Service Description</th>
                      <th className="py-2 px-3">Rate (₹)</th>
                      <th className="py-2 px-3">Qty</th>
                      <th className="py-2 px-3">Unit</th>
                      <th className="py-2 px-3">Total (₹)</th>
                      <th className="py-2 px-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {costItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-zinc-400">
                          No cost items added yet. Click a rate above to begin.
                        </td>
                      </tr>
                    ) : (
                      costItems.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-zinc-50/50">
                          <td className="py-2 px-3">
                            <select
                              value={item.category}
                              onChange={(e) => updateLineItem(idx, "category", e.target.value)}
                              className="px-1.5 py-1 border border-zinc-200 rounded text-xs bg-white"
                            >
                              <option value="Hotel">Hotel</option>
                              <option value="Flight">Flight</option>
                              <option value="Transport">Transport</option>
                              <option value="Activity">Activity</option>
                              <option value="Guide">Guide</option>
                              <option value="Visa">Visa</option>
                              <option value="Misc">Misc</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => updateLineItem(idx, "label", e.target.value)}
                              className="w-full px-2 py-1 border border-zinc-200 rounded text-xs"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateLineItem(idx, "rate", e.target.value)}
                              className="w-20 px-2 py-1 border border-zinc-200 rounded text-xs font-mono font-bold"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                              className="w-14 px-2 py-1 border border-zinc-200 rounded text-xs font-mono"
                            />
                          </td>
                          <td className="py-2 px-3 text-zinc-500 text-[11px]">
                            {item.unit}
                          </td>
                          <td className="py-2 px-3 font-bold text-[#14213D] font-mono">
                            ₹{item.totalCost.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeLineItem(idx)}
                              className="text-zinc-400 hover:text-red-600 p-1 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
              <span className="text-[11px] text-zinc-400 italic">
                Formula: Net Profit = Revenue − Internal Cost &bull; Margin % = (Net Profit / Revenue) × 100
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedTrip(null)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveCostSheet}
                  disabled={savingCost}
                  className="px-5 py-2 bg-[#6B7A5E] hover:bg-[#58654D] text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center shadow-sm"
                >
                  {savingCost ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1.5" /> Save Cost Calculation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MASTER COST RATE CREATOR MODAL */}
      {rateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces">
                Add Master Cost Rate Template
              </h3>
              <button
                onClick={() => setRateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Cost Category
                </label>
                <select
                  value={newRateForm.category}
                  onChange={(e) =>
                    setNewRateForm({ ...newRateForm, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs outline-none bg-white"
                >
                  <option value="Hotel">Hotel</option>
                  <option value="Flight">Flight</option>
                  <option value="Transport">Transport</option>
                  <option value="Activity">Activity</option>
                  <option value="Guide">Tour Guide</option>
                  <option value="Visa">Visa Fee</option>
                  <option value="Misc">Misc Service</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Rate Label / Description *
                </label>
                <input
                  type="text"
                  required
                  value={newRateForm.label}
                  onChange={(e) =>
                    setNewRateForm({ ...newRateForm, label: e.target.value })
                  }
                  placeholder="e.g. 5-Star Luxury Villa Wholesale Rate"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Wholesale Rate (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newRateForm.defaultRate}
                    onChange={(e) =>
                      setNewRateForm({ ...newRateForm, defaultRate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Unit Measurement
                  </label>
                  <input
                    type="text"
                    value={newRateForm.unit}
                    onChange={(e) =>
                      setNewRateForm({ ...newRateForm, unit: e.target.value })
                    }
                    placeholder="per night, per day"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setRateModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6B7A5E] hover:bg-[#58654D] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
