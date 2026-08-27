"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Compass, 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  ArrowRight, 
  User 
} from "lucide-react";
import { Logo } from "@/components/Logo";

interface AccommodationPhotos {
  photos: string[];
}

interface TripData {
  id: string;
  title: string;
  slug: string;
  destination: string;
  departureCity: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  durationNights: number;
  numTravellers: number;
  consultantName: string;
  accommodations: AccommodationPhotos[];
}

interface TripsBrowserProps {
  initialTrips: TripData[];
}

export function TripsBrowser({ initialTrips }: TripsBrowserProps) {
  const [search, setSearch] = useState("");

  const filteredTrips = initialTrips.filter((trip) =>
    trip.title.toLowerCase().includes(search.toLowerCase()) ||
    trip.destination.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="relative min-h-screen bg-[#FAF8F5] text-[#1E3B39] font-sans pb-16">
      {/* Light theme brand color gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(13,165,144,0.06),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,23,107,0.05),transparent_50%)] pointer-events-none" />

      {/* Header bar */}
      <nav className="relative border-b border-zinc-200 bg-white/95 backdrop-blur-md shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Logo className="h-10" />

            <Link
              href="/login"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-zinc-200 bg-[#FAF8F5] text-zinc-600 hover:text-[#1E3B39] hover:bg-zinc-50 transition-all shadow-sm"
            >
              <User className="h-3.5 w-3.5 text-[#0DA590]" />
              <span>Agent Portal</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center z-10">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#1E3B39] leading-none">
          Find Your Next <br />
          <span className="bg-gradient-to-r from-[#0DA590] to-[#FF176B] bg-clip-text text-transparent">Getaway Itinerary</span>
        </h1>
        <p className="max-w-xl mx-auto mt-4 text-sm sm:text-base text-zinc-500 font-medium">
          Curated master travel plans crafted by the expert consultants at TripCraft.
        </p>

        {/* Search Bar */}
        <div className="mt-8 max-w-md mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by country or city destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm placeholder-zinc-400 text-[#1E3B39] focus:outline-none focus:ring-2 focus:ring-[#0DA590]/50 transition-all shadow-sm"
          />
        </div>
      </header>

      {/* Grid of Trip Cards */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        {filteredTrips.length === 0 ? (
          <div className="py-20 border border-zinc-200 border-dashed rounded-3xl text-center max-w-md mx-auto bg-white shadow-sm">
            <Compass className="h-10 w-10 text-zinc-350 mx-auto mb-3" />
            <h3 className="text-md font-bold text-[#1E3B39]">No trips found</h3>
            <p className="text-xs text-zinc-400 mt-1">
              There are currently no matching published itineraries. Try searching another destination.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTrips.map((trip) => {
              // Extract the first photo from any accommodation if available
              let coverPhoto = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"; // Fallback
              const photoAcc = trip.accommodations.find((acc) => acc.photos && acc.photos.length > 0);
              if (photoAcc && photoAcc.photos[0]) {
                coverPhoto = photoAcc.photos[0];
              }

              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.slug}`}
                  className="group relative flex flex-col bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Cover Photo */}
                  <div className="relative aspect-video w-full overflow-hidden bg-zinc-100">
                    <img
                      src={coverPhoto}
                      alt={trip.title}
                      className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4">
                      <span className="text-[10px] font-black uppercase bg-[#0DA590] text-white px-2.5 py-0.5 rounded shadow-sm">
                        {trip.durationDays} Days / {trip.durationNights} Nights
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-[#1E3B39] group-hover:text-[#0DA590] transition-colors line-clamp-2 leading-snug">
                        {trip.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1.5 flex items-center font-semibold">
                        <MapPin className="h-3.5 w-3.5 mr-1 text-[#0DA590]" />
                        {trip.destination} (Ex-{trip.departureCity})
                      </p>
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center justify-between border-t border-zinc-100 pt-4 mt-6 text-xs text-zinc-500 font-medium">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{formatDate(trip.startDate)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{trip.numTravellers} Travellers</span>
                      </div>
                    </div>

                    {/* Button */}
                    <div className="mt-4 pt-3 flex items-center justify-end text-xs font-bold text-[#0DA590] group-hover:text-[#0b8e7c]">
                      <span>View Full Itinerary</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
