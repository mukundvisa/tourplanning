"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Calendar, 
  Users, 
  MapPin, 
  Compass, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Utensils, 
  Star, 
  Plane, 
  Building, 
  Briefcase, 
  ChevronDown, 
  ChevronUp, 
  Info,
  DollarSign,
  Coffee,
  Heart,
  AlertTriangle,
  Globe,
  ArrowLeft
} from "lucide-react";
import { Logo } from "@/components/Logo";

interface ItineraryDisplayProps {
  trip: any;
}

export function ItineraryDisplay({ trip }: ItineraryDisplayProps) {
  // Navigation / Tab States
  const [activeDay, setActiveDay] = useState<number>(0);
  const [expandedTerms, setExpandedTerms] = useState<{ [key: string]: boolean }>({
    payment: true,
    cancellation: false,
    visa: false,
    general: false,
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Find a cover photo
  let coverPhoto = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80";
  const photoStay = trip.accommodations.find((acc: any) => acc.photos && acc.photos.length > 0);
  if (photoStay && photoStay.photos[0]) {
    coverPhoto = photoStay.photos[0];
  }

  // Calculate prices
  const priceQuoteSubtotal = trip.priceQuoteItems.reduce((acc: number, item: any) => acc + item.amount, 0);

  // Group restaurant suggestions by Location, then Cuisine
  const groupedRestaurants = trip.restaurantSuggestions.reduce((acc: any, rest: any) => {
    const loc = rest.location;
    if (!acc[loc]) acc[loc] = {};
    const cuisine = rest.cuisineType;
    if (!acc[loc][cuisine]) acc[loc][cuisine] = [];
    acc[loc][cuisine].push(rest);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#FAF8F5] font-sans pb-24 text-[#1E3B39] selection:bg-[#0DA590] selection:text-white">
      {/* 1. HERO HEADER */}
      <div className="relative h-[60vh] w-full overflow-hidden bg-zinc-950">
        <img 
          src={coverPhoto} 
          alt={trip.title} 
          className="h-full w-full object-cover brightness-[0.45]"
        />
        {/* Soft bottom shading */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Top Header navbar overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
            {/* White logo variant using custom SVG */}
            <div className="flex items-center">
              <Logo className="h-10 brightness-0 invert" />
            </div>
            <Link
              href="/trips"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/15"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Listings</span>
            </Link>
          </div>
        </div>

        {/* Hero content */}
        <div className="absolute bottom-10 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center space-x-1 bg-[#FF176B] text-white font-extrabold uppercase text-[10px] px-3 py-1 rounded-full tracking-wider shadow">
              <Compass className="h-3.5 w-3.5 mr-1 animate-pulse" /> Curated Travel Document
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              {trip.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-200">
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-1 text-[#0DA590]" />
                {trip.destination}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-white/40 hidden sm:block" />
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-[#0DA590]" />
                {trip.durationDays} Days / {trip.durationNights} Nights
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-white/40 hidden sm:block" />
              <span className="flex items-center">
                <Users className="h-4 w-4 mr-1 text-[#0DA590]" />
                {trip.numTravellers} Guests
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-16">
        
        {/* 2. TRAVELLER DETAILS & 3. PRICE INVOICE CARD */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Details Card */}
          <div className="lg:col-span-2 bg-white border border-zinc-200 p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#0DA590]/5 h-32 w-32 rounded-bl-full pointer-events-none" />
            <h2 className="text-xl font-extrabold text-[#1E3B39] mb-6 flex items-center">
              <Compass className="h-5.5 w-5.5 mr-2 text-[#0DA590]" />
              Booking & Traveler Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-zinc-650">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Destination</p>
                  <p className="font-bold text-[#1E3B39] mt-0.5">{trip.destination}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Departure City</p>
                  <p className="font-bold text-[#1E3B39] mt-0.5">Ex-{trip.departureCity}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Travel Dates</p>
                  <p className="font-bold text-[#1E3B39] mt-0.5">
                    {formatDate(trip.startDate)} to {formatDate(trip.endDate)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Travel Group Size</p>
                  <p className="font-bold text-[#1E3B39] mt-0.5">{trip.numTravellers} Pax</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Trip Duration</p>
                  <p className="font-bold text-[#1E3B39] mt-0.5">{trip.durationDays} Days / {trip.durationNights} Nights</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Expert Consultant</p>
                  <div className="flex items-center space-x-2.5 mt-1">
                    <span className="h-7 w-7 rounded-full bg-[#0DA590]/10 text-[#0DA590] border border-[#0DA590]/20 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                      {trip.consultantName.charAt(0)}
                    </span>
                    <div>
                      <p className="font-bold text-[#1E3B39] text-xs">{trip.consultantName}</p>
                      <p className="text-[10px] text-zinc-500 flex items-center mt-0.5">
                        <Phone className="h-3 w-3 mr-1 text-[#0DA590]" />
                        {trip.consultantPhone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Invoice card */}
          <div className="bg-white border border-zinc-200 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#1E3B39] mb-4 flex items-center">
                <DollarSign className="h-5.5 w-5.5 mr-1 text-[#0DA590]" />
                Trip Costing Summary
              </h2>

              <div className="space-y-3">
                {trip.priceQuoteItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm py-1.5 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">{item.label}</span>
                    <span className="font-bold text-[#1E3B39]">₹{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-150 space-y-4">
              <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
                <span>Subtotal Plan Cost</span>
                <span className="font-semibold text-zinc-650">₹{priceQuoteSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
                <span>TCS Government Tax ({trip.tripSummary?.tcsPercentage || 5}%)</span>
                <span className="font-semibold text-zinc-650">₹{trip.tripSummary?.tcsAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-[#0DA590]/5 p-3 rounded-xl border border-[#0DA590]/15 text-sm">
                <span className="font-extrabold text-[#0DA590]">Grand Total (with TCS)</span>
                <span className="font-black text-[#1E3B39]">₹{trip.tripSummary?.totalWithTcs.toLocaleString()}</span>
              </div>

              {trip.tripSummary?.notes && (
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-zinc-150 text-[10px] text-zinc-500 space-y-1">
                  <div className="flex items-center text-zinc-700 font-bold uppercase tracking-wider text-[9px]">
                    <Info className="h-3.5 w-3.5 mr-1 text-[#0DA590]" /> Pricing Notes
                  </div>
                  <p className="leading-relaxed">{trip.tripSummary.notes}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 4. ITINERARY AT A GLANCE */}
        <section className="bg-white border border-zinc-200 p-6 sm:p-8 rounded-3xl shadow-sm">
          <h2 className="text-2xl font-black text-[#1E3B39] mb-5">Itinerary at a Glance</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trip.itineraryDays.map((day: any, idx: number) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveDay(idx);
                  const el = document.getElementById("detailed-itinerary-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className={`p-4 rounded-2xl border text-left transition-all shadow-sm ${
                  activeDay === idx
                    ? "bg-[#0DA590]/10 border-[#0DA590] text-[#1E3B39]"
                    : "bg-white border-zinc-200 hover:border-zinc-300 text-zinc-500 hover:bg-zinc-50/40"
                }`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#FF176B]">Day {day.dayNumber}</span>
                  <span className="text-[10px] font-bold text-[#0DA590]">{day.cityOrStay}</span>
                </div>
                <p className="font-extrabold text-[#1E3B39] text-sm line-clamp-1">
                  {day.title}
                </p>
                {day.durationHours && (
                  <p className="text-[10px] text-zinc-400 mt-1 font-medium">{day.durationHours} Hours duration</p>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* 5. DETAILED DAY-BY-DAY ITINERARY */}
        <section id="detailed-itinerary-section" className="bg-white border border-zinc-200 p-6 sm:p-8 rounded-3xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-150 pb-5 mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#1E3B39]">Day-by-Day Activity Details</h2>
              <p className="text-xs text-zinc-500 mt-1">Detailed sightseeing plans, inclusions, and specialized tips.</p>
            </div>
            
            {/* Custom Tabs */}
            <div className="flex items-center space-x-1.5 overflow-x-auto py-1 max-w-full z-10">
              {trip.itineraryDays.map((day: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveDay(idx)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                    activeDay === idx
                      ? "bg-[#0DA590] text-white"
                      : "bg-white text-zinc-650 border border-zinc-200 hover:text-[#1E3B39] hover:bg-zinc-50"
                  }`}
                >
                  Day {day.dayNumber}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Day View */}
          {trip.itineraryDays[activeDay] && (() => {
            const currentDay = trip.itineraryDays[activeDay];
            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-zinc-100 pb-4 gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="h-8 w-8 rounded-full bg-[#0DA590] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      {currentDay.dayNumber}
                    </span>
                    <div>
                      <h3 className="text-xl font-extrabold text-[#1E3B39]">{currentDay.title}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Stay location: <span className="text-[#0DA590] font-bold">{currentDay.cityOrStay}</span></p>
                    </div>
                  </div>
                  {currentDay.durationHours && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#FAF8F5] text-zinc-500 border border-zinc-200 font-semibold shadow-sm">
                      Duration: {currentDay.durationHours} hrs
                    </span>
                  )}
                </div>

                {/* Day Description */}
                <div className="text-sm leading-relaxed text-zinc-650 space-y-4 font-medium">
                  {currentDay.description.split("\n\n").map((para: string, pIdx: number) => (
                    <p key={pIdx}>{para}</p>
                  ))}
                </div>

                {/* Inclusions & Exclusions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
                  {/* Inclusions */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1.5 text-emerald-600" /> Day Inclusions
                    </h4>
                    {currentDay.inclusions && currentDay.inclusions.length > 0 ? (
                      <ul className="space-y-1.5">
                        {currentDay.inclusions.map((inc: string, iIdx: number) => (
                          <li key={iIdx} className="text-xs text-zinc-600 flex items-start font-medium">
                            <span className="text-emerald-500 mr-2 font-bold">&bull;</span>
                            {inc}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-zinc-450 italic">No day-specific inclusions specified.</p>
                    )}
                  </div>

                  {/* Exclusions */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-red-650 uppercase tracking-widest flex items-center">
                      <XCircle className="h-4 w-4 mr-1.5 text-red-650" /> Day Exclusions
                    </h4>
                    {currentDay.exclusions && currentDay.exclusions.length > 0 ? (
                      <ul className="space-y-1.5">
                        {currentDay.exclusions.map((exc: string, eIdx: number) => (
                          <li key={eIdx} className="text-xs text-zinc-600 flex items-start font-medium">
                            <span className="text-red-500 mr-2 font-bold">&bull;</span>
                            {exc}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-zinc-450 italic">No day-specific exclusions specified.</p>
                    )}
                  </div>
                </div>

                {/* Tips section */}
                {((currentDay.customerLovedTips && currentDay.customerLovedTips.length > 0) || 
                  (currentDay.customerWatchOutTips && currentDay.customerWatchOutTips.length > 0)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                    {/* Loved Tips */}
                    {currentDay.customerLovedTips && currentDay.customerLovedTips.length > 0 && (
                      <div className="bg-[#FF176B]/5 border border-[#FF176B]/15 p-4.5 rounded-2xl space-y-2">
                        <h5 className="text-xs font-bold text-[#FF176B] flex items-center">
                          <Heart className="h-4 w-4 mr-1.5 text-[#FF176B] fill-[#FF176B]/10" />
                          What Customers Love
                        </h5>
                        <ul className="space-y-1 text-xs text-zinc-650 font-medium">
                          {currentDay.customerLovedTips.map((tip: string, tIdx: number) => (
                            <li key={tIdx} className="flex items-start">
                              <span className="text-[#FF176B] mr-1.5 font-bold">&bull;</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Watchout Tips */}
                    {currentDay.customerWatchOutTips && currentDay.customerWatchOutTips.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200/60 p-4.5 rounded-2xl space-y-2">
                        <h5 className="text-xs font-bold text-amber-700 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-600" />
                          Watch-out Guidelines
                        </h5>
                        <ul className="space-y-1 text-xs text-zinc-650 font-medium">
                          {currentDay.customerWatchOutTips.map((tip: string, tIdx: number) => (
                            <li key={tIdx} className="flex items-start">
                              <span className="text-amber-500 mr-1.5 font-bold">&bull;</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </section>

        {/* 6. ACCOMMODATION SECTION */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-[#1E3B39]">Premium Accommodation Stays</h2>
            <p className="text-xs text-zinc-500 mt-1">Details of stays handpicked by the TripCraft team.</p>
          </div>

          {trip.accommodations.length === 0 ? (
            <div className="py-8 border border-zinc-200 border-dashed rounded-2xl text-center bg-white shadow-sm">
              <p className="text-zinc-400 text-sm">No stays configured.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {trip.accommodations.map((acc: any, idx: number) => {
                // Parse Checkin checkout dates
                const stayDurationDays = Math.ceil((new Date(acc.checkOutDate).getTime() - new Date(acc.checkInDate).getTime()) / (1000 * 60 * 60 * 24));
                const stayCover = acc.photos && acc.photos[0] ? acc.photos[0] : "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";

                // Parse nearby attractions JSON safely
                let attractions = [];
                try {
                  attractions = typeof acc.nearbyAttractions === "string" 
                    ? JSON.parse(acc.nearbyAttractions) 
                    : acc.nearbyAttractions;
                } catch(e) {}

                // Parse restaurants
                let restaurants = [];
                try {
                  restaurants = typeof acc.nearbyRestaurants === "string" 
                    ? JSON.parse(acc.nearbyRestaurants) 
                    : acc.nearbyRestaurants;
                } catch(e) {}

                return (
                  <div 
                    key={idx}
                    className="flex flex-col bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-md"
                  >
                    {/* Stay Image Carousel preview */}
                    <div className="relative aspect-video bg-zinc-100 w-full overflow-hidden">
                      <img src={stayCover} alt={acc.hotelName} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      
                      {/* Photo indicator badge */}
                      {acc.photos && acc.photos.length > 1 && (
                        <div className="absolute top-3 right-3 bg-zinc-950/70 border border-zinc-800 px-2.5 py-0.5 rounded text-[10px] text-zinc-300 font-bold backdrop-blur-sm shadow-sm">
                          1 / {acc.photos.length} Photos
                        </div>
                      )}

                      <div className="absolute bottom-3 left-4">
                        <span className="text-[10px] font-black uppercase bg-[#0DA590] text-white px-2.5 py-0.5 rounded shadow-sm">
                          {stayDurationDays} Nights Stay
                        </span>
                      </div>
                    </div>

                    {/* Stay details content */}
                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#FF176B] tracking-wider">{acc.location}</span>
                            <h3 className="font-extrabold text-lg text-[#1E3B39] mt-0.5 leading-snug">{acc.hotelName}</h3>
                          </div>
                          
                          {/* Rating score badge */}
                          {acc.ratingScore && (
                            <div className="text-right">
                              <span className="inline-flex items-center text-xs font-bold bg-[#0DA590]/10 text-[#0DA590] border border-[#0DA590]/20 px-2 py-0.5 rounded">
                                {acc.ratingScore}★
                              </span>
                              <p className="text-[9px] text-zinc-450 font-bold mt-0.5 uppercase tracking-wide">{acc.ratingLabel || "Guest score"}</p>
                            </div>
                          )}
                        </div>

                        {/* Room details */}
                        <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-b border-zinc-100 text-zinc-500 font-medium">
                          <div>
                            <p className="text-zinc-400 text-[9px] uppercase font-bold">Star Category</p>
                            <div className="flex items-center space-x-0.5 mt-0.5 text-amber-500">
                              {Array.from({ length: acc.starRating }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-500" />
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-zinc-400 text-[9px] uppercase font-bold">Meal Plan Included</p>
                            <p className="font-bold mt-0.5 text-[#1E3B39]">{acc.mealPlan}</p>
                          </div>
                          <div className="col-span-2 mt-1">
                            <p className="text-zinc-400 text-[9px] uppercase font-bold">Room Category</p>
                            <p className="font-bold text-[#1E3B39]">{acc.roomType}</p>
                          </div>
                        </div>

                        {/* Hotel facilities list */}
                        {acc.facilities && acc.facilities.length > 0 && (
                          <div className="py-1">
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1.5">Stay Amenities</p>
                            <div className="flex flex-wrap gap-1.5">
                              {acc.facilities.map((fac: string, fIdx: number) => (
                                <span key={fIdx} className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FAF8F5] text-zinc-600 border border-zinc-200 font-medium">
                                  {fac}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Nearby Locations JSON grid */}
                      {((attractions && attractions.length > 0) || (restaurants && restaurants.length > 0)) && (
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-100 text-[11px] font-medium text-zinc-500">
                          {/* Landmarks */}
                          {attractions && attractions.length > 0 && (
                            <div>
                              <p className="text-zinc-400 font-bold uppercase mb-1 text-[9px]">Nearby Attractions</p>
                              <ul className="space-y-1">
                                {attractions.map((item: any, i: number) => (
                                  <li key={i} className="truncate">
                                    &bull; {item.name} ({item.distanceKm} km)
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Nearby Restaurants */}
                          {restaurants && restaurants.length > 0 && (
                            <div>
                              <p className="text-zinc-400 font-bold uppercase mb-1 text-[9px]">Nearby Dining</p>
                              <ul className="space-y-1">
                                {restaurants.map((item: any, i: number) => (
                                  <li key={i} className="truncate">
                                    &bull; {item.name} ({item.distance})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 7. FLIGHT DETAILS TABLE */}
        {trip.flightDetails.length > 0 && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-[#1E3B39]">Flight Schedule</h2>
              <p className="text-xs text-zinc-500 mt-1">Confirmed flight ticket bookings and baggage allowances.</p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#FAF8F5] text-zinc-500 border-b border-zinc-200 font-bold">
                    <tr>
                      <th className="p-4">Flight / Sector</th>
                      <th className="p-4">Airline Code</th>
                      <th className="p-4">Departure Time</th>
                      <th className="p-4">Arrival Time</th>
                      <th className="p-4">Duration & Stops</th>
                      <th className="p-4 text-right">Baggage Limits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 text-[#1E3B39]">
                    {trip.flightDetails.map((f: any, idx: number) => (
                      <tr key={idx} className="hover:bg-zinc-50/30 text-xs font-semibold">
                        <td className="p-4 font-extrabold text-[#1E3B39]">{f.sector}</td>
                        <td className="p-4">{f.airline}</td>
                        <td className="p-4">{formatDateTime(f.departureDateTime)}</td>
                        <td className="p-4">{formatDateTime(f.arrivalDateTime)}</td>
                        <td className="p-4">
                          <p>{f.durationText}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">
                            {f.stops === 0 ? "Non-stop" : `${f.stops} Stop(s)`} 
                            {f.layoverInfo && ` (${f.layoverInfo})`}
                          </p>
                        </td>
                        <td className="p-4 text-right">
                          <p className="font-bold">Cabin: {f.carryOnBaggageKg || 7}kg</p>
                          <p className="text-[10px] text-zinc-400 font-medium">Cargo: {f.checkInBaggageKg || 20}kg</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 8. ADD-ONS SECTION */}
        {trip.addOns.length > 0 && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-[#1E3B39]">Included Add-ons & Visa Services</h2>
              <p className="text-xs text-zinc-500 mt-1">Visa packages, insurances, or travel passes included in the itinerary.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trip.addOns.map((addon: any, idx: number) => {
                // Parse description JSON
                let desc: any = {};
                try {
                  desc = typeof addon.description === "string" 
                    ? JSON.parse(addon.description) 
                    : addon.description;
                } catch(e) {}

                return (
                  <div key={idx} className="bg-white border border-zinc-200 p-6 rounded-3xl flex justify-between items-start shadow-sm">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="h-6 w-6 bg-[#0DA590]/10 text-[#0DA590] rounded-lg flex items-center justify-center font-bold text-xs">
                          +
                        </span>
                        <h4 className="font-bold text-[#1E3B39] text-md">{addon.name}</h4>
                      </div>
                      
                      {desc?.visaType && (
                        <div className="text-xs text-zinc-500 space-y-1 pt-1.5 font-medium">
                          <p><span className="text-zinc-400">Visa Type:</span> {desc.visaType}</p>
                          {desc.length && <p><span className="text-zinc-400">Duration:</span> {desc.length}</p>}
                          {desc.validity && <p><span className="text-zinc-400">Validity:</span> {desc.validity}</p>}
                        </div>
                      )}
                      
                      {desc?.details && (
                        <p className="text-xs text-zinc-450 leading-relaxed pt-2 italic font-medium">{desc.details}</p>
                      )}
                    </div>

                    <span className="text-xs font-bold text-[#0DA590] bg-[#0DA590]/10 border border-[#0DA590]/20 px-3 py-1 rounded-xl whitespace-nowrap shadow-sm">
                      ₹{addon.price.toLocaleString()} {addon.priceType}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 9. RESTAURANT SUGGESTIONS SECTION */}
        {trip.restaurantSuggestions.length > 0 && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-[#1E3B39]">Travel Dining Recommendations</h2>
              <p className="text-xs text-zinc-500 mt-1">Handpicked dining spots, beach clubs, and night spots grouped by area.</p>
            </div>

            <div className="space-y-8">
              {Object.keys(groupedRestaurants).map((locationName) => (
                <div key={locationName} className="bg-white border border-zinc-200 p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">
                  <div className="border-b border-zinc-150 pb-3 flex items-center">
                    <MapPin className="h-5 w-5 mr-1.5 text-[#0DA590]" />
                    <h3 className="text-lg font-black text-[#1E3B39]">Dining in {locationName}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.keys(groupedRestaurants[locationName]).map((cuisineName) => (
                      <div key={cuisineName} className="space-y-3.5">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">{cuisineName} Options</span>
                        
                        <div className="space-y-3">
                          {groupedRestaurants[locationName][cuisineName].map((rest: any, rIdx: number) => (
                            <div 
                              key={rIdx} 
                              className="bg-[#FAF8F5] border border-zinc-200/80 p-4 rounded-2xl flex justify-between items-center shadow-sm"
                            >
                              <div>
                                <h4 className="font-bold text-[#1E3B39] text-sm">{rest.name}</h4>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">{rest.category}</span>
                                  {rest.rating && (
                                    <span className="flex items-center text-[10px] text-amber-600 font-bold">
                                      <Star className="h-3 w-3 fill-amber-500 mr-0.5" />
                                      {rest.rating} ({rest.reviewCount || 100}+ reviews)
                                    </span>
                                  )}
                                </div>
                              </div>

                              {rest.isVeg && (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                                  Pure Veg
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 10. TERMS AND CONDITIONS */}
        {trip.termsAndConditions && (
          <section className="space-y-6 border-t border-zinc-250 pt-12">
            <div>
              <h2 className="text-2xl font-black text-[#1E3B39]">Trip Policies & Guidelines</h2>
              <p className="text-xs text-zinc-500 mt-1">Payment timelines, cancel penalty structures, and general notes.</p>
            </div>

            <div className="space-y-4">
              {/* Payment policy */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => setExpandedTerms(prev => ({ ...prev, payment: !prev.payment }))}
                  className="w-full px-6 py-4 flex justify-between items-center hover:bg-zinc-50/50 text-left font-bold text-sm text-[#1E3B39]"
                >
                  <span>1. Payment Policy & Booking Schedule</span>
                  {expandedTerms.payment ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                </button>
                {expandedTerms.payment && (
                  <div className="px-6 pb-5 pt-2 text-xs text-zinc-500 leading-relaxed space-y-2 border-t border-zinc-100 font-medium">
                    {trip.termsAndConditions.paymentPolicy.split("\n\n").map((p: string, i: number) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Cancellation policy */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => setExpandedTerms(prev => ({ ...prev, cancellation: !prev.cancellation }))}
                  className="w-full px-6 py-4 flex justify-between items-center hover:bg-zinc-50/50 text-left font-bold text-sm text-[#1E3B39]"
                >
                  <span>2. Cancellation Policy & Penalty Schedules</span>
                  {expandedTerms.cancellation ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                </button>
                {expandedTerms.cancellation && (
                  <div className="px-6 pb-5 pt-2 text-xs text-zinc-500 leading-relaxed space-y-2 border-t border-zinc-100 font-medium">
                    {trip.termsAndConditions.cancellationPolicy.split("\n\n").map((p: string, i: number) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Visa Rules */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => setExpandedTerms(prev => ({ ...prev, visa: !prev.visa }))}
                  className="w-full px-6 py-4 flex justify-between items-center hover:bg-zinc-50/50 text-left font-bold text-sm text-[#1E3B39]"
                >
                  <span>3. Visa Guidelines & Country Entry Rules</span>
                  {expandedTerms.visa ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                </button>
                {expandedTerms.visa && (
                  <div className="px-6 pb-5 pt-2 text-xs text-zinc-500 leading-relaxed space-y-2 border-t border-zinc-100 font-medium">
                    {trip.termsAndConditions.visaRules.split("\n\n").map((p: string, i: number) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* General notes */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => setExpandedTerms(prev => ({ ...prev, general: !prev.general }))}
                  className="w-full px-6 py-4 flex justify-between items-center hover:bg-zinc-50/50 text-left font-bold text-sm text-[#1E3B39]"
                >
                  <span>4. General Advisory Notes & Ground Rules</span>
                  {expandedTerms.general ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                </button>
                {expandedTerms.general && (
                  <div className="px-6 pb-5 pt-2 text-xs text-zinc-500 leading-relaxed space-y-2 border-t border-zinc-100 font-medium">
                    {trip.termsAndConditions.generalNotes.split("\n\n").map((p: string, i: number) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
