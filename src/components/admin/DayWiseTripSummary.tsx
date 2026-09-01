"use client";

import React, { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Calendar,
  MapPin,
  BedDouble,
  Utensils,
  Plane,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileDown,
  Edit,
  ArrowLeft,
  ChevronRight,
  Bus,
  Users,
  ShieldCheck,
  Star,
  Info,
  DollarSign,
  Coffee,
  Ticket,
  Luggage,
} from "lucide-react";
import { downloadTripPdf } from "@/lib/download-pdf";

interface ItineraryDayData {
  id?: string;
  dayNumber: number;
  cityOrStay: string;
  title: string;
  durationHours?: string | null;
  description: string;
  inclusions: string[];
  exclusions: string[];
  customerLovedTips: string[];
  customerWatchOutTips: string[];
  sortOrder?: number;
}

interface AccommodationData {
  id?: string;
  location: string;
  checkInDate: string | Date;
  checkOutDate: string | Date;
  hotelName: string;
  starRating: number;
  roomType: string;
  mealPlan: string;
  ratingScore?: number | null;
  ratingLabel?: string | null;
  facilities?: string[];
  photos?: string[];
}

interface FlightData {
  id?: string;
  sector: string;
  airline: string;
  departureDateTime: string | Date;
  arrivalDateTime: string | Date;
  durationText?: string | null;
  stops?: number;
  layoverInfo?: string | null;
  carryOnBaggageKg?: number | null;
  checkInBaggageKg?: number | null;
  cancellationPolicy?: string | null;
  flightNotes?: string | null;
  type?: string;
  travelTime?: string | null;
  isStartingTransfer?: boolean;
  isPackageIncluded?: boolean;
}

interface RestaurantData {
  id?: string;
  location: string;
  cuisineType: string;
  name: string;
  rating?: number | null;
  reviewCount?: number | null;
  isVeg?: boolean;
  category?: string;
}

interface AddOnData {
  id?: string;
  name: string;
  price: number;
  priceType: string;
  detailsJson?: any;
}

interface PriceQuoteItemData {
  id?: string;
  label: string;
  amount: number;
}

export interface TripFullData {
  id: string;
  title: string;
  pricingTitle?: string | null;
  destination: string;
  departureCity: string;
  startDate: string | Date;
  endDate: string | Date;
  durationDays: number;
  durationNights: number;
  numTravellers: number;
  consultantName: string;
  consultantPhone?: string;
  coverImage?: string | null;
  transportationArrangement?: string;
  startingTransferDetails?: string | null;
  packageTransportationDetails?: string | null;
  itineraryDays: ItineraryDayData[];
  accommodations: AccommodationData[];
  flightDetails: FlightData[];
  restaurantSuggestions?: RestaurantData[];
  addOns?: AddOnData[];
  priceQuoteItems?: PriceQuoteItemData[];
  tripFinancials?: {
    tcsPercentage?: number;
    tcsAmount?: number;
    totalWithTcs?: number;
    notes?: string | null;
  } | null;
  tripTerms?: {
    paymentPolicy?: string;
    cancellationPolicy?: string;
    visaRules?: string;
    generalNotes?: string;
  } | null;
}

interface DayWiseTripSummaryProps {
  trip: TripFullData;
  onClose?: () => void;
  isModal?: boolean;
}

