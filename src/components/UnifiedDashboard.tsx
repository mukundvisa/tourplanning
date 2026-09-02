"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  TrendingUp,
  Calculator,
  Database,
  Plus,
  Search,
  Edit,
  Trash2,
  FileDown,
  Calendar,
  Users,
  MapPin,
  FileText,
  Loader2,
  Eye,
  Menu,
  X,
  ExternalLink,
  Type,
  BedDouble,
  Plane,
  Bus,
  Ticket,
  UtensilsCrossed,
  Image as ImageIcon,
  Percent,
  Tag,
  User,
  Check,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Heart,
  ShieldAlert,
  Copy,
} from "lucide-react";
import { deleteTrip, getTripDetails, duplicateTrip } from "@/actions/trips";
import { format } from "date-fns";
import { DayWiseTripSummary, TripFullData } from "@/components/admin/DayWiseTripSummary";
import { downloadTripPdf } from "@/lib/download-pdf";

// Master Data Tab Components
import { OverviewTab } from "./master-data/OverviewTab";
import { CitiesTab } from "./master-data/CitiesTab";
import { PlacesTab } from "./master-data/PlacesTab";
import { ConsultantsTab } from "./master-data/ConsultantsTab";
import { TaxSettingsTab } from "./master-data/TaxSettingsTab";
import { PricingLabelsTab } from "./master-data/PricingLabelsTab";
import { HotelsTab } from "./master-data/HotelsTab";
import { FlightRoutesTab } from "./master-data/FlightRoutesTab";
import { AddOnsTab } from "./master-data/AddOnsTab";
import { RestaurantsTab } from "./master-data/RestaurantsTab";
import { PolicyTemplatesTab } from "./master-data/PolicyTemplatesTab";
import { BannerImagesTab } from "./master-data/BannerImagesTab";
import { AdminCostCalculationTab } from "./master-data/AdminCostCalculationTab";
import { GeneralSettingsTab } from "./master-data/GeneralSettingsTab";
import { MasterDataTabSlider } from "./master-data/MasterDataTabSlider";
import { TripFormWizard } from "./TripFormWizard";
import { Settings } from "lucide-react";

export type DashboardView = "console" | "create" | "edit" | "analytics" | "costing" | "master-data";

interface TripData {
  id: string;
  title: string;
  destination: string;
  departureCity: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  durationNights: number;
  numTravellers: number;
  consultantName: string;
  updatedAt: string;
}

interface UnifiedDashboardProps {
  defaultView?: DashboardView;
  initialTrips: TripData[];
  overviewStats: any;
  cities: any[];
  places: any[];
  consultants: any[];
  taxSettings: any[];
  pricingLabels: any[];
  hotels: any[];
  flightRoutes: any[];
  addOns: any[];
  restaurants: any[];
  policyTemplates: any[];
  bannerImages: any[];
  tripsForCost: any[];
  costRates: any[];
  generalSettings?: any;
}

const MASTER_DATA_TABS = [
  { id: "settings", label: "General Settings", icon: Settings },
  { id: "banners", label: "Banner Images", icon: ImageIcon },
  { id: "cities", label: "Cities & States", icon: MapPin },
  { id: "consultants", label: "Consultants", icon: User },
  { id: "places", label: "Places", icon: Landmark },
  { id: "hotels", label: "Hotels", icon: BedDouble },
  { id: "flights", label: "Transportation", icon: Bus },
  { id: "addons", label: "Add-ons & Visa", icon: Ticket },
  { id: "restaurants", label: "Restaurants", icon: UtensilsCrossed },
  { id: "policies", label: "Policy Templates", icon: FileText },
  { id: "pricing", label: "Pricing", icon: Tag },
  { id: "tax", label: "Tax Settings", icon: Percent },
];

