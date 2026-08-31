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
} from "lucide-react";
import { deleteTrip } from "@/actions/trips";
import { format } from "date-fns";

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

  const handleExportPDF = async (tripId: string, title: string) => {
    setDownloadingId(tripId);
    try {
      const res = await fetch(`/api/pdf/${tripId}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unknown server error");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Itinerary-${title.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      alert(`Export PDF Failed: ${err.message || "Could not launch PDF generator."}`);
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
    <div className="min-h-screen bg-[#FAF8F5] text-[#14213D] font-sans pb-16">
      {/* 
        MAIN APP HEADER (Part C Specification):
        - Left: page title + breadcrumb only
        - Right: logged-in user's avatar, name, role label only
        - NO search bar, NO notifications icon, NO "+ New Trip" button in this header
      */}
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-200/80 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between shadow-2xs">
        {/* Left: page title + breadcrumb only */}
        <div className="flex items-center space-x-3">
          <div className="text-left">
            <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
              <span className="font-semibold text-[#14213D]">TripCraft</span>
              <span>/</span>
              <span className="truncate max-w-[120px] sm:max-w-xs">Workspace</span>
            </div>
            <h1 className="text-sm font-bold text-[#14213D] font-fraunces">
              Trip Itineraries Console
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* 
          TRIP BLUEPRINT SEARCH INPUT (Part C Specification):
          Added at the very top of the page content (not the header), full width of content area.
        */}
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
              Draft, customize, and export print-optimized PDF itineraries for your agency clients.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/master-data"
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg border border-[#B8944F]/40 bg-white hover:bg-[#B8944F]/10 text-xs font-bold text-[#B8944F] transition-all shadow-2xs cursor-pointer"
            >
              <Database className="h-4 w-4" />
              <span>Manage Master Data</span>
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

        {/* Trips Grid / List (Part C: Cards with 8px radius and 1px muted border) */}
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
                    <button
                      onClick={() => handleExportPDF(trip.id, trip.title)}
                      disabled={downloadingId === trip.id}
                      className="flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-md border bg-white border-zinc-200 text-[#14213D] hover:border-[#B8944F] shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingId === trip.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#B8944F]" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <FileDown className="h-3.5 w-3.5 text-[#B8944F]" />
                          <span>Export PDF</span>
                        </>
                      )}
                    </button>

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
  );
}
