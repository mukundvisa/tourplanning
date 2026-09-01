"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileDown, 
  Calendar, 
  Users, 
  Compass, 
  MapPin, 
  FileText, 
  Loader2,
  Database,
  Calculator,
  Eye,
  Menu,
  X,
  LayoutDashboard,
  ExternalLink,
} from "lucide-react";
import { deleteTrip, getTripDetails } from "@/actions/trips";
import { format } from "date-fns";
import { DayWiseTripSummary, TripFullData } from "@/components/admin/DayWiseTripSummary";
import { downloadTripPdf } from "@/lib/download-pdf";

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

interface AdminDashboardProps {
  initialTrips: TripData[];
}

export function AdminDashboard({ initialTrips }: AdminDashboardProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<TripData[]>(initialTrips);
  const [search, setSearch] = useState("");
  const [busyTripId, setBusyTripId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Trip Summary Modal state
  const [summaryTrip, setSummaryTrip] = useState<TripFullData | null>(null);
  const [loadingSummaryId, setLoadingSummaryId] = useState<string | null>(null);

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

  // Real-time search filter
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
              <span className="truncate max-w-[120px] sm:max-w-xs">Admin Section</span>
            </div>
            <h1 className="text-sm font-bold text-[#14213D] font-fraunces">
              Trip Itineraries Console
            </h1>
          </div>
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

        {/* Collapsible Admin Sidebar */}
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

            {/* Main Action Links */}
            <div className="p-3 space-y-1">
              <Link
                href="/"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold bg-[#B8944F]/15 text-[#B8944F] transition-colors cursor-pointer"
              >
                <LayoutDashboard className="h-4 w-4 text-[#B8944F] shrink-0" />
                {!isSidebarCollapsed && <span>Itineraries Console</span>}
              </Link>
              <Link
                href="/trips/new"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-50 hover:text-[#14213D] transition-colors cursor-pointer"
              >
                <Compass className="h-4 w-4 text-[#B8944F] shrink-0" />
                {!isSidebarCollapsed && <span>Create Trip Blueprint</span>}
              </Link>
            </div>

            {/* Quick Navigation / Tools Section */}
            <div className="px-3 pt-3 border-t border-zinc-100">
              <p className={`text-[10px] uppercase font-bold text-zinc-400 px-3 mb-2 ${isSidebarCollapsed ? "hidden" : "block"}`}>
                Operations & Tools
              </p>
              <div className="space-y-1">
                {/* Admin Cost Engine Link */}
                <Link
                  href="/master-data?tab=costing"
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-[#6B7A5E]/10 hover:text-[#6B7A5E] transition-all cursor-pointer"
                  title="Admin Cost Engine"
                >
                  <Calculator className="h-4 w-4 text-[#6B7A5E] shrink-0" />
                  {!isSidebarCollapsed && <span className="font-semibold">Admin Cost Engine</span>}
                </Link>

                {/* Master Data Hub Link */}
                <Link
                  href="/master-data"
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-[#14213D] transition-all cursor-pointer"
                  title="Master Data Management"
                >
                  <Database className="h-4 w-4 text-[#B8944F] shrink-0" />
                  {!isSidebarCollapsed && <span>Master Data Hub</span>}
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar Bottom Footer */}
          <div className="p-4 border-t border-zinc-100 text-center">
            {!isSidebarCollapsed ? (
              <div className="text-[11px] text-zinc-400">
                <p className="font-semibold text-zinc-600">TripCraft Workspace</p>
                <p>Internal Travel Operations</p>
              </div>
            ) : (
              <div className="text-[10px] font-bold text-[#B8944F]">TC</div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 overflow-y-auto">
          {/* TRIP SEARCH INPUT */}
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

          {/* Content Action Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80">
            <div>
              <h2 className="text-2xl font-bold text-[#14213D] font-fraunces">
                Travel Blueprints & Client Proposals
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Review complete day-wise trip summaries, manage wholesale costs, and export client proposals.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href="/master-data?tab=costing"
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg border border-[#6B7A5E]/40 bg-white hover:bg-[#6B7A5E]/10 text-xs font-bold text-[#6B7A5E] transition-all shadow-2xs cursor-pointer"
              >
                <Calculator className="h-4 w-4" />
                <span>Admin Cost Engine</span>
              </Link>

              <Link
                href="/trips/new"
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg font-bold bg-[#B8944F] hover:bg-[#8F6F33] text-white shadow-xs transition-all text-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Trip Blueprint</span>
              </Link>
            </div>
          </div>

          {/* Trips Grid / List */}
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
                <Link
                  href="/trips/new"
                  className="mt-4 px-4 py-2 rounded-lg text-xs font-bold bg-[#B8944F] hover:bg-[#8F6F33] text-white transition-colors cursor-pointer"
                >
                  Create Trip
                </Link>
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
                    {/* Card Top / Title */}
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
                        <Link
                          href={`/trips/${trip.id}/edit`}
                          className="p-1.5 rounded hover:bg-white text-zinc-500 hover:text-[#B8944F] border border-transparent hover:border-zinc-200 transition-all cursor-pointer"
                          title="Edit Itinerary"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
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

