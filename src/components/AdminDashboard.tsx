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
  Loader2 
} from "lucide-react";
import { deleteTrip } from "@/actions/trips";
import { Logo } from "@/components/Logo";
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

  // Format dates using date-fns for identical SSR and Client formatting
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return format(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), "MMM d, yyyy");
  };

  // Real-time search
  const filteredTrips = trips.filter((trip) => {
    return (
      trip.title.toLowerCase().includes(search.toLowerCase()) ||
      trip.destination.toLowerCase().includes(search.toLowerCase()) ||
      trip.consultantName.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Handle Delete trip
  const handleDelete = async (tripId: string, title: string) => {
    if (!confirm(`Are you absolutely sure you want to delete the trip "${title}"?\nThis will permanently delete all accommodations, flights, days, and addons.`)) {
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
    <div className="relative min-h-screen bg-[#FAF8F5] text-[#1E3B39] font-sans pb-16">
      {/* Light theme gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(13,165,144,0.06),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,23,107,0.05),transparent_50%)] pointer-events-none" />

      {/* Nav */}
      <nav className="relative border-b border-zinc-200 bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center space-x-2">
              <Logo className="h-14" />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 z-10">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-[#1E3B39]">
              TripCraft Workspace
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Create, manage, and export print-optimized PDF itineraries for your clients.
            </p>
          </div>
          <Link
            href="/trips/new"
            className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl font-bold bg-[#0DA590] hover:bg-[#0b8e7c] text-white shadow-md shadow-[#0DA590]/15 hover:shadow-[#0DA590]/35 transition-all text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Create Master TripCraft</span>
          </Link>
        </div>

        {/* Filter Controls */}
        <div className="bg-white border border-zinc-200/80 p-4 rounded-2xl mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search itineraries by title, destination country, or consultant name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm placeholder-zinc-400 text-[#1E3B39] focus:outline-none focus:ring-2 focus:ring-[#0DA590]/50 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Trips List / Grid */}
        {filteredTrips.length === 0 ? (
          <div className="bg-white border border-zinc-200 border-dashed rounded-2xl py-16 px-4 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="h-14 w-14 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 mb-4">
              <Compass className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-[#1E3B39]">No itineraries found</h3>
            <p className="text-zinc-500 text-sm max-w-sm mt-1">
              {search 
                ? "No trips matched your search criteria. Try modifying your query." 
                : "Get started by creating your first trip itinerary."}
            </p>
            {!search && (
              <Link
                href="/trips/new"
                className="mt-4 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0DA590] hover:bg-[#0b8e7c] text-white transition-colors"
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
                  className="group relative flex flex-col bg-white border border-zinc-200/85 hover:border-zinc-300 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 shadow-sm"
                >
                  {/* Card Top / Title */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-extrabold text-[#FF176B] uppercase tracking-wider">
                        {trip.durationDays}D / {trip.durationNights}N
                      </span>
                      <span className="text-[10px] text-zinc-400 font-bold">
                        Updated {format(new Date(trip.updatedAt), "yyyy-MM-dd")}
                      </span>
                    </div>

                    <h3 className="text-xl font-extrabold text-[#1E3B39] group-hover:text-[#0DA590] transition-colors line-clamp-1 mb-1">
                      {trip.title}
                    </h3>
                    <p className="text-xs text-zinc-400 flex items-center mb-4 font-semibold">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-[#0DA590]" />
                      {trip.destination} (Ex-{trip.departureCity})
                    </p>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 py-4 my-auto border-t border-b border-zinc-100 text-xs text-zinc-500">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="truncate">{formatDate(trip.startDate)}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Users className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{trip.numTravellers} Pax</span>
                      </div>
                      <div className="col-span-2 flex items-center space-x-1.5">
                        <FileText className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="truncate">Consultant: {trip.consultantName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom / Action Buttons */}
                  <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleExportPDF(trip.id, trip.title)}
                      disabled={downloadingId === trip.id}
                      className="flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-lg border bg-white border-zinc-200 text-[#1E3B39] hover:text-[#0DA590] hover:border-[#0DA590]/30 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingId === trip.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-[#0DA590]" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <FileDown className="h-4 w-4 text-[#0DA590]" />
                          <span>Export PDF</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center space-x-1">
                      <Link
                        href={`/trips/${trip.id}/edit`}
                        className="p-2 rounded-lg text-zinc-450 hover:text-[#0DA590] hover:bg-white hover:shadow-sm border border-transparent hover:border-zinc-200 transition-all"
                        title="Edit Itinerary"
                      >
                        <Edit className="h-4.5 w-4.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(trip.id, trip.title)}
                        disabled={isBusy}
                        className="p-2 rounded-lg text-zinc-450 hover:text-[#a50d0d] hover:bg-red-50 border border-transparent hover:border-red-100 cursor-pointer transition-all "
                        title="Delete Itinerary"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
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