export function DayWiseTripSummary({
  trip,
  onClose,
  isModal = false,
}: DayWiseTripSummaryProps) {
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | "all">("all");
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Safe Date parsing helpers
  const getSafeDate = (val: string | Date | undefined) => {
    if (!val) return new Date();
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const tripStartDate = getSafeDate(trip.startDate);
  const tripEndDate = getSafeDate(trip.endDate);

  const getDayDate = (dayNum: number) => {
    const d = new Date(tripStartDate);
    d.setUTCDate(d.getUTCDate() + (dayNum - 1));
    return d;
  };

  const formatDayDateString = (dayNum: number) => {
    try {
      const d = getDayDate(dayNum);
      return format(d, "EEEE, dd MMMM yyyy");
    } catch {
      return `Day ${dayNum}`;
    }
  };

  const formatShortDate = (d: Date | string) => {
    try {
      const dt = typeof d === "string" ? new Date(d) : d;
      return format(dt, "MMM dd, yyyy");
    } catch {
      return String(d);
    }
  };

  const formatTimeOnly = (d: Date | string) => {
    try {
      const dt = typeof d === "string" ? new Date(d) : d;
      return format(dt, "hh:mm a");
    } catch {
      return "";
    }
  };

  // Find accommodation active on a given day number
  const getAccommodationForDay = (dayNum: number) => {
    const dayDate = getDayDate(dayNum);
    const dayTimestamp = new Date(
      dayDate.getUTCFullYear(),
      dayDate.getUTCMonth(),
      dayDate.getUTCDate()
    ).getTime();

    return (trip.accommodations || []).find((acc) => {
      const cin = getSafeDate(acc.checkInDate);
      const cout = getSafeDate(acc.checkOutDate);
      const cinTimestamp = new Date(
        cin.getUTCFullYear(),
        cin.getUTCMonth(),
        cin.getUTCDate()
      ).getTime();
      const coutTimestamp = new Date(
        cout.getUTCFullYear(),
        cout.getUTCMonth(),
        cout.getUTCDate()
      ).getTime();

      // Check if within stay range
      return dayTimestamp >= cinTimestamp && dayTimestamp <= coutTimestamp;
    });
  };

  // Check if today is check-in or check-out day
  const getStayStatus = (acc: AccommodationData, dayNum: number) => {
    const dayDate = getDayDate(dayNum);
    const dayTimestamp = new Date(
      dayDate.getUTCFullYear(),
      dayDate.getUTCMonth(),
      dayDate.getUTCDate()
    ).getTime();

    const cin = getSafeDate(acc.checkInDate);
    const cout = getSafeDate(acc.checkOutDate);
    const cinTimestamp = new Date(
      cin.getUTCFullYear(),
      cin.getUTCMonth(),
      cin.getUTCDate()
    ).getTime();
    const coutTimestamp = new Date(
      cout.getUTCFullYear(),
      cout.getUTCMonth(),
      cout.getUTCDate()
    ).getTime();

    const isCheckIn = dayTimestamp === cinTimestamp;
    const isCheckOut = dayTimestamp === coutTimestamp;

    return { isCheckIn, isCheckOut };
  };

  // Find transportation / flights on this day
  const getTransfersForDay = (dayNum: number) => {
    const dayDate = getDayDate(dayNum);
    const dayTimestamp = new Date(
      dayDate.getUTCFullYear(),
      dayDate.getUTCMonth(),
      dayDate.getUTCDate()
    ).getTime();

    return (trip.flightDetails || []).filter((flight) => {
      const dep = getSafeDate(flight.departureDateTime);
      const depTimestamp = new Date(
        dep.getUTCFullYear(),
        dep.getUTCMonth(),
        dep.getUTCDate()
      ).getTime();
      return depTimestamp === dayTimestamp;
    });
  };

  // Match restaurant suggestions for a city/day
  const getRestaurantsForCity = (city: string) => {
    if (!city || !trip.restaurantSuggestions) return [];
    return trip.restaurantSuggestions.filter(
      (r) =>
        r.location.toLowerCase().includes(city.toLowerCase()) ||
        city.toLowerCase().includes(r.location.toLowerCase())
    );
  };

  // Determine meal inclusion details
  const getMealInclusions = (
    day: ItineraryDayData,
    acc: AccommodationData | undefined
  ) => {
    const plan = acc?.mealPlan?.toLowerCase() || "";
    const inclusionsText = (day.inclusions || []).join(" ").toLowerCase();
    const descText = (day.description || "").toLowerCase();

    // Breakfast
    let breakfastIncluded = false;
    let breakfastNote = "Not Included";
    if (
      plan.includes("cp") ||
      plan.includes("breakfast") ||
      plan.includes("map") ||
      plan.includes("ap") ||
      inclusionsText.includes("breakfast") ||
      descText.includes("breakfast")
    ) {
      breakfastIncluded = true;
      breakfastNote = plan ? `Included (${acc?.mealPlan})` : "Included in Itinerary";
    }

    // Lunch
    let lunchIncluded = false;
    let lunchNote = "Explore Local Cuisine";
    if (
      plan.includes("ap") ||
      plan.includes("full board") ||
      inclusionsText.includes("lunch") ||
      descText.includes("lunch")
    ) {
      lunchIncluded = true;
      lunchNote = "Included in Tour Package";
    }

    // Dinner
    let dinnerIncluded = false;
    let dinnerNote = "Explore Local Cuisine / Leisure";
    if (
      plan.includes("map") ||
      plan.includes("ap") ||
      plan.includes("dinner") ||
      plan.includes("half board") ||
      inclusionsText.includes("dinner") ||
      descText.includes("dinner")
    ) {
      dinnerIncluded = true;
      dinnerNote = plan ? `Included (${acc?.mealPlan})` : "Included in Itinerary";
    }

    return {
      breakfast: { included: breakfastIncluded, note: breakfastNote },
      lunch: { included: lunchIncluded, note: lunchNote },
      dinner: { included: dinnerIncluded, note: dinnerNote },
    };
  };

  // Build sorted days list covering all days (Day 1 through Day N)
  const totalDaysCount = Math.max(
    trip.durationDays || 1,
    trip.itineraryDays?.length || 1
  );

  const daysList: ItineraryDayData[] = [];
  for (let i = 1; i <= totalDaysCount; i++) {
    const existing = (trip.itineraryDays || []).find((d) => d.dayNumber === i);
    if (existing) {
      daysList.push(existing);
    } else {
      daysList.push({
        dayNumber: i,
        cityOrStay: trip.destination || "Destination",
        title: `Day ${i} Leisure & Exploration`,
        description: "Scheduled activities and leisure time as per itinerary.",
        inclusions: [],
        exclusions: [],
        customerLovedTips: [],
        customerWatchOutTips: [],
      });
    }
  }

  const displayedDays =
    selectedDayFilter === "all"
      ? daysList
      : daysList.filter((d) => d.dayNumber === selectedDayFilter);

  const handleExportPDF = async () => {
    setDownloadingPdf(true);
    try {
      await downloadTripPdf(trip.id, trip.title);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      alert(`Export PDF Failed: ${err.message || "Could not generate PDF."}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Total price quotes
  const totalPrice = (trip.priceQuoteItems || []).reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return (
    <div className="bg-[#FAF8F5] text-[#14213D] font-sans antialiased min-h-screen flex flex-col">
      {/* Top Header & Quick Actions */}
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {onClose ? (
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-zinc-500 hover:text-[#14213D] hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Close Summary"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <Link
                href="/"
                className="p-2 rounded-lg text-zinc-500 hover:text-[#14213D] hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Return to Workspace Console"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            )}

            <div>
              <div className="flex items-center space-x-2 text-xs text-zinc-400 font-medium">
                <span className="text-[#B8944F] font-bold uppercase tracking-wider">
                  Admin Trip Summary
                </span>
                <span>•</span>
                <span>Day 1 to Day {totalDaysCount} Full Overview</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-[#14213D] font-fraunces truncate max-w-lg sm:max-w-2xl">
                {trip.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link
              href={`/trips/${trip.id}/edit`}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-zinc-200 hover:border-[#B8944F] rounded-lg text-xs font-bold text-zinc-700 hover:text-[#B8944F] transition-all shadow-2xs"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Trip</span>
            </Link>

            <button
              onClick={handleExportPDF}
              disabled={downloadingPdf}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>{downloadingPdf ? "Exporting..." : "Export PDF"}</span>
            </button>
          </div>
        </div>

        {/* Quick Day Filter Strip */}
        <div className="bg-[#FAF8F5] border-t border-zinc-200/80 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase mr-2 shrink-0">
              Jump to:
            </span>
            <button
              onClick={() => setSelectedDayFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedDayFilter === "all"
                  ? "bg-[#14213D] text-white shadow-xs"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
              }`}
            >
              All Days ({totalDaysCount} Days)
            </button>
            {daysList.map((d) => (
              <button
                key={d.dayNumber}
                onClick={() => setSelectedDayFilter(d.dayNumber)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedDayFilter === d.dayNumber
                    ? "bg-[#B8944F] text-white shadow-xs"
                    : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                }`}
              >
                Day {d.dayNumber}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Executive Summary Glance Bar */}
        <div className="bg-white border border-[#B8944F]/20 rounded-xl p-5 shadow-2xs craft-card">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
            <div className="pr-3">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                Destination & Route
              </span>
              <p className="text-xs font-bold text-[#14213D] flex items-center">
                <MapPin className="h-3.5 w-3.5 mr-1 text-[#B8944F] shrink-0" />
                {trip.destination}
              </p>
              <span className="text-[11px] text-zinc-500">
                Ex-{trip.departureCity}
              </span>
            </div>

            <div className="sm:pl-4 pr-3 pt-3 sm:pt-0">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                Trip Duration
              </span>
              <p className="text-xs font-bold text-[#A6572E]">
                {trip.durationDays} Days / {trip.durationNights} Nights
              </p>
              <span className="text-[11px] text-zinc-500">
                {formatShortDate(trip.startDate)} – {formatShortDate(trip.endDate)}
              </span>
            </div>

            <div className="sm:pl-4 pr-3 pt-3 sm:pt-0">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                Party Size
              </span>
              <p className="text-xs font-bold text-[#14213D] flex items-center">
                <Users className="h-3.5 w-3.5 mr-1 text-[#B8944F] shrink-0" />
                {trip.numTravellers} Travellers
              </p>
              <span className="text-[11px] text-zinc-500">
                Consultant: {trip.consultantName}
              </span>
            </div>

            <div className="sm:pl-4 pr-3 pt-3 sm:pt-0">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                Stays & Hotels
              </span>
              <p className="text-xs font-bold text-[#14213D] flex items-center">
                <BedDouble className="h-3.5 w-3.5 mr-1 text-[#B8944F] shrink-0" />
                {trip.accommodations?.length || 0} Hotels Configured
              </p>
              <span className="text-[11px] text-zinc-500">
                Full coverage planned
              </span>
            </div>

            <div className="sm:pl-4 pr-3 pt-3 sm:pt-0">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                Transfers & Flights
              </span>
              <p className="text-xs font-bold text-[#14213D] flex items-center">
                <Plane className="h-3.5 w-3.5 mr-1 text-[#B8944F] shrink-0" />
                {trip.flightDetails?.length || 0} Sectors / Transfers
              </p>
              <span className="text-[11px] text-zinc-500">
                {trip.transportationArrangement || "Planner"} Arranged
              </span>
            </div>

            <div className="sm:pl-4 pt-3 sm:pt-0">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                Quotation Total
              </span>
              <p className="text-sm font-bold text-[#14213D] font-mono">
                ₹{totalPrice.toLocaleString("en-IN")}
              </p>
              {trip.tripFinancials && (
                <span className="text-[10px] text-emerald-700 font-semibold">
                  Inc. {trip.tripFinancials.tcsPercentage}% TCS
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Day-by-Day Cards Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#14213D] font-fraunces flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-[#B8944F]" />
              <span>
                Complete Day-Wise Itinerary Plan (Day 1 – Day {totalDaysCount})
              </span>
            </h2>
            <span className="text-xs text-zinc-400 font-medium">
              Showing {displayedDays.length} of {daysList.length} days
            </span>
          </div>

          {displayedDays.map((day) => {
            const acc = getAccommodationForDay(day.dayNumber);
            const stayStatus = acc ? getStayStatus(acc, day.dayNumber) : null;
            const transfers = getTransfersForDay(day.dayNumber);
            const meals = getMealInclusions(day, acc);
            const restaurants = getRestaurantsForCity(day.cityOrStay);

            return (
              <div
                key={day.dayNumber}
                id={`day-summary-${day.dayNumber}`}
                className="bg-white border border-zinc-200/90 rounded-xl overflow-hidden shadow-2xs hover:border-[#B8944F]/40 transition-all craft-card"
              >
                {/* Day Header Ribbon */}
                <div className="bg-[#FAF8F5] border-b border-zinc-200/80 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 bg-[#B8944F] text-white rounded-lg text-xs font-black tracking-wide uppercase shadow-2xs">
                      Day {day.dayNumber}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-[#14213D]">
                          {formatDayDateString(day.dayNumber)}
                        </span>
                        <span className="text-zinc-300">•</span>
                        <span className="text-xs font-semibold text-[#A6572E] flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {day.cityOrStay || trip.destination}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-[#14213D] font-fraunces mt-0.5">
                        {day.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {day.durationHours && (
                      <span className="inline-flex items-center px-2.5 py-1 bg-white border border-zinc-200 rounded-md text-[11px] font-semibold text-zinc-600">
                        <Clock className="h-3 w-3 mr-1 text-[#B8944F]" />
                        {day.durationHours} Hours Tour
                      </span>
                    )}
                  </div>
                </div>

                {/* Day Body Grid: 4 Core Pillars */}
                <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column (7 cols): Sightseeing, Activities & Pro Tips */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Activity Description */}
                    <div>
                      <h4 className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider mb-1.5 flex items-center">
                        <Sparkles className="h-3.5 w-3.5 mr-1.5 text-[#B8944F]" />
                        Sightseeing Program & Itinerary
                      </h4>
                      <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-line bg-zinc-50/50 p-3.5 rounded-lg border border-zinc-150">
                        {day.description || "No specific itinerary notes provided for this day."}
                      </p>
                    </div>

                    {/* Day Inclusions & Exclusions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Inclusions */}
                      <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-lg">
                        <h5 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide flex items-center mb-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          Day Inclusions
                        </h5>
                        {day.inclusions && day.inclusions.length > 0 ? (
                          <ul className="space-y-1">
                            {day.inclusions.map((inc, i) => (
                              <li
                                key={i}
                                className="text-[11px] text-emerald-950 flex items-start"
                              >
                                <span className="text-emerald-500 mr-1.5">•</span>
                                <span>{inc}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[11px] text-emerald-600/80 italic">
                            Standard sightseeing package inclusions apply.
                          </p>
                        )}
                      </div>

                      {/* Exclusions */}
                      <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-lg">
                        <h5 className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide flex items-center mb-1.5">
                          <XCircle className="h-3.5 w-3.5 mr-1 text-zinc-400" />
                          Day Exclusions
                        </h5>
                        {day.exclusions && day.exclusions.length > 0 ? (
                          <ul className="space-y-1">
                            {day.exclusions.map((exc, i) => (
                              <li
                                key={i}
                                className="text-[11px] text-zinc-600 flex items-start"
                              >
                                <span className="text-zinc-400 mr-1.5">•</span>
                                <span>{exc}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[11px] text-zinc-400 italic">
                            Personal expenses & optional activities.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pro Tips / Watchouts if configured */}
                    {(day.customerLovedTips?.length > 0 ||
                      day.customerWatchOutTips?.length > 0) && (
                      <div className="p-3 bg-[#FAF8F5] border border-[#B8944F]/20 rounded-lg space-y-2">
                        {day.customerLovedTips?.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-[#B8944F] uppercase tracking-wide block">
                              ★ Recommended Tip / What Travellers Love:
                            </span>
                            <p className="text-[11px] text-zinc-700 mt-0.5">
                              {day.customerLovedTips.join(" • ")}
                            </p>
                          </div>
                        )}
                        {day.customerWatchOutTips?.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide block">
                              ⚠ Watch Out / Important Note:
                            </span>
                            <p className="text-[11px] text-amber-900 mt-0.5">
                              {day.customerWatchOutTips.join(" • ")}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column (5 cols): Hotel, Meals & Transportation */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Hotel / Stay Card */}
                    <div className="p-3.5 bg-white border border-zinc-200/90 rounded-lg shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider flex items-center">
                          <BedDouble className="h-3.5 w-3.5 mr-1.5 text-[#B8944F]" />
                          Hotel & Stay Details
                        </h4>
                        {stayStatus?.isCheckIn && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">
                            Check-in Today
                          </span>
                        )}
                        {stayStatus?.isCheckOut && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded">
                            Check-out Today
                          </span>
                        )}
                      </div>

                      {acc ? (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-[#14213D]">
                                {acc.hotelName}
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                {acc.roomType || "Standard Room"} • {acc.location}
                              </p>
                            </div>
                            <div className="flex items-center text-amber-500 text-xs">
                              {Array.from({ length: acc.starRating || 4 }).map(
                                (_, idx) => (
                                  <Star
                                    key={idx}
                                    className="h-3 w-3 fill-amber-400"
                                  />
                                )
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="px-2 py-0.5 bg-[#FAF8F5] border border-zinc-200 rounded text-[10px] font-semibold text-zinc-700">
                              Plan: {acc.mealPlan || "Room Only"}
                            </span>
                            {acc.ratingLabel && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">
                                {acc.ratingScore || 4.5}★ {acc.ratingLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400 italic py-1">
                          No separate overnight stay configured for this date (e.g.
                          Transit / Flight / Day Tour).
                        </p>
                      )}
                    </div>

                    {/* Meals Overview (Breakfast, Lunch, Dinner) */}
                    <div className="p-3.5 bg-white border border-zinc-200/90 rounded-lg shadow-2xs">
                      <h4 className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider mb-2.5 flex items-center">
                        <Utensils className="h-3.5 w-3.5 mr-1.5 text-[#B8944F]" />
                        Meals & Dining Plan
                      </h4>

                      <div className="grid grid-cols-3 gap-2">
                        {/* Breakfast */}
                        <div
                          className={`p-2 rounded-lg border text-center ${
                            meals.breakfast.included
                              ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                              : "bg-zinc-50 border-zinc-200 text-zinc-600"
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase block mb-0.5">
                            Breakfast
                          </span>
                          <span className="text-[11px] font-semibold block truncate">
                            {meals.breakfast.included ? "✓ Included" : "Optional"}
                          </span>
                        </div>

                        {/* Lunch */}
                        <div
                          className={`p-2 rounded-lg border text-center ${
                            meals.lunch.included
                              ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                              : "bg-zinc-50 border-zinc-200 text-zinc-600"
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase block mb-0.5">
                            Lunch
                          </span>
                          <span className="text-[11px] font-semibold block truncate">
                            {meals.lunch.included ? "✓ Included" : "Local Cuisine"}
                          </span>
                        </div>

                        {/* Dinner */}
                        <div
                          className={`p-2 rounded-lg border text-center ${
                            meals.dinner.included
                              ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                              : "bg-zinc-50 border-zinc-200 text-zinc-600"
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase block mb-0.5">
                            Dinner
                          </span>
                          <span className="text-[11px] font-semibold block truncate">
                            {meals.dinner.included ? "✓ Included" : "Leisure Plan"}
                          </span>
                        </div>
                      </div>

                      {/* Recommended Restaurants in this city if any */}
                      {restaurants.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-100">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">
                            Recommended Dining Nearby:
                          </span>
                          <div className="space-y-1">
                            {restaurants.slice(0, 2).map((r, rIdx) => (
                              <div
                                key={rIdx}
                                className="flex justify-between items-center text-[11px] bg-zinc-50 px-2 py-1 rounded"
                              >
                                <span className="font-semibold text-zinc-800 truncate">
                                  {r.name} ({r.cuisineType})
                                </span>
                                {r.rating && (
                                  <span className="text-amber-600 font-bold ml-2">
                                    ★ {r.rating}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transportation & Transfers */}
                    <div className="p-3.5 bg-white border border-zinc-200/90 rounded-lg shadow-2xs">
                      <h4 className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider mb-2 flex items-center">
                        <Bus className="h-3.5 w-3.5 mr-1.5 text-[#B8944F]" />
                        Transportation & Transfers
                      </h4>

                      {transfers.length > 0 ? (
                        <div className="space-y-2">
                          {transfers.map((fl, fIdx) => (
                            <div
                              key={fIdx}
                              className="p-2.5 bg-zinc-50 border border-zinc-200/80 rounded-md text-xs space-y-1"
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-[#14213D] flex items-center">
                                  {fl.type === "Flight" ? (
                                    <Plane className="h-3 w-3 mr-1 text-[#B8944F]" />
                                  ) : (
                                    <Bus className="h-3 w-3 mr-1 text-[#B8944F]" />
                                  )}
                                  {fl.sector}
                                </span>
                                <span className="text-[11px] font-semibold text-[#A6572E]">
                                  {fl.airline}
                                </span>
                              </div>

                              <div className="flex justify-between text-[11px] text-zinc-500">
                                <span>
                                  Dep: {formatTimeOnly(fl.departureDateTime)}
                                </span>
                                <span>
                                  Arr: {formatTimeOnly(fl.arrivalDateTime)}
                                </span>
                              </div>

                              {fl.durationText && (
                                <p className="text-[10px] text-zinc-400">
                                  Duration: {fl.durationText} •{" "}
                                  {fl.stops === 0 ? "Non-stop" : `${fl.stops} stop(s)`}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          {trip.packageTransportationDetails ||
                            (day.dayNumber === 1 && trip.startingTransferDetails) ||
                            `Standard private coach / local transfers arranged as per ${trip.transportationArrangement || "Planner"} program.`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Master Policies & Terms Glance */}
        {trip.tripTerms && (
          <div className="bg-white border border-zinc-200/90 rounded-xl p-5 shadow-2xs craft-card space-y-3">
            <h3 className="text-sm font-bold text-[#14213D] font-fraunces flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-[#B8944F]" />
              <span>Itinerary Policies, Visas & Terms Summary</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-150">
                <span className="font-bold text-[#14213D] block mb-1">
                  Payment Terms
                </span>
                <p className="text-zinc-600 line-clamp-3">
                  {trip.tripTerms.paymentPolicy || "Standard booking deposit terms apply."}
                </p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-150">
                <span className="font-bold text-[#14213D] block mb-1">
                  Cancellation Policy
                </span>
                <p className="text-zinc-600 line-clamp-3">
                  {trip.tripTerms.cancellationPolicy || "Strict operator cancellation policy."}
                </p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-150">
                <span className="font-bold text-[#14213D] block mb-1">
                  Visa & Passport Guidelines
                </span>
                <p className="text-zinc-600 line-clamp-3">
                  {trip.tripTerms.visaRules || "Minimum 6 months passport validity required."}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