function UnifiedDashboardContent(props: UnifiedDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determine initial view from props or URL
  const viewParam = searchParams.get("view") as DashboardView | null;
  const initialView: DashboardView = viewParam || props.defaultView || "console";
  const [activeView, setActiveView] = useState<DashboardView>(initialView);

  // Master Data active tab
  const tabParam = searchParams.get("tab");
  const [masterDataTab, setMasterDataTab] = useState(
    tabParam && tabParam !== "costing" && tabParam !== "overview" && tabParam !== "titles"
      ? tabParam
      : "banners"
  );

  // Sidebar responsiveness
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Trip Console state
  const [trips, setTrips] = useState<TripData[]>(props.initialTrips);
  const [search, setSearch] = useState("");
  const [busyTripId, setBusyTripId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Trip Summary Modal state
  const [summaryTrip, setSummaryTrip] = useState<TripFullData | null>(null);
  const [loadingSummaryId, setLoadingSummaryId] = useState<string | null>(null);

  // In-Dashboard Trip Editing State
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editingTripData, setEditingTripData] = useState<any | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

  const handleEditTrip = async (tripId: string) => {
    setLoadingEditId(tripId);
    try {
      const res = await getTripDetails(tripId);
      if (res.success && res.data) {
        setEditingTripId(tripId);
        setEditingTripData(res.data);
        setActiveView("edit");
      } else {
        alert(res.error || "Failed to load trip details for editing.");
      }
    } catch (err: any) {
      console.error("Failed to load trip details:", err);
      alert("Error loading trip details.");
    } finally {
      setLoadingEditId(null);
    }
  };

  const exitEditMode = () => {
    setEditingTripId(null);
    setEditingTripData(null);
    setActiveView("console");
    window.history.replaceState(null, "", "/");
  };

  // Sync state with URL search params (Never auto-opens edit screen on refresh)
  useEffect(() => {
    const v = searchParams.get("view") as DashboardView | null;
    const t = searchParams.get("tab");

    if (v === "create") {
      setEditingTripId(null);
      setEditingTripData(null);
      setActiveView("create");
    } else if (v === "analytics" || t === "overview") {
      setEditingTripId(null);
      setEditingTripData(null);
      setActiveView("analytics");
    } else if (v === "costing" || t === "costing") {
      setEditingTripId(null);
      setEditingTripData(null);
      setActiveView("costing");
    } else if (v === "master-data" || t) {
      setEditingTripId(null);
      setEditingTripData(null);
      setActiveView("master-data");
      setMasterDataTab(t || "banners");
    } else {
      // Default to clean console view
      setEditingTripId(null);
      setEditingTripData(null);
      setActiveView("console");
    }
  }, [searchParams]);

  const switchView = (newView: DashboardView, extraTab?: string) => {
    setEditingTripId(null);
    setEditingTripData(null);
    setActiveView(newView);
    setIsMobileSidebarOpen(false);

    // Update URL shallowly and cleanly
    let newUrl = "/";
    if (newView === "console") {
      newUrl = "/";
    } else if (newView === "create") {
      newUrl = "/?view=create";
    } else if (newView === "analytics") {
      newUrl = "/?view=analytics";
    } else if (newView === "costing") {
      newUrl = "/?view=costing";
    } else if (newView === "master-data") {
      const targetTab = extraTab || masterDataTab || "banners";
      setMasterDataTab(targetTab);
      newUrl = `/?view=master-data&tab=${targetTab}`;
    }

    window.history.replaceState(null, "", newUrl);
  };

  const handleOpenSummary = async (tripId: string) => {
    setLoadingSummaryId(tripId);
    try {
      const res = await getTripDetails(tripId);
      if (res.success && res.data) {
        setSummaryTrip(res.data as TripFullData);
      } else {
        alert(res.error || "Failed to load trip summary details.");
      }
    } catch (err: any) {
      alert(`Error loading trip summary: ${err.message || "Unknown error"}`);
    } finally {
      setLoadingSummaryId(null);
    }
  };

  const handleExportPDF = async (tripId: string, title: string) => {
    setDownloadingId(tripId);
    try {
      await downloadTripPdf(tripId, title);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      alert(`Export PDF Failed: ${err.message || "Could not generate PDF."}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return format(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), "MMM d, yyyy");
    } catch (e) {
      return dateStr;
    }
  };

  const filteredTrips = trips.filter((trip) => {
    return (
      trip.title.toLowerCase().includes(search.toLowerCase()) ||
      trip.destination.toLowerCase().includes(search.toLowerCase()) ||
      trip.consultantName.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleDelete = async (tripId: string, title: string) => {
    if (
      !confirm(
        `Are you absolutely sure you want to delete the trip "${title}"?\nThis will permanently delete all accommodations, flights, days, and addons.`
      )
    ) {
      return;
    }

    setBusyTripId(tripId);
    try {
      const res = await deleteTrip(tripId);
      if (res.success) {
        setTrips((prev) => prev.filter((t) => t.id !== tripId));
        router.refresh();
      } else {
        alert(res.error || "Failed to delete trip");
      }
    } catch (err) {
      alert("Error deleting trip");
    } finally {
      setBusyTripId(null);
    }
  };

  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const handleDuplicate = async (tripId: string) => {
    setDuplicatingId(tripId);
    try {
      const res = await duplicateTrip(tripId);
      if (res.success && res.newTrip) {
        setTrips((prev) => [res.newTrip, ...prev]);
        router.refresh();
      } else {
        alert(res.error || "Failed to duplicate trip.");
      }
    } catch (err) {
      console.error("Duplicate trip error:", err);
      alert("Error duplicating trip.");
    } finally {
      setDuplicatingId(null);
    }
  };

  // Dynamic Header Title & Breadcrumb mapping
  const getHeaderInfo = () => {
    switch (activeView) {
      case "analytics":
        return { breadcrumb: "Analytics Overview", title: "Performance Metrics & Velocity" };
      case "console":
        return { breadcrumb: "Trip Itineraries Console", title: "Travel Blueprints & Client Proposals" };
      case "create":
        return { breadcrumb: "Create Trip Blueprint", title: "New Itinerary Proposal Builder" };
      case "edit":
        return { 
          breadcrumb: "Blueprint Studio", 
          title: editingTripData?.title ? `Editing: ${editingTripData.title}` : "Edit Travel Blueprint" 
        };
      case "costing":
        return { breadcrumb: "Admin Cost Engine", title: "Confidential Costing & Margin Control" };
      case "master-data":
        if (masterDataTab === "settings") {
          return { breadcrumb: "Enterprise Settings", title: "General Settings & PDF Watermarking" };
        }
        return { breadcrumb: "Master Data Hub", title: "Centralized Catalogues & Master Configuration" };
      default:
        return { breadcrumb: "Dashboard", title: "TripCraft Unified Workspace" };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#14213D] flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-200/80 px-4 sm:px-6 h-16 flex items-center justify-between shadow-2xs">
        {/* Left: Hamburger & Breadcrumb */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsMobileSidebarOpen(!isMobileSidebarOpen);
              } else {
                setIsSidebarCollapsed(!isSidebarCollapsed);
              }
            }}
            className="p-2 rounded-lg text-zinc-600 hover:text-[#14213D] hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="text-left">
            <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
              <span className="font-semibold text-[#14213D]">TripCraft</span>
              <span>/</span>
              <span className="truncate max-w-[140px] sm:max-w-xs">{headerInfo.breadcrumb}</span>
            </div>
            <h1 className="text-sm font-bold text-[#14213D] font-fraunces">
              {headerInfo.title}
            </h1>
          </div>
        </div>

        {/* Right: Quick action if not in create view */}
        <div className="flex items-center space-x-2">
          {activeView !== "create" && (
            <button
              onClick={() => switchView("create")}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Create Trip Blueprint</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Mobile Backdrop */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Single Unified Collapsible Sidebar */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-40 md:z-auto bg-white border-r border-zinc-200/80 flex flex-col justify-between
            transition-[width,transform] duration-250 ease-in-out
            ${isMobileSidebarOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0"}
            ${isSidebarCollapsed ? "md:w-16" : "md:w-64"}
          `}
        >
          <div>
            {/* Wordmark (Fraunces Text-only) */}
            <div className="h-16 px-5 border-b border-zinc-100 flex items-center justify-between">
              {!isSidebarCollapsed ? (
                <span className="text-xl font-bold text-[#14213D] font-fraunces tracking-tight">
                  TripCraft
                </span>
              ) : (
                <span className="text-xl font-bold text-[#14213D] font-fraunces mx-auto">
                  TC
                </span>
              )}
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="md:hidden text-zinc-400 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Primary Operations & Modules Navigation */}
            <div className="p-3 space-y-1">
              {/* 1. Analytics Overview */}
              <button
                onClick={() => switchView("analytics")}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === "analytics"
                    ? "bg-[#B8944F]/15 text-[#B8944F] font-bold"
                    : "text-zinc-700 hover:bg-zinc-50 hover:text-[#14213D]"
                }`}
                title="Analytics Overview"
              >
                <TrendingUp className={`h-4 w-4 shrink-0 ${activeView === "analytics" ? "text-[#B8944F]" : "text-zinc-500"}`} />
                {!isSidebarCollapsed && <span>Analytics Overview</span>}
              </button>

              {/* 2. Itineraries Console */}
              <button
                onClick={() => switchView("console")}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === "console"
                    ? "bg-[#B8944F]/15 text-[#B8944F] font-bold"
                    : "text-zinc-700 hover:bg-zinc-50 hover:text-[#14213D]"
                }`}
                title="Trip Itineraries Console"
              >
                <LayoutDashboard className={`h-4 w-4 shrink-0 ${activeView === "console" ? "text-[#B8944F]" : "text-zinc-500"}`} />
                {!isSidebarCollapsed && <span>Itineraries Console</span>}
              </button>

              {/* 3. Create Trip Blueprint */}
              <button
                onClick={() => switchView("create")}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === "create"
                    ? "bg-[#B8944F]/15 text-[#B8944F] font-bold"
                    : "text-zinc-700 hover:bg-zinc-50 hover:text-[#14213D]"
                }`}
                title="Create Trip Blueprint"
              >
                <Compass className={`h-4 w-4 shrink-0 ${activeView === "create" ? "text-[#B8944F]" : "text-[#B8944F]"}`} />
                {!isSidebarCollapsed && <span>Create Trip Blueprint</span>}
              </button>

              {/* 4. Master Data Hub */}
              <button
                onClick={() => switchView("master-data")}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === "master-data"
                    ? "bg-[#B8944F]/15 text-[#B8944F] font-bold"
                    : "text-zinc-700 hover:bg-zinc-50 hover:text-[#14213D]"
                }`}
                title="Master Data Hub"
              >
                <Database className={`h-4 w-4 shrink-0 ${activeView === "master-data" ? "text-[#B8944F]" : "text-zinc-500"}`} />
                {!isSidebarCollapsed && <span>Master Data Hub</span>}
              </button>

              {/* 5. Admin Cost Engine */}
              <button
                onClick={() => switchView("costing")}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === "costing"
                    ? "bg-[#6B7A5E]/20 text-[#6B7A5E] font-bold"
                    : "text-zinc-700 hover:bg-[#6B7A5E]/10 hover:text-[#6B7A5E]"
                }`}
                title="Admin Cost Engine"
              >
                <Calculator className={`h-4 w-4 shrink-0 ${activeView === "costing" ? "text-[#6B7A5E]" : "text-[#6B7A5E]"}`} />
                {!isSidebarCollapsed && <span>Admin Cost Engine</span>}
              </button>

              {/* 6. General Settings & Logo */}
              <button
                onClick={() => switchView("master-data", "settings")}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === "master-data" && masterDataTab === "settings"
                    ? "bg-[#B8944F]/15 text-[#B8944F] font-bold"
                    : "text-zinc-700 hover:bg-zinc-50 hover:text-[#14213D]"
                }`}
                title="General Settings & Logo Watermark"
              >
                <Settings className={`h-4 w-4 shrink-0 ${activeView === "master-data" && masterDataTab === "settings" ? "text-[#B8944F]" : "text-zinc-500"}`} />
                {!isSidebarCollapsed && <span>General Settings</span>}
              </button>
            </div>
          </div>

          {/* Sidebar Bottom Footer */}
          <div className="p-4 border-t border-zinc-100 text-center">
            {!isSidebarCollapsed ? (
              <div className="text-[11px] text-zinc-400">
                <p className="font-semibold text-zinc-600">TripCraft Workspace</p>
                <p>Unified Travel Operations</p>
              </div>
            ) : (
              <div className="text-[10px] font-bold text-[#B8944F]">TC</div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
          {/* ========================================================= */}
          {/* VIEW 1: ITINERARIES CONSOLE */}
          {/* ========================================================= */}
          {activeView === "console" && (
            <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search itineraries by trip title, destination country, or consultant name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200/90 rounded-lg text-xs placeholder-zinc-400 text-[#14213D] focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] craft-card shadow-2xs transition-all"
                />
              </div>

              {/* Action Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80">
                <div>
                  <h2 className="text-2xl font-bold text-[#14213D] font-fraunces">
                    Travel Blueprints & Client Proposals
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Review day-wise trip summaries, manage wholesale costs, and export client proposals.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => switchView("costing")}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg border border-[#6B7A5E]/40 bg-white hover:bg-[#6B7A5E]/10 text-xs font-bold text-[#6B7A5E] transition-all shadow-2xs cursor-pointer"
                  >
                    <Calculator className="h-4 w-4" />
                    <span>Admin Cost Engine</span>
                  </button>

                  <button
                    onClick={() => switchView("create")}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg font-bold bg-[#B8944F] hover:bg-[#8F6F33] text-white shadow-xs transition-all text-xs cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Trip Blueprint</span>
                  </button>
                </div>
              </div>

              {/* Trips Grid */}
              {filteredTrips.length === 0 ? (
                <div className="bg-white border border-zinc-200 border-dashed rounded-lg py-16 px-4 flex flex-col items-center justify-center text-center craft-card">
                  <div className="h-14 w-14 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 mb-4">
                    <Compass className="h-7 w-7 text-[#B8944F]" />
                  </div>
                  <h3 className="text-base font-bold text-[#14213D] font-fraunces">No itineraries found</h3>
                  <p className="text-zinc-500 text-xs max-w-sm mt-1">
                    {search
                      ? "No trips matched your search criteria. Try modifying your query."
                      : "Get started by creating your first trip itinerary."}
                  </p>
                  {!search && (
                    <button
                      onClick={() => switchView("create")}
                      className="mt-4 px-4 py-2 rounded-lg text-xs font-bold bg-[#B8944F] hover:bg-[#8F6F33] text-white transition-colors cursor-pointer"
                    >
                      Create Trip
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTrips.map((trip) => {
                    const isBusy = busyTripId === trip.id;
                    const isLoadingSummary = loadingSummaryId === trip.id;

                    return (
                      <div
                        key={trip.id}
                        className="group relative flex flex-col bg-white border border-[#B8944F]/20 hover:border-[#B8944F]/50 rounded-lg overflow-hidden craft-card transition-all duration-200 hover:shadow-md"
                      >
                        {/* Card Top */}
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[11px] font-bold text-[#A6572E] uppercase tracking-wider">
                              {trip.durationDays}D / {trip.durationNights}N
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium">
                              Updated {format(new Date(trip.updatedAt), "yyyy-MM-dd")}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-[#14213D] group-hover:text-[#B8944F] transition-colors line-clamp-1 mb-1 font-fraunces">
                            {trip.title}
                          </h3>
                          <p className="text-xs text-zinc-500 flex items-center mb-4 font-medium">
                            <MapPin className="h-3.5 w-3.5 mr-1 text-[#B8944F] shrink-0" />
                            {trip.destination} (Ex-{trip.departureCity})
                          </p>

                          {/* Metadata Grid */}
                          <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 py-3 my-auto border-t border-b border-zinc-100 text-xs text-zinc-500">
                            <div className="flex items-center space-x-1.5">
                              <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                              <span className="truncate">{formatDate(trip.startDate)}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <Users className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                              <span>{trip.numTravellers} Travellers</span>
                            </div>
                            <div className="col-span-2 flex items-center space-x-1.5">
                              <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                              <span className="truncate">Consultant: {trip.consultantName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom / Action Buttons */}
                        <div className="px-5 py-3.5 bg-zinc-50/60 border-t border-zinc-100 flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            {/* Day-Wise Trip Summary Action */}
                            <button
                              onClick={() => handleOpenSummary(trip.id)}
                              disabled={isLoadingSummary}
                              className="flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-md border bg-white border-[#B8944F]/40 text-[#B8944F] hover:bg-[#B8944F]/10 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                              title="View Day-wise Trip Summary"
                            >
                              {isLoadingSummary ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#B8944F]" />
                                  <span>Loading...</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3.5 w-3.5 text-[#B8944F]" />
                                  <span>Trip Summary</span>
                                </>
                              )}
                            </button>

                            {/* Export PDF Action */}
                            <button
                              onClick={() => handleExportPDF(trip.id, trip.title)}
                              disabled={downloadingId === trip.id}
                              className="flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-md border bg-white border-zinc-200 text-[#14213D] hover:border-[#B8944F] shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                              title="Export Itinerary PDF"
                            >
                              {downloadingId === trip.id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#B8944F]" />
                                  <span>PDF...</span>
                                </>
                              ) : (
                                <>
                                  <FileDown className="h-3.5 w-3.5 text-zinc-500" />
                                  <span>PDF</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleDuplicate(trip.id)}
                              disabled={duplicatingId === trip.id || isBusy}
                              className="p-1.5 rounded hover:bg-white text-zinc-500 hover:text-[#B8944F] border border-transparent hover:border-zinc-200 transition-all cursor-pointer disabled:opacity-50"
                              title="Duplicate / Copy Trip Itinerary"
                            >
                              {duplicatingId === trip.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-[#B8944F]" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleEditTrip(trip.id)}
                              disabled={loadingEditId === trip.id || isBusy}
                              className="p-1.5 rounded hover:bg-white text-zinc-500 hover:text-[#B8944F] border border-transparent hover:border-zinc-200 transition-all cursor-pointer disabled:opacity-50"
                              title="Edit Trip Blueprint"
                            >
                              {loadingEditId === trip.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-[#B8944F]" />
                              ) : (
                                <Edit className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(trip.id, trip.title)}
                              disabled={isBusy}
                              className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 border border-transparent hover:border-red-100 cursor-pointer transition-all"
                              title="Delete Itinerary"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 2: CREATE / EDIT TRIP BLUEPRINT */}
          {/* ========================================================= */}
          {(activeView === "create" || activeView === "edit") && (
            <div className="w-full">
              <TripFormWizard
                key={editingTripId || "new-blueprint"}
                initialData={editingTripData || undefined}
                tripId={editingTripId || undefined}
                onClose={exitEditMode}
                onSaved={async (savedTripId) => {
                  if (savedTripId) {
                    setEditingTripId(savedTripId);
                    const res = await getTripDetails(savedTripId);
                    if (res.success && res.data) {
                      setEditingTripData(res.data);
                    }
                  }
                  router.refresh();
                }}
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 3: ANALYTICS OVERVIEW */}
          {/* ========================================================= */}
          {activeView === "analytics" && (
            <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
              <OverviewTab stats={props.overviewStats} />
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 4: ADMIN COST ENGINE */}
          {/* ========================================================= */}
          {activeView === "costing" && (
            <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto">
              <AdminCostCalculationTab
                trips={props.tripsForCost}
                costRates={props.costRates}
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 5: MASTER DATA HUB */}
          {/* ========================================================= */}
          {activeView === "master-data" && (
            <div className="w-full flex flex-col">
              {/* Horizontal Tab Slider for Master Data Catalogues */}
              <div className="bg-white border-b border-zinc-200/80 sticky top-0 z-20 shadow-2xs">
                <MasterDataTabSlider
                  tabs={MASTER_DATA_TABS}
                  activeTab={masterDataTab}
                  onSelectTab={(tabId) => {
                    setMasterDataTab(tabId);
                    window.history.pushState(
                      null,
                      "",
                      `/?view=master-data&tab=${tabId}`
                    );
                  }}
                />
              </div>

              {/* Master Data Tab Content Panels */}
              <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto">
                {masterDataTab === "settings" && (
                  <GeneralSettingsTab initialSettings={props.generalSettings} />
                )}
                {masterDataTab === "cities" && <CitiesTab initialData={props.cities} />}
                {masterDataTab === "places" && (
                  <PlacesTab initialData={props.places} cities={props.cities} />
                )}
                {masterDataTab === "consultants" && (
                  <ConsultantsTab initialData={props.consultants} cities={props.cities} />
                )}
                {masterDataTab === "tax" && <TaxSettingsTab initialData={props.taxSettings} />}
                {masterDataTab === "pricing" && (
                  <PricingLabelsTab initialData={props.pricingLabels} />
                )}
                {masterDataTab === "hotels" && (
                  <HotelsTab initialData={props.hotels} cities={props.cities} />
                )}
                {masterDataTab === "flights" && (
                  <FlightRoutesTab initialData={props.flightRoutes} />
                )}
                {masterDataTab === "addons" && (
                  <AddOnsTab initialData={props.addOns} />
                )}
                {masterDataTab === "restaurants" && (
                  <RestaurantsTab initialData={props.restaurants} cities={props.cities} />
                )}
                {masterDataTab === "policies" && (
                  <PolicyTemplatesTab initialData={props.policyTemplates} />
                )}
                {masterDataTab === "banners" && (
                  <BannerImagesTab
                    initialData={props.bannerImages}
                    cities={props.cities}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Interactive In-Modal Day-Wise Trip Summary */}
      {summaryTrip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Top Bar */}
            <div className="bg-white border-b border-zinc-200/90 px-6 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <span className="px-2.5 py-1 bg-[#B8944F]/15 text-[#B8944F] rounded-md text-xs font-bold uppercase tracking-wider">
                  Admin Trip Summary
                </span>
                <h2 className="text-base font-bold text-[#14213D] font-fraunces truncate max-w-md sm:max-w-xl">
                  {summaryTrip.title}
                </h2>
              </div>

              <div className="flex items-center space-x-2">
                <Link
                  href={`/admin/summary/${summaryTrip.id}`}
                  target="_blank"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-600 hover:text-[#14213D] hover:bg-zinc-50 transition-colors"
                  title="Open in Dedicated Tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Full Page</span>
                </Link>
                <button
                  onClick={() => setSummaryTrip(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-[#14213D] hover:bg-zinc-100 transition-colors cursor-pointer"
                  title="Close Summary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto">
              <DayWiseTripSummary
                trip={summaryTrip}
                onClose={() => setSummaryTrip(null)}
                isModal={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function UnifiedDashboard(props: UnifiedDashboardProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-500 font-medium">Loading workspace...</div>}>
      <UnifiedDashboardContent {...props} />
    </Suspense>
  );
}
