"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Plus, 
  Trash2, 
  Loader2, 
  Calendar, 
  MapPin, 
  Plane, 
  Bus,
  Train,
  Car,
  Clock,
  Coffee, 
  Utensils, 
  FileText, 
  DollarSign,
  PlusCircle,
  X,
  Check,
  FileDown,
  Pencil,
  Database,
  Star,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Eye,
  Landmark,
  BedDouble,
  Building2,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Table2,
  CalendarDays,
  Hotel,
  Info,
  Copy,
  Compass,
  Search,
  GripVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  ShieldCheck,
} from "lucide-react";
import { createTrip, updateTrip, getTripsListForSelector, getTripDetails } from "@/actions/trips";
import { getAllMasterDataForSelectors, createMasterFlightRoute } from "@/actions/master-data";
import { RichTextEditor } from "./RichTextEditor";
import { downloadTripPdf } from "@/lib/download-pdf";

interface TripFormWizardProps {
  initialData?: any;
  tripId?: string;
  onClose?: () => void;
  onSaved?: (tripId: string) => void;
}

const STEPS = [
  { number: 1, name: "Core Trip", icon: MapPin },
  { number: 2, name: "Day-wise Planning", icon: Table2 },
  { number: 3, name: "Day-by-Day Itinerary", icon: Calendar },
  { number: 4, name: "Stays & Accommodations", icon: Coffee },
  { number: 5, name: "Transportation", icon: Bus },
  { number: 6, name: "Optional Add-ons", icon: PlusCircle },
  { number: 7, name: "Restaurant & Club", icon: Utensils },
  { number: 8, name: "Master Policies & Guidelines", icon: FileText },
  { number: 9, name: "Price Quotes", icon: DollarSign },
];

export function TripFormWizard({ initialData, tripId, onClose, onSaved }: TripFormWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [needsAdminReview, setNeedsAdminReview] = useState<boolean>(() => {
    if (initialData?.needsAdminReview) return true;
    if (initialData?.validation?.needs_admin_review?.length > 0) return true;
    const hasHotelReview = initialData?.accommodations?.some((h: any) => h.needs_admin_review || h.needsAdminReview);
    const hasPlaceReview = initialData?.itineraryDays?.some((d: any) => d.needs_admin_review || d.needsAdminReview);
    return Boolean(hasHotelReview || hasPlaceReview);
  });

  // Master Data Cache
  const [masterData, setMasterData] = useState<{
    cities: any[];
    places: any[];
    consultants: any[];
    taxSetting: any;
    pricingLabels: any[];
    hotels: any[];
    flightRoutes: any[];
    addOns: any[];
    restaurants: any[];
    policyTemplates: any[];
    globalPolicy?: any;
    bannerImages: any[];
  }>({
    cities: [],
    places: [],
    consultants: [],
    taxSetting: { currentTcsPercentage: 5.0 },
    pricingLabels: [],
    hotels: [],
    flightRoutes: [],
    addOns: [],
    restaurants: [],
    policyTemplates: [],
    globalPolicy: null,
    bannerImages: [],
  });

  useEffect(() => {
    async function loadMasterData() {
      const res = await getAllMasterDataForSelectors();
      if (res.success && res.data) {
        setMasterData(res.data);
        // If creating a new trip, ensure initial TCS percentage is pulled from active tax setting
        if (!initialData && res.data.taxSetting) {
          setFormData((prev: any) => ({
            ...prev,
            tripFinancials: {
              ...prev.tripFinancials,
              tcsPercentage: res.data.taxSetting.currentTcsPercentage || 5.0,
            },
          }));
        }

        // Auto-apply single global policy if trip terms are empty or new trip
        const globalPol = res.data.globalPolicy;
        if (globalPol) {
          setPolicySourceCache({
            paymentPolicy: globalPol.paymentPolicy || "",
            cancellationPolicy: globalPol.cancellationPolicy || "",
            visaRules: globalPol.visaRules || "",
            generalNotes: globalPol.generalNotes || "",
          });

          setFormData((prev: any) => {
            const hasExistingTerms =
              prev.tripTerms &&
              (prev.tripTerms.paymentPolicy ||
                prev.tripTerms.cancellationPolicy ||
                prev.tripTerms.visaRules ||
                prev.tripTerms.generalNotes);
            if (!hasExistingTerms) {
              return {
                ...prev,
                tripTerms: {
                  paymentPolicy: globalPol.paymentPolicy || "",
                  cancellationPolicy: globalPol.cancellationPolicy || "",
                  visaRules: globalPol.visaRules || "",
                  generalNotes: globalPol.generalNotes || "",
                },
              };
            } else {
              setPolicySourceCache((cache) => ({
                paymentPolicy: prev.tripTerms.paymentPolicy || globalPol.paymentPolicy || cache.paymentPolicy,
                cancellationPolicy: prev.tripTerms.cancellationPolicy || globalPol.cancellationPolicy || cache.cancellationPolicy,
                visaRules: prev.tripTerms.visaRules || globalPol.visaRules || cache.visaRules,
                generalNotes: prev.tripTerms.generalNotes || globalPol.generalNotes || cache.generalNotes,
              }));
            }
            return prev;
          });
        }
      }
    }
    loadMasterData();
  }, [initialData]);

  const [isTitleCustomized, setIsTitleCustomized] = useState<boolean>(Boolean(initialData?.title));

  // Normalization helpers for add-ons and restaurants
  const normalizeInitialAddOns = (addOns: any[] = []) => {
    return (addOns || []).map((a: any) => {
      let dNum = a.dayNumber;
      let parsedDetails = a.detailsJson;
      if (typeof parsedDetails === "string") {
        try {
          parsedDetails = JSON.parse(parsedDetails);
        } catch (e) {}
      }
      if (!dNum && parsedDetails?.dayNumber) {
        dNum = Number(parsedDetails.dayNumber);
      }
      return {
        ...a,
        dayNumber: dNum ? Number(dNum) : 1,
        detailsJson: typeof parsedDetails === "object" && parsedDetails !== null ? parsedDetails : {},
      };
    });
  };

  const normalizeInitialRestaurants = (restaurants: any[] = []) => {
    return (restaurants || []).map((r: any) => {
      let dNum = r.dayNumber;
      let cat = r.category || "Restaurant";
      if (cat.includes("###DAY_")) {
        const parts = cat.split("###DAY_");
        cat = parts[0] || "Restaurant";
        dNum = parseInt(parts[1]) || 1;
      }
      return {
        ...r,
        category: cat,
        dayNumber: dNum ? Number(dNum) : 1,
      };
    });
  };

  // Main Form Data State
  const [formData, setFormData] = useState<any>(() => {
    if (initialData) {
      return {
        ...initialData,
        destination: initialData.destination || "",
        departureCity: initialData.departureCity || "",
        ownArrivalArrangement: initialData.ownArrivalArrangement || "",
        startDate: initialData.startDate
          ? new Date(initialData.startDate).toISOString().split("T")[0]
          : "",
        endDate: initialData.endDate
          ? new Date(initialData.endDate).toISOString().split("T")[0]
          : "",
        itineraryDays: initialData.itineraryDays || [],
        accommodations: initialData.accommodations || [],
        flightDetails: initialData.flightDetails || [],
        addOns: normalizeInitialAddOns(initialData.addOns),
        restaurantSuggestions: normalizeInitialRestaurants(initialData.restaurantSuggestions),
        priceQuoteItems: initialData.priceQuoteItems || [],
        tripFinancials: initialData.tripFinancials || {
          tcsPercentage: 5.0,
          tcsAmount: 0,
          totalWithTcs: 0,
          notes: "",
        },
        tripTerms: initialData.tripTerms || {
          paymentPolicy: "",
          cancellationPolicy: "",
          visaRules: "",
          generalNotes: "",
        },
      };
    }
    return {
      title: "",
      destination: "",
      departureCity: "",
      ownArrivalArrangement: "",
      coverImage: null,
      pricingPlanTitle: "Luxury Standard Plan",
      startDate: "",
      endDate: "",
      durationDays: 1,
      durationNights: 0,
      numTravellers: 2,
      consultantName: "",
      consultantPhone: "",
      transportationArrangement: "Planner",
      startingTransferDetails: "",
      packageTransportationDetails: "",
      priceQuoteItems: [],
      tripFinancials: {
        tcsPercentage: 5.0,
        tcsAmount: 0,
        totalWithTcs: 0,
        notes: "",
      },
      itineraryDays: [],
      accommodations: [],
      flightDetails: [],
      addOns: [],
      restaurantSuggestions: [],
      tripTerms: {
        paymentPolicy: "",
        cancellationPolicy: "",
        visaRules: "",
        generalNotes: "",
      },
    };
  });

  const [selectedPolicyTemplateId, setSelectedPolicyTemplateId] = useState<string>("GLOBAL");
  const [policySourceCache, setPolicySourceCache] = useState<{
    paymentPolicy: string;
    cancellationPolicy: string;
    visaRules: string;
    generalNotes: string;
  }>({
    paymentPolicy: "",
    cancellationPolicy: "",
    visaRules: "",
    generalNotes: "",
  });

  // Sync formData whenever initialData updates (e.g. switching trips inside dashboard)
  useEffect(() => {
    if (initialData) {
      if (initialData.tripTerms) {
        setPolicySourceCache((prev) => ({
          paymentPolicy: initialData.tripTerms.paymentPolicy || prev.paymentPolicy,
          cancellationPolicy: initialData.tripTerms.cancellationPolicy || prev.cancellationPolicy,
          visaRules: initialData.tripTerms.visaRules || prev.visaRules,
          generalNotes: initialData.tripTerms.generalNotes || prev.generalNotes,
        }));
      }
      setFormData({
        ...initialData,
        destination: initialData.destination || "",
        departureCity: initialData.departureCity || "",
        ownArrivalArrangement: initialData.ownArrivalArrangement || "",
        startDate: initialData.startDate
          ? new Date(initialData.startDate).toISOString().split("T")[0]
          : "",
        endDate: initialData.endDate
          ? new Date(initialData.endDate).toISOString().split("T")[0]
          : "",
        itineraryDays: (initialData.itineraryDays || []).map((d: any) => ({
          ...d,
          transportOrder: d.transportOrder || d.placeTransportMap?.transport_order || "intercity_first",
          interCityTransferId: d.interCityTransferId || d.placeTransportMap?.inter_city_transfer_id || null,
          localTransportIds: d.localTransportIds || d.placeTransportMap?.local_transport_ids || [],
        })),
        accommodations: initialData.accommodations || [],
        flightDetails: initialData.flightDetails || [],
        addOns: normalizeInitialAddOns(initialData.addOns),
        restaurantSuggestions: normalizeInitialRestaurants(initialData.restaurantSuggestions),
        priceQuoteItems: initialData.priceQuoteItems || [],
        tripFinancials: initialData.tripFinancials || {
          tcsPercentage: 5.0,
          tcsAmount: 0,
          totalWithTcs: 0,
          notes: "",
        },
        tripTerms: initialData.tripTerms || {
          paymentPolicy: "",
          cancellationPolicy: "",
          visaRules: "",
          generalNotes: "",
        },
      });
    }
  }, [initialData]);

  // Date formatted helper (e.g. "03 Sep 2026")
  const formatDayDate = (startDateStr: string, dayOffset: number) => {
    if (!startDateStr) return null;
    const d = new Date(startDateStr);
    d.setDate(d.getDate() + dayOffset);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Helper for synchronizing dynamic Accommodations from Itinerary Day selections
  const syncAccommodationsFromDays = (days: any[], startDateStr: string, endDateStr: string) => {
    return days
      .filter((d: any) => d.hotelName)
      .map((d: any) => {
        const matchedHotel = masterData.hotels.find(
          (h) => h.name === d.hotelName || h.id === d.hotelId
        );
        return {
          dayNumber: d.dayNumber,
          hotelName: d.hotelName,
          location:
            d.cityOrStay ||
            (matchedHotel?.city
              ? `${matchedHotel.city.name}, ${matchedHotel.city.country}`
              : ""),
          checkInDate: startDateStr || "",
          checkOutDate: endDateStr || "",
          starRating: matchedHotel?.starRating || 4,
          roomType: matchedHotel?.roomTypes?.[0] || "Luxury Deluxe Room",
          mealPlan: matchedHotel?.mealPlans?.[0] || "Daily Buffet Breakfast (CP)",
          ratingScore: matchedHotel?.guestScore || 4.8,
          ratingLabel: matchedHotel?.guestScoreLabel || "Very Good",
          facilities: matchedHotel?.facilities || [],
          nearbyAttractions: matchedHotel?.nearbyAttractions || [],
          nearbyRestaurants: matchedHotel?.nearbyRestaurants || [],
          photos: matchedHotel?.photos || [],
          pricePerNight: d.hotelPricePerNight || matchedHotel?.pricePerNight || null,
          pricePerPerson: d.hotelPricePerPerson || matchedHotel?.pricePerPerson || null,
        };
      });
  };

  // Sync Start Date & End Date with dynamic Days & Nights
  const syncDatesAndDuration = (startDateStr: string, endDateStr: string) => {
    let daysCount = formData.durationDays || 1;
    let nightsCount = formData.durationNights || 0;

    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      const diffTime = end.getTime() - start.getTime();
      daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
      nightsCount = Math.max(0, daysCount - 1);
    }

    setFormData((prev: any) => {
      let currentDays = [...(prev.itineraryDays || [])];
      if (currentDays.length < daysCount) {
        for (let i = currentDays.length; i < daysCount; i++) {
          const defaultCity = prev.destination ? prev.destination.split(",")[0].trim() : "";
          currentDays.push({
            dayNumber: i + 1,
            cityOrStay: defaultCity,
            title: "",
            durationHours: "",
            description: "",
            places: [] as string[],
            hotelId: null,
            hotelName: null,
            hotelPricePerNight: null,
            hotelPricePerPerson: null,
            inclusions: [] as string[],
            exclusions: [] as string[],
            sortOrder: i + 1,
          });
        }
      } else if (currentDays.length > daysCount) {
        currentDays = currentDays.slice(0, daysCount);
      }

      const syncedAccommodations = syncAccommodationsFromDays(currentDays, startDateStr, endDateStr);

      return {
        ...prev,
        startDate: startDateStr,
        endDate: endDateStr,
        durationDays: daysCount,
        durationNights: nightsCount,
        itineraryDays: currentDays,
        accommodations: syncedAccommodations,
      };
    });
  };

  // Auto-calculate Duration Days and Nights from Start and End Dates on change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (diffDays >= 1 && diffDays !== formData.durationDays) {
        syncDatesAndDuration(formData.startDate, formData.endDate);
      }
    }
  }, [formData.startDate, formData.endDate]);

  // Recalculate TCS and Total Amount whenever Price Items, TCS %, or Number of Travellers changes
  useEffect(() => {
    const numTravellers = Number(formData.numTravellers || 1);
    const perPersonSubtotal = (formData.priceQuoteItems || []).reduce(
      (acc: number, item: any) => acc + Number(item.amount || 0),
      0
    );
    const tcsPct = Number(formData.tripFinancials?.tcsPercentage ?? 5.0);
    const perPersonTcs = perPersonSubtotal * (tcsPct / 100);
    const perPersonTotal = perPersonSubtotal + perPersonTcs;

    const totalTcsAmount = perPersonTcs * numTravellers;
    const finalTotal = perPersonTotal * numTravellers;

    setFormData((prev: any) => ({
      ...prev,
      tripFinancials: {
        ...prev.tripFinancials,
        tcsAmount: Math.round(totalTcsAmount * 100) / 100,
        totalWithTcs: Math.round(finalTotal * 100) / 100,
      },
    }));
  }, [formData.priceQuoteItems, formData.tripFinancials?.tcsPercentage, formData.numTravellers]);

  // Auto-assign Consultant based on Departure City
  const [autoMatchedConsultant, setAutoMatchedConsultant] = useState<string | null>(null);

  useEffect(() => {
    if (!formData.departureCity) {
      setAutoMatchedConsultant(null);
      return;
    }

    const cleanInputCity = formData.departureCity.split("(")[0].trim().toLowerCase();
    if (!cleanInputCity) {
      setAutoMatchedConsultant(null);
      return;
    }

    const matched = masterData.consultants.find((c: any) => {
      const consultantCity = (c.departureCity || c.hubCity || c.assigned_departure_city || "").trim().toLowerCase();
      if (!consultantCity) return false;
      return (
        consultantCity === cleanInputCity ||
        consultantCity.includes(cleanInputCity) ||
        cleanInputCity.includes(consultantCity)
      );
    });

    if (matched) {
      const displayCity = matched.departureCity || matched.hubCity || "";
      setAutoMatchedConsultant(`${matched.name}${displayCity ? ` (${displayCity})` : ""}`);
    } else {
      setAutoMatchedConsultant(null);
    }
  }, [formData.departureCity, masterData.consultants]);

  const generateAutoTitle = (origin: string, dest: string, itineraryDays: any[] = []) => {
    const cleanOrigin = origin ? origin.split("(")[0].trim() : "";
    const cleanDest = dest ? dest.split(",")[0].trim() : "";
    if (!cleanOrigin && !cleanDest) return "";

    const text = JSON.stringify(itineraryDays || []).toLowerCase();
    let tripType = "Getaway";
    if (
      text.includes("safari") ||
      text.includes("trek") ||
      text.includes("adventure") ||
      text.includes("hike") ||
      text.includes("rafting")
    ) {
      tripType = "Adventure";
    } else if (
      text.includes("heritage") ||
      text.includes("temple") ||
      text.includes("fort") ||
      text.includes("palace")
    ) {
      tripType = "Heritage Tour";
    } else if (
      text.includes("beach") ||
      text.includes("honeymoon") ||
      text.includes("luxury") ||
      text.includes("resort")
    ) {
      tripType = "Getaway";
    } else if (text.includes("family") || text.includes("vacation")) {
      tripType = "Vacation";
    }

    if (!cleanOrigin) return `${cleanDest} ${tripType}`;
    if (!cleanDest) return `Trip from ${cleanOrigin}`;
    return `${cleanOrigin} to ${cleanDest} ${tripType}`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "title") {
      setIsTitleCustomized(true);
      setFormData((prev: any) => ({ ...prev, title: value }));
    } else if (name === "startDate") {
      syncDatesAndDuration(value, formData.endDate);
    } else if (name === "endDate") {
      syncDatesAndDuration(formData.startDate, value);
    } else if (name === "destination") {
      setFormData((prev: any) => {
        const newTitle = !isTitleCustomized
          ? generateAutoTitle(prev.departureCity, value, prev.itineraryDays)
          : prev.title;
        return {
          ...prev,
          destination: value,
          title: newTitle || prev.title,
        };
      });
    } else if (name === "departureCity") {
      const cleanVal = (value || "").split("(")[0].trim().toLowerCase();
      const matchedC = cleanVal && masterData.consultants.length > 0
        ? masterData.consultants.find((c: any) => {
            const dep = (c.departureCity || c.hubCity || c.assigned_departure_city || "").trim().toLowerCase();
            if (!dep) return false;
            return dep === cleanVal || dep.includes(cleanVal) || cleanVal.includes(dep);
          })
        : null;

      setFormData((prev: any) => {
        const newTitle = !isTitleCustomized
          ? generateAutoTitle(value, prev.destination, prev.itineraryDays)
          : prev.title;
        return {
          ...prev,
          departureCity: value,
          title: newTitle || prev.title,
          consultantName: matchedC ? matchedC.name : "",
          consultantPhone: matchedC ? (matchedC.phone || "") : "",
        };
      });

      if (matchedC) {
        const displayCity = matchedC.departureCity || matchedC.hubCity || "";
        setAutoMatchedConsultant(`${matchedC.name}${displayCity ? ` (${displayCity})` : ""}`);
      } else {
        setAutoMatchedConsultant(null);
      }
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setError(null);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload cover image.");
      }

      setFormData((prev: any) => ({ ...prev, coverImage: data.url }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleExportPDF = async () => {
    if (!tripId) return;
    setDownloading(true);
    try {
      await downloadTripPdf(tripId, formData.title);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      alert(`Export PDF Failed: ${err.message || "Could not generate PDF."}`);
    } finally {
      setDownloading(false);
    }
  };

  const validateStep = (): boolean => {
    setError(null);
    return true;
  };

  const isStep1Incomplete = () => {
    return false;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [availableTrips, setAvailableTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [cloningTripId, setCloningTripId] = useState<string | null>(null);

  const openDuplicateModal = async () => {
    setDuplicateModalOpen(true);
    setLoadingTrips(true);
    try {
      const res = await getTripsListForSelector();
      if (res.success && res.data) {
        setAvailableTrips(res.data);
      }
    } catch (err) {
      console.error("Error loading trips for duplicate selector:", err);
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleCopyTripData = async (sourceTripId: string) => {
    setCloningTripId(sourceTripId);
    try {
      const res = await getTripDetails(sourceTripId);
      if (res.success && res.data) {
        const src = res.data;
        setFormData({
          title: `${src.title} (Copy)`,
          pricingPlanTitle: src.pricingTitle || "Luxury Standard Plan",
          destination: src.destination || "",
          departureCity: src.departureCity || "",
          coverImage: src.coverImage || null,
          startDate: src.startDate ? new Date(src.startDate).toISOString().split("T")[0] : "",
          endDate: src.endDate ? new Date(src.endDate).toISOString().split("T")[0] : "",
          durationDays: src.durationDays || 1,
          durationNights: src.durationNights || 0,
          numTravellers: src.numTravellers || 2,
          consultantName: src.consultantName || "",
          consultantPhone: src.consultantPhone || "",
          transportationArrangement: src.transportationArrangement || "Planner",
          startingTransferDetails: src.startingTransferDetails || "",
          packageTransportationDetails: src.packageTransportationDetails || "",
          priceQuoteItems: (src.priceQuoteItems || []).map((item: any) => ({
            label: item.label,
            amount: item.amount,
            sortOrder: item.sortOrder,
          })),
          tripFinancials: src.tripFinancials || {
            tcsPercentage: 5.0,
            tcsAmount: 0,
            totalWithTcs: 0,
            notes: "",
          },
          itineraryDays: (src.itineraryDays || []).map((day: any) => ({
            dayNumber: day.dayNumber,
            cityOrStay: day.cityOrStay,
            title: day.title || "",
            durationHours: day.durationHours || "",
            description: day.description || "",
            places: day.places || [],
            hotelId: day.hotelId || null,
            hotelName: day.hotelName || null,
            hotelPricePerNight: day.hotelPricePerNight || null,
            hotelPricePerPerson: day.hotelPricePerPerson || null,
            inclusions: day.inclusions || [],
            exclusions: day.exclusions || [],
            placeTransportMap: day.placeTransportMap || {},
            transportOrder: day.transportOrder || day.placeTransportMap?.transport_order || "intercity_first",
            interCityTransferId: day.interCityTransferId || day.placeTransportMap?.inter_city_transfer_id || null,
            localTransportIds: day.localTransportIds || day.placeTransportMap?.local_transport_ids || [],
            sortOrder: day.sortOrder || day.dayNumber,
          })),
          accommodations: (src.accommodations || []).map((acc: any) => ({
            location: acc.location,
            checkInDate: acc.checkInDate ? new Date(acc.checkInDate).toISOString().split("T")[0] : "",
            checkOutDate: acc.checkOutDate ? new Date(acc.checkOutDate).toISOString().split("T")[0] : "",
            hotelName: acc.hotelName,
            starRating: acc.starRating || 4,
            roomType: acc.roomType || "Luxury Deluxe Room",
            mealPlan: acc.mealPlan || "Daily Buffet Breakfast (CP)",
            ratingScore: acc.ratingScore || 4.8,
            ratingLabel: acc.ratingLabel || "Very Good",
            facilities: acc.facilities || [],
            nearbyAttractions: acc.nearbyAttractions || [],
            nearbyRestaurants: acc.nearbyRestaurants || [],
            photos: acc.photos || [],
          })),
          flightDetails: (src.flightDetails || []).map((f: any) => ({
            sector: f.sector,
            airline: f.airline,
            departureDateTime: f.departureDateTime ? new Date(f.departureDateTime).toISOString().slice(0, 16) : "",
            arrivalDateTime: f.arrivalDateTime ? new Date(f.arrivalDateTime).toISOString().slice(0, 16) : "",
            durationText: f.durationText || "Direct",
            stops: f.stops || 0,
            layoverInfo: f.layoverInfo || "",
            carryOnBaggageKg: f.carryOnBaggageKg || 7,
            checkInBaggageKg: f.checkInBaggageKg || 20,
            cancellationPolicy: f.cancellationPolicy || "",
            flightNotes: f.flightNotes || "",
            type: f.type || "Flight",
            travelTime: f.travelTime || "",
            isStartingTransfer: Boolean(f.isStartingTransfer),
            isPackageIncluded: Boolean(f.isPackageIncluded),
          })),
          addOns: normalizeInitialAddOns(src.addOns),
          restaurantSuggestions: normalizeInitialRestaurants(src.restaurantSuggestions),
          tripTerms: src.tripTerms || {
            paymentPolicy: "",
            cancellationPolicy: "",
            visaRules: "",
            generalNotes: "",
          },
        });
        setDuplicateModalOpen(false);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert(res.error || "Failed to load trip to duplicate.");
      }
    } catch (err) {
      console.error("Error duplicating trip data into form:", err);
      alert("Error copying trip details.");
    } finally {
      setCloningTripId(null);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setError(null);

    try {
      let res;
      if (tripId) {
        res = await updateTrip(tripId, formData);
      } else {
        res = await createTrip(formData);
      }

      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3500);
        const savedId = (res as any).tripId || tripId;
        if (onSaved && savedId) {
          onSaved(savedId);
        } else {
          router.refresh();
        }
      } else {
        setError(res.error || "An error occurred saving itinerary.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // DYNAMIC REPEATERS STATE
  // ==========================================

  // Step 9: Price Quotes
  const [newPriceLabel, setNewPriceLabel] = useState("");
  const [newPriceAmt, setNewPriceAmt] = useState("");

  const addPriceItem = () => {
    if (!newPriceLabel || !newPriceAmt) return;
    const newItem = {
      label: newPriceLabel,
      amount: Number(newPriceAmt),
      sortOrder: formData.priceQuoteItems.length,
    };
    setFormData((prev: any) => ({
      ...prev,
      priceQuoteItems: [...prev.priceQuoteItems, newItem],
    }));
    setNewPriceLabel("");
    setNewPriceAmt("");
  };

  const removePriceItem = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      priceQuoteItems: prev.priceQuoteItems.filter((_: any, i: number) => i !== index),
    }));
  };

  // Step 2: Day Addition & Removal Helpers
  const addDay = () => {
    const nextDayNum = formData.itineraryDays.length + 1;
    const defaultCity = formData.destination ? formData.destination.split(",")[0].trim() : "";
    
    // Calculate new end date if start date is present
    let newEndDate = formData.endDate;
    if (formData.startDate) {
      const start = new Date(formData.startDate);
      start.setDate(start.getDate() + nextDayNum - 1);
      newEndDate = start.toISOString().split("T")[0];
    }

    const newDay = {
      dayNumber: nextDayNum,
      cityOrStay: defaultCity,
      title: "",
      durationHours: "",
      description: "",
      places: [] as string[],
      hotelId: null,
      hotelName: null,
      hotelPricePerNight: null,
      hotelPricePerPerson: null,
      inclusions: [] as string[],
      exclusions: [] as string[],
      sortOrder: nextDayNum,
    };
    setFormData((prev: any) => ({
      ...prev,
      durationDays: nextDayNum,
      durationNights: Math.max(0, nextDayNum - 1),
      endDate: newEndDate || prev.endDate,
      itineraryDays: [...prev.itineraryDays, newDay],
    }));
  };

  const removeDay = (index: number) => {
    const updated = formData.itineraryDays
      .filter((_: any, i: number) => i !== index)
      .map((day: any, i: number) => ({ ...day, dayNumber: i + 1, sortOrder: i + 1 }));
    
    let newEndDate = formData.endDate;
    if (formData.startDate && updated.length > 0) {
      const start = new Date(formData.startDate);
      start.setDate(start.getDate() + updated.length - 1);
      newEndDate = start.toISOString().split("T")[0];
    }

    setFormData((prev: any) => {
      const syncedAccommodations = syncAccommodationsFromDays(
        updated,
        prev.startDate,
        newEndDate || prev.endDate
      );
      return {
        ...prev,
        durationDays: Math.max(1, updated.length),
        durationNights: Math.max(0, updated.length - 1),
        endDate: newEndDate || prev.endDate,
        itineraryDays: updated,
        accommodations: syncedAccommodations,
      };
    });
  };

  const updateDayField = (index: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const days = [...prev.itineraryDays];
      days[index] = { ...days[index], [field]: value };
      return { ...prev, itineraryDays: days };
    });
  };

  const handleDayCityChange = (dIdx: number, newCityName: string) => {
    setFormData((prev: any) => {
      const days = [...prev.itineraryDays];
      const currentDay = { ...days[dIdx] };
      days[dIdx] = {
        ...currentDay,
        cityOrStay: newCityName,
        hotelId: null,
        hotelName: null,
        hotelPricePerNight: null,
        hotelPricePerPerson: null,
        places: [],
        inclusions: [],
        exclusions: [],
        description: currentDay.description || "",
        title: currentDay.title || "",
      };

      const syncedAccommodations = syncAccommodationsFromDays(days, prev.startDate, prev.endDate);
      return { ...prev, itineraryDays: days, accommodations: syncedAccommodations };
    });
  };

  const handleDayHotelChange = (dIdx: number, hotelName: string) => {
    const hotelObj = masterData.hotels.find((h) => h.name === hotelName);
    setFormData((prev: any) => {
      const days = [...prev.itineraryDays];
      if (hotelObj) {
        days[dIdx] = {
          ...days[dIdx],
          hotelId: hotelObj.id,
          hotelName: hotelObj.name,
          hotelPricePerNight: hotelObj.pricePerNight || null,
          hotelPricePerPerson: hotelObj.pricePerPerson || null,
        };
      } else {
        days[dIdx] = {
          ...days[dIdx],
          hotelId: null,
          hotelName: null,
          hotelPricePerNight: null,
          hotelPricePerPerson: null,
        };
      }

      const syncedAccommodations = syncAccommodationsFromDays(days, prev.startDate, prev.endDate);
      return { ...prev, itineraryDays: days, accommodations: syncedAccommodations };
    });
  };

  const isHotelAllMealsIncluded = (hotelNameOrObj: any, day?: any) => {
    if (!hotelNameOrObj) return false;
    const hotel =
      typeof hotelNameOrObj === "string"
        ? masterData.hotels.find((h) => h.name.toLowerCase() === hotelNameOrObj.toLowerCase())
        : hotelNameOrObj;

    const mealPlans: string[] = [];
    if (Array.isArray(hotel?.mealPlans)) {
      mealPlans.push(...hotel.mealPlans);
    }
    if (hotel?.mealPlan) {
      mealPlans.push(hotel.mealPlan);
    }

    if (day) {
      const dayAcc = formData.accommodations?.find(
        (a: any) =>
          a.hotelName?.toLowerCase() === (day.hotelName || "").toLowerCase() ||
          a.dayNumber === day.dayNumber
      );
      if (dayAcc?.mealPlan) {
        mealPlans.push(dayAcc.mealPlan);
      }
    }

    const text = mealPlans.map((m) => String(m).toLowerCase()).join(" ");
    if (!text) return false;

    if (
      text.includes("all meals") ||
      text.includes("full board") ||
      text.includes("all inclusive") ||
      text.includes("all-inclusive") ||
      text.includes("american plan") ||
      /\bap\b/i.test(text) ||
      /\(ap\)/i.test(text)
    ) {
      return true;
    }

    const hasBreakfast = text.includes("breakfast");
    const hasLunch = text.includes("lunch");
    const hasDinner = text.includes("dinner");
    if (hasBreakfast && hasLunch && hasDinner) {
      return true;
    }

    return false;
  };

  const handleAddMasterRestaurantToDay = (dayNum: number, currCity: string, restName: string) => {
    if (!restName) return;
    const rest = masterData.restaurants.find((r) => r.name === restName);
    if (!rest) return;

    const newItem = {
      dayNumber: dayNum,
      location: rest.city?.name || currCity || "Local Destination",
      cuisineType: rest.cuisineType || "Local & International",
      name: rest.name,
      rating: rest.starRating || 4.5,
      reviewCount: rest.reviewsCount || 100,
      isVeg: Boolean(rest.offersPureVegJain),
      category: rest.categoryType || "Restaurant",
    };

    setFormData((prev: any) => ({
      ...prev,
      restaurantSuggestions: [...(prev.restaurantSuggestions || []), newItem],
    }));
  };

  const handleRemoveDayRestaurant = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      restaurantSuggestions: (prev.restaurantSuggestions || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const handleAddMasterAddOnToDay = (dayNum: number, addonName: string) => {
    if (!addonName) return;
    const addon = masterData.addOns.find((a) => a.name === addonName);
    if (!addon) return;

    const newItem = {
      dayNumber: dayNum,
      name: addon.name,
      detailsJson: {
        dayNumber: dayNum,
        visaType: addon.visaType || undefined,
        length: addon.validityLength || undefined,
        validity: addon.validityWindow || undefined,
        details: addon.detailsDescription || undefined,
      },
      price: Number(addon.defaultPrice || 0),
      priceType: "per person",
    };

    setFormData((prev: any) => ({
      ...prev,
      addOns: [...(prev.addOns || []), newItem],
    }));
  };

  const handleRemoveDayAddOn = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      addOns: (prev.addOns || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const handleToggleDayPlace = (dIdx: number, placeName: string) => {
    setFormData((prev: any) => {
      const updatedDays = [...prev.itineraryDays];
      const currentDay = { ...updatedDays[dIdx] };
      let currentPlaces = [...(currentDay.places || [])];
      let currentTransportMap = { ...(currentDay.placeTransportMap || {}) };

      if (currentPlaces.includes(placeName)) {
        currentPlaces = currentPlaces.filter((p) => p !== placeName);
        delete currentTransportMap[placeName];
      } else {
        currentPlaces.push(placeName);
        const placeObj = masterData.places.find(
          (p) => p.name.toLowerCase() === placeName.toLowerCase()
        );
        if (placeObj?.requiresSpecialTransport) {
          const defaultOpt =
            placeObj.specialTransportOptions && placeObj.specialTransportOptions.length > 0
              ? placeObj.specialTransportOptions[0]
              : "Car";
          currentTransportMap[placeName] = defaultOpt;
        }
      }

      // Match place objects from masterData
      const selectedPlaceObjs = currentPlaces
        .map((pName) =>
          masterData.places.find(
            (p) =>
              p.name.toLowerCase() === pName.toLowerCase() &&
              (!currentDay.cityOrStay ||
                p.city?.name?.toLowerCase() === currentDay.cityOrStay.toLowerCase())
          ) || masterData.places.find((p) => p.name.toLowerCase() === pName.toLowerCase())
        )
        .filter(Boolean);

      // Aggregate Inclusions from all selected places
      const aggregatedInclusions = Array.from(
        new Set(selectedPlaceObjs.flatMap((p) => p.inclusions || []))
      );

      // Aggregate Exclusions from all selected places
      const aggregatedExclusions = Array.from(
        new Set(selectedPlaceObjs.flatMap((p) => p.exclusions || []))
      );

      updatedDays[dIdx] = {
        ...currentDay,
        places: currentPlaces,
        placeTransportMap: currentTransportMap,
        title: currentDay.title || "",
        description: currentDay.description || "",
        durationHours: currentDay.durationHours || "",
        inclusions:
          aggregatedInclusions.length > 0
            ? aggregatedInclusions
            : currentDay.inclusions || [],
        exclusions:
          aggregatedExclusions.length > 0
            ? aggregatedExclusions
            : currentDay.exclusions || [],
      };

      return { ...prev, itineraryDays: updatedDays };
    });
  };

  const handleRemoveDayPlace = (dayIndex: number, placeIndex: number) => {
    const currentPlaces = formData.itineraryDays[dayIndex]?.places || [];
    const placeToRemove = currentPlaces[placeIndex];
    if (placeToRemove) {
      handleToggleDayPlace(dayIndex, placeToRemove);
    }
  };

  const [dayInputTags, setDayInputTags] = useState<{ [key: string]: string }>({});

  const handleAddDayTag = (dayIndex: number, field: string) => {
    const key = `${dayIndex}-${field}`;
    const value = dayInputTags[key]?.trim();
    if (!value) return;

    const currentTags = formData.itineraryDays[dayIndex][field] || [];
    if (!currentTags.includes(value)) {
      updateDayField(dayIndex, field, [...currentTags, value]);
    }
    setDayInputTags((prev) => ({ ...prev, [key]: "" }));
  };

  const handleRemoveDayTag = (dayIndex: number, field: string, tagIndex: number) => {
    const currentTags = formData.itineraryDays[dayIndex][field] || [];
    const updatedTags = currentTags.filter((_: any, i: number) => i !== tagIndex);
    updateDayField(dayIndex, field, updatedTags);
  };

  // Step 5: Flights & Multi-Category Transportation State
  const [editingFlightIndex, setEditingFlightIndex] = useState<number | null>(null);
  const [newFlight, setNewFlight] = useState({
    sector: "",
    airline: "",
    departureDateTime: "",
    arrivalDateTime: "",
    durationText: "",
    stops: 0,
    layoverInfo: "",
    carryOnBaggageKg: 7,
    checkInBaggageKg: 20,
    cancellationPolicy: "",
    flightNotes: "",
    type: "Car",
    travelTime: "10:00 AM",
    flightCodeDefault: "",
    isStartingTransfer: false,
    isPackageIncluded: true,
    transportCategory: "Inter-City Transfer" as "Inter-City Transfer" | "Local Transfer",
    fromCity: "",
    toCity: "",
    isAutoSuggested: false,
  });

  // Drag & drop state for reordering Day-wise Inter-City vs Local transportation
  const [draggedTransportSection, setDraggedTransportSection] = useState<{
    dayNum: number;
    section: "intercity" | "local";
  } | null>(null);
  const [dragOverTransportSection, setDragOverTransportSection] = useState<{
    dayNum: number;
    section: "intercity" | "local";
  } | null>(null);

  // Search filter states for Tab 5 pickers
  const [interCitySearchMap, setInterCitySearchMap] = useState<{ [dayNum: number]: string }>({});
  const [localSearchMap, setLocalSearchMap] = useState<{ [dayNum: number]: string }>({});
  const [masterInterCitySearch, setMasterInterCitySearch] = useState("");
  const [masterInterCityTypeFilter, setMasterInterCityTypeFilter] = useState("ALL");
  const [masterInterCityPage, setMasterInterCityPage] = useState(1);
  const [masterInterCityPageSize, setMasterInterCityPageSize] = useState(6);
  const [masterAssignDayMap, setMasterAssignDayMap] = useState<{ [routeId: string]: number }>({});

  const syncFlightDetailsFromDays = (days: any[], masterRoutes: any[], existingFlightDetails: any[] = []) => {
    const list: any[] = [];
    (days || []).forEach((d: any) => {
      const dayNum = d.dayNumber;
      const order = d.transportOrder || d.placeTransportMap?.transport_order || "intercity_first";
      
      // 1. Inter-City Transfer
      let interItem: any = null;
      const interId = d.interCityTransferId || d.placeTransportMap?.inter_city_transfer_id;
      if (interId) {
        const mr = masterRoutes.find((r: any) => r.id === interId);
        if (mr) {
          interItem = {
            dayNumber: dayNum,
            sector: mr.sector || `${mr.fromCity} to ${mr.toCity}`,
            fromCity: mr.fromCity || "",
            toCity: mr.toCity || "",
            transportCategory: "Inter-City Transfer",
            airline: mr.airline,
            type: mr.type || "Car",
            travelTime: mr.travelTime || "09:00 AM",
            departureDateTime: "",
            arrivalDateTime: "",
            durationText: "Direct",
            stops: mr.typicalStops || 0,
            layoverInfo: mr.typicalLayoverInfo || "",
            carryOnBaggageKg: mr.cabinBaggageKg ?? 7,
            checkInBaggageKg: mr.checkInBaggageKg ?? 20,
            cancellationPolicy: mr.cancellationPolicy || "",
            flightNotes: mr.flightNotes || "",
            flightCodeDefault: mr.flightCodeDefault || "",
            isStartingTransfer: false,
            isPackageIncluded: true,
            isAutoSuggested: true,
          };
        }
      }

      // 2. Local Transfers
      const localItems: any[] = [];
      const localIds: string[] = d.localTransportIds || d.placeTransportMap?.local_transport_ids || [];
      localIds.forEach((lid) => {
        const mr = masterRoutes.find((r: any) => r.id === lid);
        if (mr) {
          localItems.push({
            dayNumber: dayNum,
            sector: mr.sector || `${mr.city?.name || mr.fromCity || d.cityOrStay} Local Transfer`,
            fromCity: mr.city?.name || mr.fromCity || d.cityOrStay || "",
            toCity: mr.city?.name || mr.toCity || d.cityOrStay || "",
            transportCategory: "Local Transfer",
            airline: mr.airline,
            type: mr.type || "Car",
            travelTime: mr.travelTime || "Flexible",
            departureDateTime: "",
            arrivalDateTime: "",
            durationText: "Direct",
            stops: 0,
            layoverInfo: "",
            carryOnBaggageKg: mr.cabinBaggageKg ?? 7,
            checkInBaggageKg: mr.checkInBaggageKg ?? 20,
            cancellationPolicy: mr.cancellationPolicy || "",
            flightNotes: mr.flightNotes || "",
            flightCodeDefault: mr.flightCodeDefault || "",
            isStartingTransfer: false,
            isPackageIncluded: true,
            isAutoSuggested: true,
          });
        }
      });

      if (interItem) list.push(interItem);
      list.push(...localItems);
    });

    return list;
  };

  const handleSwapFlightWithMaster = (flightIdx: number, masterRouteId: string) => {
    const route = masterData.flightRoutes.find((r) => r.id === masterRouteId);
    if (!route) return;

    setFormData((prev: any) => {
      const list = [...prev.flightDetails];
      list[flightIdx] = {
        ...list[flightIdx],
        sector: route.sector,
        fromCity: route.fromCity || list[flightIdx].fromCity,
        toCity: route.toCity || list[flightIdx].toCity,
        transportCategory: route.transportCategory || list[flightIdx].transportCategory || "Inter-City Transfer",
        airline: route.airline,
        type: route.type || list[flightIdx].type || "Car",
        travelTime: route.travelTime || list[flightIdx].travelTime,
        stops: route.typicalStops || 0,
        layoverInfo: route.typicalLayoverInfo || "",
        carryOnBaggageKg: route.cabinBaggageKg ?? 7,
        checkInBaggageKg: route.checkInBaggageKg ?? 20,
        cancellationPolicy: route.cancellationPolicy || "",
        flightNotes: route.flightNotes || "",
        flightCodeDefault: route.flightCodeDefault || "",
        isAutoSuggested: true,
      };
      return { ...prev, flightDetails: list };
    });
  };

  const startEditFlight = (idx: number) => {
    const f = formData.flightDetails[idx];
    setNewFlight({
      sector: f.sector || "",
      airline: f.airline || "",
      departureDateTime: f.departureDateTime || "",
      arrivalDateTime: f.arrivalDateTime || "",
      durationText: f.durationText || "",
      stops: f.stops || 0,
      layoverInfo: f.layoverInfo || "",
      carryOnBaggageKg: f.carryOnBaggageKg ?? 7,
      checkInBaggageKg: f.checkInBaggageKg ?? 20,
      cancellationPolicy: f.cancellationPolicy || "",
      flightNotes: f.flightNotes || "",
      type: f.type || "Car",
      travelTime: f.travelTime || "10:00 AM",
      flightCodeDefault: f.flightCodeDefault || "",
      isStartingTransfer: f.isStartingTransfer || false,
      isPackageIncluded: f.isPackageIncluded !== false,
      transportCategory: f.transportCategory || "Inter-City Transfer",
      fromCity: f.fromCity || "",
      toCity: f.toCity || "",
      isAutoSuggested: !!f.isAutoSuggested,
    });
    setEditingFlightIndex(idx);
  };

  const addFlight = () => {
    if (!newFlight.sector || !newFlight.airline) {
      alert("Sector and Carrier/Provider Name are required.");
      return;
    }

    let calculatedDuration = newFlight.durationText;
    if ((!calculatedDuration || !calculatedDuration.trim()) && newFlight.departureDateTime && newFlight.arrivalDateTime) {
      try {
        const dep = new Date(newFlight.departureDateTime).getTime();
        const arr = new Date(newFlight.arrivalDateTime).getTime();
        const diffMs = arr - dep;
        if (diffMs > 0) {
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          calculatedDuration = `${hours}h ${mins}m`;
        } else {
          calculatedDuration = "Direct";
        }
      } catch (e) {
        calculatedDuration = "Direct";
      }
    } else if (!calculatedDuration) {
      calculatedDuration = "Direct";
    }

    const flightToSave = {
      ...newFlight,
      durationText: calculatedDuration,
    };

    setFormData((prev: any) => {
      const list = [...prev.flightDetails];
      if (editingFlightIndex !== null) {
        list[editingFlightIndex] = flightToSave;
      } else {
        list.push(flightToSave);
      }
      return { ...prev, flightDetails: list };
    });
    setEditingFlightIndex(null);
    setNewFlight({
      sector: "",
      airline: "",
      departureDateTime: "",
      arrivalDateTime: "",
      durationText: "",
      stops: 0,
      layoverInfo: "",
      carryOnBaggageKg: 7,
      checkInBaggageKg: 20,
      cancellationPolicy: "",
      flightNotes: "",
      type: "Car",
      travelTime: "10:00 AM",
      flightCodeDefault: "",
      isStartingTransfer: false,
      isPackageIncluded: true,
      transportCategory: "Inter-City Transfer",
      fromCity: "",
      toCity: "",
      isAutoSuggested: false,
    });
  };

  const removeFlight = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      flightDetails: prev.flightDetails.filter((_: any, i: number) => i !== index),
    }));
  };

  // Step 6: Addons
  const [editingAddOnIndex, setEditingAddOnIndex] = useState<number | null>(null);
  const [addOnCityFilter, setAddOnCityFilter] = useState<string>("All");
  const [newAddOn, setNewAddOn] = useState({
    name: "",
    visaType: "",
    length: "",
    validity: "",
    details: "",
    price: 0,
    priceType: "per person",
  });

  const startEditAddOn = (idx: number) => {
    const addon = formData.addOns[idx];
    let desc: any = {};
    try {
      desc = typeof addon.detailsJson === "string" ? JSON.parse(addon.detailsJson) : addon.detailsJson;
    } catch (e) {}
    setNewAddOn({
      name: addon.name || "",
      visaType: desc?.visaType || "",
      length: desc?.length || "",
      validity: desc?.validity || "",
      details: desc?.details || "",
      price: addon.price || 0,
      priceType: addon.priceType || "per person",
    });
    setEditingAddOnIndex(idx);
  };

  const addAddOn = () => {
    if (!newAddOn.name) return;
    const newItem = {
      name: newAddOn.name,
      detailsJson: {
        visaType: newAddOn.visaType || undefined,
        length: newAddOn.length || undefined,
        validity: newAddOn.validity || undefined,
        details: newAddOn.details || undefined,
      },
      price: Number(newAddOn.price || 0),
      priceType: newAddOn.priceType,
    };
    setFormData((prev: any) => {
      const list = [...prev.addOns];
      if (editingAddOnIndex !== null) {
        list[editingAddOnIndex] = newItem;
      } else {
        list.push(newItem);
      }
      return { ...prev, addOns: list };
    });
    setEditingAddOnIndex(null);
    setNewAddOn({
      name: "",
      visaType: "",
      length: "",
      validity: "",
      details: "",
      price: 0,
      priceType: "per person",
    });
  };

  const removeAddOn = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      addOns: prev.addOns.filter((_: any, i: number) => i !== index),
    }));
  };

  // Step 7: Restaurants
  const [editingRestIndex, setEditingRestIndex] = useState<number | null>(null);
  const [newRest, setNewRest] = useState({
    location: "",
    cuisineType: "North & South Indian",
    name: "",
    rating: 4.6,
    reviewCount: 200,
    isVeg: false,
    category: "Restaurant",
  });

  const startEditRest = (idx: number) => {
    const rest = formData.restaurantSuggestions[idx];
    setNewRest({
      location: rest.location || "",
      cuisineType: rest.cuisineType || "International",
      name: rest.name || "",
      rating: rest.rating || 4.5,
      reviewCount: rest.reviewCount || 100,
      isVeg: rest.isVeg || false,
      category: rest.category || "Restaurant",
    });
    setEditingRestIndex(idx);
  };

  const addRest = () => {
    if (!newRest.name || !newRest.location) {
      alert("Restaurant Name and Location are required.");
      return;
    }
    setFormData((prev: any) => {
      const list = [...prev.restaurantSuggestions];
      if (editingRestIndex !== null) {
        list[editingRestIndex] = newRest;
      } else {
        list.push(newRest);
      }
      return { ...prev, restaurantSuggestions: list };
    });
    setEditingRestIndex(null);
    setNewRest({
      location: "",
      cuisineType: "North & South Indian",
      name: "",
      rating: 4.6,
      reviewCount: 200,
      isVeg: false,
      category: "Restaurant",
    });
  };

  const removeRest = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      restaurantSuggestions: prev.restaurantSuggestions.filter((_: any, i: number) => i !== index),
    }));
  };

  // Filtered Indian departure cities
  const indianCities = masterData.cities.filter(
    (c) => c.country.toLowerCase() === "india"
  );

  // Helper to extract clean single destination city
  const cleanSingleDestination = React.useMemo(() => {
    if (!formData.destination) return "";
    const raw = String(formData.destination).replace(/\s*\(Current\)$/i, "").trim();
    if (raw.includes(",") || raw.includes("&") || raw.includes(" and ") || raw.includes(";")) {
      // Check if it directly matches a "City, Country" master entry
      const directMatch = masterData.cities.find(
        (c) => `${c.name}, ${c.country}`.toLowerCase() === raw.toLowerCase()
      );
      if (directMatch) return `${directMatch.name}, ${directMatch.country}`;

      // Otherwise if it's a concatenated multi-city string, extract the first city
      const parts = raw
        .split(/[,;&+]+|\band\b/i)
        .map((s) => s.trim().replace(/\s*\(Current\)$/i, "").trim())
        .filter((s) => s.length > 0 && s.toLowerCase() !== "india");
      const firstCity = parts[0] || "";
      const matchedCity = masterData.cities.find(
        (c) => c.name.toLowerCase() === firstCity.toLowerCase()
      );
      if (matchedCity) return `${matchedCity.name}, ${matchedCity.country}`;
      return firstCity;
    }
    const matched = masterData.cities.find(
      (c) => c.name.toLowerCase() === raw.toLowerCase()
    );
    if (matched) return `${matched.name}, ${matched.country}`;
    return raw;
  }, [formData.destination, masterData.cities]);

  // Helper to extract clean single departure city
  const cleanSingleDepartureCity = React.useMemo(() => {
    if (!formData.departureCity) return "";
    const raw = String(formData.departureCity).replace(/\s*\(Current\)$/i, "").trim();
    if (raw.includes(",") || raw.includes("&") || raw.includes(" and ") || raw.includes(";")) {
      const parts = raw
        .split(/[,;&+]+|\band\b/i)
        .map((s) => s.trim().replace(/\s*\(Current\)$/i, "").trim())
        .filter((s) => s.length > 0 && s.toLowerCase() !== "india");
      return parts[parts.length - 1] || "";
    }
    return raw;
  }, [formData.departureCity]);

  // ==========================================
  // RENDER FORM STEPS (8 EXACT STEPS)
  // ==========================================
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#14213D] font-fraunces">
              Step 1: Core Trip Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Itinerary Title */}
              <div className="md:col-span-2 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Itinerary Title *
                  </label>
                  {(formData.departureCity || formData.destination) && (
                    <button
                      type="button"
                      onClick={() => {
                        const auto = generateAutoTitle(formData.departureCity, formData.destination, formData.itineraryDays);
                        if (auto) {
                          setFormData((prev: any) => ({ ...prev, title: auto }));
                          setIsTitleCustomized(false);
                        }
                      }}
                      className="text-[11px] font-bold text-[#B8944F] hover:text-[#8F6F33] flex items-center gap-1 cursor-pointer transition-colors"
                      title="Auto-generate title from Origin and Destination"
                    >
                      <span>⚡ Auto-Generate Title</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Ahmedabad to Junagadh Adventure"
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              {/* Main Tour Planner Image with Banner Picker */}
              <div className="md:col-span-2 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Main Tour Planner Image
                  </label>
                  {masterData.bannerImages.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setFormData((prev: any) => ({ ...prev, coverImage: e.target.value }));
                        }
                      }}
                      value=""
                      className="text-[11px] font-semibold text-[#B8944F] bg-[#B8944F]/8 border border-[#B8944F]/30 rounded-lg px-2.5 py-1 outline-none cursor-pointer"
                    >
                      <option value="">⚡ Choose from Curated Banners...</option>
                      {masterData.bannerImages.map((b) => (
                        <option key={b.id} value={b.imageUrl}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  {formData.coverImage ? (
                    <div className="relative h-24 w-44 rounded-lg overflow-hidden group border border-zinc-200 shadow-sm bg-zinc-50">
                      <img
                        src={formData.coverImage}
                        alt="Cover Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((prev: any) => ({ ...prev, coverImage: null }))}
                        className="absolute inset-0 bg-red-600/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold cursor-pointer"
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          disabled={uploadingCover}
                          className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#B8944F]/10 file:text-[#B8944F] hover:file:bg-[#B8944F]/20 cursor-pointer disabled:opacity-50"
                        />
                        {uploadingCover && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-xs text-zinc-500">
                            <Loader2 className="animate-spin h-3.5 w-3.5 mr-1 text-[#B8944F]" /> uploading...
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Destination City (Single-Select from Master Data Hub) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Destination City *
                  </label>
                </div>
                <select
                  name="destination"
                  value={cleanSingleDestination}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    const newTitle = !isTitleCustomized
                      ? generateAutoTitle(formData.departureCity, chosen, formData.itineraryDays)
                      : formData.title;
                    setFormData((prev: any) => ({
                      ...prev,
                      destination: chosen,
                      title: newTitle || prev.title,
                    }));
                  }}
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none cursor-pointer"
                >
                  <option value="">-- Select Destination City from Master Data Hub --</option>
                  {cleanSingleDestination &&
                    !masterData.cities.some(
                      (c) =>
                        `${c.name}, ${c.country}`.toLowerCase() === cleanSingleDestination.toLowerCase() ||
                        c.name.toLowerCase() === cleanSingleDestination.toLowerCase()
                    ) &&
                    !cleanSingleDestination.includes("&") && (
                      <option value={cleanSingleDestination}>{cleanSingleDestination}</option>
                    )}
                  {masterData.cities.map((c) => (
                    <option key={c.id} value={`${c.name}, ${c.country}`}>
                      {c.name}, {c.country} {c.state ? `(${c.state})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Departure City (India Hubs Only - Single City Only) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Departure City*
                  </label>
                </div>
                <select
                  name="departureCity"
                  value={cleanSingleDepartureCity}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    const newTitle = !isTitleCustomized
                      ? generateAutoTitle(chosen, formData.destination, formData.itineraryDays)
                      : formData.title;

                    const cleanChosen = chosen ? chosen.split("(")[0].trim().toLowerCase() : "";
                    const matchedC = cleanChosen && masterData.consultants.length > 0
                      ? masterData.consultants.find((c: any) => {
                          const dep = (c.departureCity || c.hubCity || c.assigned_departure_city || "").trim().toLowerCase();
                          if (!dep) return false;
                          return dep === cleanChosen || dep.includes(cleanChosen) || cleanChosen.includes(dep);
                        })
                      : null;

                    setFormData((prev: any) => ({
                      ...prev,
                      departureCity: chosen,
                      title: newTitle || prev.title,
                      consultantName: matchedC ? matchedC.name : "",
                      consultantPhone: matchedC ? (matchedC.phone || "") : "",
                    }));

                    if (matchedC) {
                      const displayCity = matchedC.departureCity || matchedC.hubCity || "";
                      setAutoMatchedConsultant(`${matchedC.name}${displayCity ? ` (${displayCity})` : ""}`);
                    } else {
                      setAutoMatchedConsultant(null);
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none cursor-pointer"
                >
                  <option value="">-- Select Master Departure City (India Hub) --</option>
                  {cleanSingleDepartureCity &&
                    !indianCities.some(
                      (c) => c.name.toLowerCase() === cleanSingleDepartureCity.toLowerCase()
                    ) &&
                    !cleanSingleDepartureCity.includes("&") &&
                    !cleanSingleDepartureCity.includes(",") && (
                      <option value={cleanSingleDepartureCity}>{cleanSingleDepartureCity}</option>
                    )}
                  {indianCities.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.state ? `(${c.state})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date & End Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  End Date *
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              {/* Auto-calculated Duration Days and Nights (Read-only / No manual entry) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Duration Days
                </label>
                <div className="px-4 py-2.5 bg-zinc-100/80 border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] font-mono">
                  {formData.durationDays} Days
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Duration Nights
                </label>
                <div className="px-4 py-2.5 bg-zinc-100/80 border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] font-mono">
                  {formData.durationNights} Nights
                </div>
              </div>

              {/* Number of Travellers */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Number of Travellers *
                </label>
                <input
                  type="number"
                  min="1"
                  name="numTravellers"
                  value={formData.numTravellers}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs text-[#14213D] font-mono focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              {/* Consultant Name & Phone (Select from MasterConsultant or Auto-Assigned) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Consultant Name & Phone *
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="consultantName"
                    value={formData.consultantName}
                    onChange={handleInputChange}
                    placeholder="Consultant Name"
                    className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                  <input
                    type="text"
                    name="consultantPhone"
                    value={formData.consultantPhone}
                    onChange={handleInputChange}
                    placeholder="Phone / WhatsApp"
                    className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs text-[#14213D] font-mono focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>
              </div>

              {/* Traveller's own arrival arrangement (Part B.3) */}
              <div className="sm:col-span-2 space-y-1.5 pt-2 border-t border-zinc-100">
                <label className="block text-xs font-semibold text-zinc-700">
                  Traveller&apos;s own arrival arrangement (Optional)
                </label>
                <input
                  type="text"
                  name="ownArrivalArrangement"
                  value={formData.ownArrivalArrangement || ""}
                  onChange={handleInputChange}
                  placeholder="e.g. Vadodara to Ahmedabad — traveller's own arrangement."
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#14213D] font-fraunces flex items-center gap-2">
                  <Table2 className="h-5 w-5 text-[#B8944F]" />
                  <span>Step 2: Day-wise Planning</span>
                </h2>
              </div>
              {formData.startDate && formData.endDate && (
                <div className="flex items-center gap-2 bg-[#FAF8F5] border border-[#B8944F]/30 px-3 py-1.5 rounded-lg text-xs font-medium text-[#14213D] shrink-0">
                  <CalendarDays className="h-3.5 w-3.5 text-[#B8944F]" />
                  <span>
                    {formatDayDate(formData.startDate, 0)} &ndash; {formatDayDate(formData.endDate, 0)} ({formData.durationDays} Days / {formData.durationNights} Nights)
                  </span>
                </div>
              )}
            </div>

            {/* Dynamic Day-wise Planning (Vertical Layout) */}
            <div className="space-y-4">
              {formData.itineraryDays.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-xl p-8">
                  No itinerary days configured. Please set your Trip Start Date and End Date in Step 1.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.itineraryDays.map((day: any, dIdx: number) => {
                    const dayNum = day.dayNumber || (dIdx + 1);
                    const dayDateStr = formatDayDate(formData.startDate, dIdx);
                    const currentCity = masterData.cities.find(
                      (c) => c.name.toLowerCase() === (day.cityOrStay || "").toLowerCase()
                    );
                    const currCity = day.cityOrStay?.trim() || "";
                    const cityHotels = currentCity
                      ? masterData.hotels.filter((h) => h.cityId === currentCity.id)
                      : masterData.hotels;
                    const cityPlaces = currentCity
                      ? masterData.places.filter((p) => p.cityId === currentCity.id)
                      : masterData.places;

                    // Matching master add-ons strictly for this day's selected city
                    const matchingMasterAddons = (currCity || currentCity)
                      ? masterData.addOns.filter((a: any) => {
                          return (
                            (currCity && a.city?.name && a.city.name.toLowerCase() === currCity.toLowerCase()) ||
                            (currentCity?.id && a.cityId === currentCity.id) ||
                            (currentCity?.id && Array.isArray(a.cityIds) && a.cityIds.includes(currentCity.id))
                          );
                        })
                      : [];

                    // Matching master restaurants strictly for this day's selected city
                    const matchingMasterRestaurants = (currCity || currentCity)
                      ? masterData.restaurants.filter((r: any) => {
                          return (
                            (currCity && r.city?.name && r.city.name.toLowerCase() === currCity.toLowerCase()) ||
                            (currentCity?.id && r.cityId === currentCity.id)
                          );
                        })
                      : [];

                    // Selected add-ons for this day
                    const dayAddOns = (formData.addOns || [])
                      .map((a: any, originalIndex: number) => ({ ...a, originalIndex }))
                      .filter((a: any) => (a.dayNumber || (a.detailsJson as any)?.dayNumber) === dayNum);

                    // Selected restaurants for this day
                    const dayRestaurants = (formData.restaurantSuggestions || [])
                      .map((r: any, originalIndex: number) => ({ ...r, originalIndex }))
                      .filter((r: any) => (r.dayNumber || 1) === dayNum);

                    // Check if hotel provides all three meals (Breakfast, Lunch, Dinner)
                    const hotelAllMeals = isHotelAllMealsIncluded(day.hotelName, day);

                    return (
                      <div
                        key={dIdx}
                        className="bg-white border border-zinc-200/90 hover:border-[#B8944F]/60 rounded-xl shadow-xs transition-all overflow-hidden"
                      >
                        {/* Day Card Header */}
                        <div className="bg-[#FAF8F5] px-4 py-3 border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-3">
                            <span className="h-7 w-7 rounded-full bg-[#B8944F] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                              {day.dayNumber}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-[#14213D] font-fraunces">
                                Day {day.dayNumber}
                              </span>
                              {dayDateStr && (
                                <span className="text-[11px] font-mono text-[#8F6F33] font-semibold bg-[#B8944F]/10 px-2 py-0.5 rounded-md border border-[#B8944F]/20">
                                  📅 {dayDateStr}
                                </span>
                              )}
                              {day.cityOrStay && (
                                <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">
                                  📍 {day.cityOrStay}
                                </span>
                              )}
                            </div>
                          </div>
                          {formData.itineraryDays.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDay(dIdx)}
                              className="text-zinc-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title={`Remove Day ${day.dayNumber}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Day Card Body */}
                        <div className="p-4 sm:p-5 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* City Selection */}
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-[#B8944F]" />
                                <span>City / Destination *</span>
                              </label>
                              <select
                                value={day.cityOrStay || ""}
                                onChange={(e) => handleDayCityChange(dIdx, e.target.value)}
                                className="w-full px-3 py-2.5 bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#B8944F] focus:ring-1 focus:ring-[#B8944F] rounded-lg text-xs font-semibold text-[#14213D] outline-none cursor-pointer transition-colors"
                              >
                                <option value="">-- Select Master City --</option>
                                {masterData.cities.map((c) => (
                                  <option key={c.id} value={c.name}>
                                    📍 {c.name}, {c.country}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Hotel Selection */}
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                                <Hotel className="h-3.5 w-3.5 text-[#B8944F]" />
                                <span>Hotel Stay *</span>
                              </label>
                              <select
                                value={day.hotelName || ""}
                                onChange={(e) => handleDayHotelChange(dIdx, e.target.value)}
                                className="w-full px-3 py-2.5 bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#B8944F] focus:ring-1 focus:ring-[#B8944F] rounded-lg text-xs font-semibold text-[#14213D] outline-none cursor-pointer transition-colors"
                              >
                                <option value="">-- Select Hotel (or Day Trip / Transit) --</option>
                                {cityHotels.map((h) => (
                                  <option key={h.id} value={h.name}>
                                    🏨 {h.name} ({h.starRating}★)
                                    {h.mealPlans?.length ? ` [${h.mealPlans.join(", ")}]` : ""}
                                    {h.pricePerNight ? ` - ₹${h.pricePerNight.toLocaleString("en-IN")}/nt` : ""}
                                    {h.pricePerPerson ? ` | ₹${h.pricePerPerson.toLocaleString("en-IN")}/pax` : ""}
                                  </option>
                                ))}
                              </select>

                              {/* Hotel badge preview if selected */}
                              {day.hotelName && (
                                <div className="p-2 bg-amber-50/80 border border-amber-200/80 rounded-lg text-[11px] flex items-center justify-between">
                                  <span className="font-bold text-[#14213D] truncate">
                                    🏨 {day.hotelName}
                                  </span>
                                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-[#8F6F33] shrink-0">
                                    {day.hotelPricePerNight && (
                                      <span>₹{day.hotelPricePerNight.toLocaleString("en-IN")}/nt</span>
                                    )}
                                    {day.hotelPricePerPerson && (
                                      <span>₹{day.hotelPricePerPerson.toLocaleString("en-IN")}/pax</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Places Selection & Auto-Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-100">
                            {/* Places Multi-Select */}
                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-zinc-700 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <Landmark className="h-3.5 w-3.5 text-[#B8944F]" />
                                  <span>Places Selection *</span>
                                </span>
                              </label>

                              {/* Selected Places Badges */}
                              <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2 bg-zinc-50 border border-zinc-200 rounded-lg">
                                {(day.places || []).length === 0 ? (
                                  <span className="text-[10px] text-zinc-400 italic py-0.5">
                                    No places selected yet. Pick from available places below.
                                  </span>
                                ) : (
                                  (day.places || []).map((pName: string, pIdx: number) => (
                                    <span
                                      key={pIdx}
                                      className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-[#B8944F]/15 text-[#8F6F33] font-bold border border-[#B8944F]/30"
                                    >
                                      {pName}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveDayPlace(dIdx, pIdx)}
                                        className="ml-1.5 text-[#8F6F33] hover:text-red-600 font-bold cursor-pointer"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))
                                )}
                              </div>

                              {/* Special Transport Dropdowns for Places requiring special transport (Part B.5) */}
                              {day.places && day.places.length > 0 && day.places.some((pName: string) => {
                                const pObj = masterData.places.find(
                                  (p) => p.name.toLowerCase() === pName.toLowerCase()
                                );
                                return pObj?.requiresSpecialTransport;
                              }) && (
                                <div className="space-y-1.5 p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
                                  <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                                    <span>🚖 Place-Level Transport Needed:</span>
                                  </div>
                                  {day.places.map((pName: string) => {
                                    const pObj = masterData.places.find(
                                      (p) => p.name.toLowerCase() === pName.toLowerCase()
                                    );
                                    if (!pObj?.requiresSpecialTransport) return null;
                                    const options =
                                      pObj.specialTransportOptions && pObj.specialTransportOptions.length > 0
                                        ? pObj.specialTransportOptions
                                        : ["Car", "Auto-rickshaw", "Boat", "Helicopter", "Horse", "Palki", "Walk"];
                                    const currentChoice =
                                      day.placeTransportMap?.[pName] || options[0] || "Car";

                                    return (
                                      <div
                                        key={pName}
                                        className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded border border-amber-200 shadow-2xs text-xs"
                                      >
                                        <span className="font-bold text-[#14213D] truncate">{pName}</span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-[10px] text-zinc-500 font-medium">Transport:</span>
                                          <select
                                            value={currentChoice}
                                            onChange={(e) => {
                                              const updated = {
                                                ...(day.placeTransportMap || {}),
                                                [pName]: e.target.value,
                                              };
                                              updateDayField(dIdx, "placeTransportMap", updated);
                                            }}
                                            className="px-2 py-0.5 bg-amber-50/50 border border-amber-300 rounded text-xs font-bold text-amber-900 outline-none cursor-pointer"
                                          >
                                            {options.map((opt: string) => (
                                              <option key={opt} value={opt}>
                                                {opt}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Available Places Selection */}
                              {cityPlaces.length > 0 ? (
                                <div className="space-y-1">
                                  <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider block">
                                    Available in {day.cityOrStay || "Hub"}:
                                  </span>
                                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 border border-zinc-100 rounded-md bg-zinc-50/50">
                                    {cityPlaces.map((cp: any) => {
                                      const isSelected = (day.places || []).includes(cp.name);
                                      return (
                                        <button
                                          key={cp.id}
                                          type="button"
                                          onClick={() => handleToggleDayPlace(dIdx, cp.name)}
                                          className={`text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer text-left ${
                                            isSelected
                                              ? "bg-[#B8944F] text-white border-[#B8944F] font-bold shadow-xs"
                                              : "bg-white text-zinc-700 border-zinc-200 hover:border-[#B8944F]"
                                          }`}
                                        >
                                          {isSelected ? "✓ " : "+ "}
                                          {cp.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[10px] text-zinc-400 italic">
                                  {day.cityOrStay
                                    ? `No places found in Master Data for ${day.cityOrStay}.`
                                    : "Select a city above to load master places."}
                                </p>
                              )}
                            </div>

                            {/* Day Summary Preview */}
                            <div className="space-y-2 bg-[#FAF8F5]/80 p-3 rounded-lg border border-zinc-200/70 text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-zinc-700">
                                <Sparkles className="h-3.5 w-3.5 text-[#B8944F]" />
                                <span>Day Summary & Inclusions</span>
                              </div>

                              <div className="text-[11px] font-semibold text-[#14213D] truncate">
                                🏷️ {day.title ? day.title : <span className="text-zinc-400 font-normal italic">Theme / Title not set yet (Enter in Step 3)</span>}
                              </div>

                              {day.inclusions && day.inclusions.length > 0 && (
                                <div className="space-y-1">
                                  <span className="font-bold text-[10px] text-emerald-800">Inclusions:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {day.inclusions.map((inc: string, i: number) => (
                                      <span
                                        key={i}
                                        className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[9px]"
                                      >
                                        ✓ {inc}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {day.exclusions && day.exclusions.length > 0 && (
                                <div className="space-y-1">
                                  <span className="font-bold text-[10px] text-red-800">Exclusions:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {day.exclusions.map((exc: string, i: number) => (
                                      <span
                                        key={i}
                                        className="bg-red-50 text-red-800 border border-red-200 px-1.5 py-0.5 rounded text-[9px]"
                                      >
                                        ✗ {exc}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {day.description && (
                                <p className="text-zinc-500 line-clamp-2 italic text-[10px] pt-1">
                                  {day.description.replace(/<[^>]*>/g, '')}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Row 3: Restaurant & Add-ons Selection */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-100">
                            {/* Field 1: Restaurant Selection */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                                  <Utensils className="h-3.5 w-3.5 text-[#B8944F]" />
                                  <span>Restaurant</span>
                                </label>
                              </div>

                              {hotelAllMeals ? (
                                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                                    <span>🍽️</span>
                                    <span>All Meals Covered by Hotel</span>
                                  </div>
                                  <p className="text-[10px] text-emerald-700">
                                    <strong>{day.hotelName}</strong> includes Breakfast, Lunch, and Dinner (all 3 meals). Restaurant selection is not required for Day {dayNum}.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {/* Selected Restaurants Badges / Chips */}
                                  <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2 bg-zinc-50 border border-zinc-200 rounded-lg">
                                    {dayRestaurants.length === 0 ? (
                                      <span className="text-[10px] text-zinc-400 italic py-0.5">
                                        No restaurant selected. Choose dining spots below.
                                      </span>
                                    ) : (
                                      dayRestaurants.map((r: any) => (
                                        <span
                                          key={r.originalIndex}
                                          className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-bold border border-amber-200 gap-1"
                                        >
                                          <span>🍴 {r.name}</span>
                                          {r.isVeg && (
                                            <span className="text-[8px] bg-emerald-600 text-white px-1 rounded">
                                              Veg
                                            </span>
                                          )}
                                          <span className="text-[9px] text-amber-700 font-normal">
                                            ({r.cuisineType})
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveDayRestaurant(r.originalIndex)}
                                            className="ml-1 text-amber-700 hover:text-red-600 font-bold cursor-pointer"
                                            title="Remove"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ))
                                    )}
                                  </div>

                                  {/* Dropdown to add dining spot - strictly matching current day's city */}
                                  <select
                                    defaultValue=""
                                    disabled={!currCity || matchingMasterRestaurants.length === 0}
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleAddMasterRestaurantToDay(dayNum, currCity, e.target.value);
                                        e.target.value = "";
                                      }
                                    }}
                                    className="w-full px-3 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 focus:border-[#B8944F] focus:ring-1 focus:ring-[#B8944F] rounded-lg text-xs font-semibold text-[#14213D] outline-none cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    <option value="">
                                      {!currCity
                                        ? "Select a city for Day " + dayNum + " to see restaurants..."
                                        : matchingMasterRestaurants.length > 0
                                        ? `+ Add Restaurant in ${currCity} (${matchingMasterRestaurants.length} available)...`
                                        : `No restaurants found in master for ${currCity}`}
                                    </option>
                                    {matchingMasterRestaurants.map((r: any) => (
                                      <option key={r.id} value={r.name}>
                                        {r.name} ({r.cuisineType}) • ⭐ {r.starRating || 4.5} {r.offersPureVegJain ? "• [Veg/Jain]" : ""}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>

                            {/* Field 2: Add-ons Selection */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                                  <PlusCircle className="h-3.5 w-3.5 text-[#B8944F]" />
                                  <span>Add-ons</span>
                                </label>
                              </div>

                              {/* Selected Add-ons Badges / Chips */}
                              <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2 bg-zinc-50 border border-zinc-200 rounded-lg">
                                {dayAddOns.length === 0 ? (
                                  <span className="text-[10px] text-zinc-400 italic py-0.5">
                                    No add-on selected for this day. Pick from available options below.
                                  </span>
                                ) : (
                                  dayAddOns.map((a: any) => (
                                    <span
                                      key={a.originalIndex}
                                      className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 font-bold border border-blue-200 gap-1"
                                    >
                                      <span>➕ {a.name}</span>
                                      <span className="text-[9px] text-emerald-700 font-mono font-bold">
                                        ₹{Number(a.price || 0).toLocaleString("en-IN")}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveDayAddOn(a.originalIndex)}
                                        className="ml-1 text-blue-700 hover:text-red-600 font-bold cursor-pointer"
                                        title="Remove"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))
                                )}
                              </div>

                              {/* Dropdown to add add-on - strictly matching current day's city */}
                              <select
                                defaultValue=""
                                disabled={!currCity || matchingMasterAddons.length === 0}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddMasterAddOnToDay(dayNum, e.target.value);
                                    e.target.value = "";
                                  }
                                }}
                                className="w-full px-3 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 focus:border-[#B8944F] focus:ring-1 focus:ring-[#B8944F] rounded-lg text-xs font-semibold text-[#14213D] outline-none cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <option value="">
                                  {!currCity
                                    ? "Select a city for Day " + dayNum + " to see add-ons..."
                                    : matchingMasterAddons.length > 0
                                    ? `+ Add Add-on for ${currCity} (${matchingMasterAddons.length} available)...`
                                    : `No add-ons found in master for ${currCity}`}
                                </option>
                                {matchingMasterAddons.map((a: any) => (
                                  <option key={a.id} value={a.name}>
                                    {a.name} (₹{Number(a.defaultPrice || 0).toLocaleString("en-IN")}) {a.visaType ? `• ${a.visaType}` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <div>
                <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
                  Step 3: Day-by-Day Itinerary Builder
                </h2>
              </div>
            </div>

            <div className="space-y-6">
              {formData.itineraryDays.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-lg">
                  No itinerary days added yet. Configure trip dates in Step 1 or click &quot;Add Day&quot;.
                </div>
              ) : (
                formData.itineraryDays.map((day: any, dIdx: number) => {
                  const dayNum = day.dayNumber || dIdx + 1;
                  const currCity = day.cityOrStay || "";
                  const currentCity = masterData.cities.find(
                    (c) =>
                      c.name.toLowerCase() === currCity.toLowerCase()
                  );
                  const cityPlaces = currentCity
                    ? masterData.places.filter((p) => p.cityId === currentCity.id)
                    : masterData.places;

                  // Matching master add-ons strictly for this day's selected city
                  const matchingMasterAddons = (currCity || currentCity)
                    ? masterData.addOns.filter((a: any) => {
                        return (
                          (currCity && a.city?.name && a.city.name.toLowerCase() === currCity.toLowerCase()) ||
                          (currentCity?.id && a.cityId === currentCity.id) ||
                          (currentCity?.id && Array.isArray(a.cityIds) && a.cityIds.includes(currentCity.id))
                        );
                      })
                    : [];

                  // Matching master restaurants strictly for this day's selected city
                  const matchingMasterRestaurants = (currCity || currentCity)
                    ? masterData.restaurants.filter((r: any) => {
                        return (
                          (currCity && r.city?.name && r.city.name.toLowerCase() === currCity.toLowerCase()) ||
                          (currentCity?.id && r.cityId === currentCity.id)
                        );
                      })
                    : [];

                  // Selected add-ons for this day
                  const dayAddOns = (formData.addOns || [])
                    .map((a: any, originalIndex: number) => ({ ...a, originalIndex }))
                    .filter((a: any) => (a.dayNumber || (a.detailsJson as any)?.dayNumber) === dayNum);

                  // Selected restaurants for this day
                  const dayRestaurants = (formData.restaurantSuggestions || [])
                    .map((r: any, originalIndex: number) => ({ ...r, originalIndex }))
                    .filter((r: any) => (r.dayNumber || 1) === dayNum);

                  // Check if hotel provides all three meals (Breakfast, Lunch, Dinner)
                  const hotelAllMeals = isHotelAllMealsIncluded(day.hotelName, day);

                  return (
                    <div
                      key={dIdx}
                      className="bg-white border border-[#B8944F]/20 rounded-xl p-5 craft-card space-y-5"
                    >
                      {/* Top Header of Day */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="h-6 w-6 rounded-full bg-[#B8944F] text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {day.dayNumber}
                          </span>
                          <span className="text-xs font-bold text-[#14213D]">
                            Day {day.dayNumber} Itinerary Details
                          </span>
                          {formatDayDate(formData.startDate, dIdx) && (
                            <span className="text-xs bg-[#B8944F]/10 text-[#B8944F] font-mono font-bold px-2 py-0.5 rounded">
                              📅 {formatDayDate(formData.startDate, dIdx)}
                            </span>
                          )}
                          {day.cityOrStay && (
                            <span className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/70 flex items-center gap-1">
                              📍 {day.cityOrStay}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => removeDay(dIdx)}
                            className="text-zinc-400 hover:text-red-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Row 1: Title & Duration */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            Day Theme / Title *
                          </label>
                          <input
                            type="text"
                            value={day.title || ""}
                            onChange={(e) => updateDayField(dIdx, "title", e.target.value)}
                            placeholder="e.g. Mahakaleshwar Temple Trails"
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] focus:ring-1 focus:ring-[#B8944F] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            Duration
                          </label>
                          <input
                            type="text"
                            value={day.durationHours || ""}
                            onChange={(e) => updateDayField(dIdx, "durationHours", e.target.value)}
                            placeholder="e.g. Full Day (8-9 hrs)"
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] outline-none"
                          />
                        </div>
                      </div>

                      {/* Row 2: Places Badges (Read-Only) */}
                      <div className="space-y-2 bg-zinc-50/70 p-3 rounded-lg border border-zinc-200/80">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-zinc-700 flex items-center space-x-1.5">
                            <Landmark className="h-3.5 w-3.5 text-[#B8944F]" />
                            <span>Places & Sights Included</span>
                          </label>
                          <span className="text-[10px] text-zinc-400 font-medium italic">Fetched from Day-Wise Planning</span>
                        </div>

                        {/* Selected Places Pills (Read-Only) */}
                        <div className="flex flex-wrap gap-1.5 min-h-7 p-2 bg-white border border-zinc-200 rounded-lg">
                          {(day.places || []).length === 0 ? (
                            <span className="text-[10px] text-zinc-400 italic py-0.5">
                              No places selected for Day {day.dayNumber} (Select places in Day-Wise Planning).
                            </span>
                          ) : (
                            (day.places || []).map((pName: string, pIdx: number) => (
                              <span
                                key={pIdx}
                                className="inline-flex items-center text-xs px-2.5 py-1 rounded-md bg-[#B8944F]/15 text-[#8F6F33] font-semibold border border-[#B8944F]/30"
                              >
                                🏛️ {pName}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Row 3: Hotel Stay Badge (Read-Only) */}
                      {day.hotelName && (
                        <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs">
                          <div className="flex items-center space-x-2">
                            <BedDouble className="h-4 w-4 text-[#B8944F]" />
                            <div>
                              <span className="font-bold text-[#14213D]">{day.hotelName}</span>
                              <span className="text-zinc-500 ml-2">Day {day.dayNumber} Stay</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 text-xs font-mono font-bold text-[#8F6F33]">
                            {day.hotelPricePerNight && (
                              <span>₹{day.hotelPricePerNight.toLocaleString("en-IN")} / night</span>
                            )}
                            {day.hotelPricePerPerson && (
                              <span>₹{day.hotelPricePerPerson.toLocaleString("en-IN")} / person</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Row 4: Day Dining & Add-ons Section (Read-Only) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-100">
                        {/* Day Restaurant Display (Read-Only) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                              <Utensils className="h-3.5 w-3.5 text-[#B8944F]" />
                              <span>Day Dining / Restaurant</span>
                            </label>
                            <span className="text-[10px] text-zinc-400 font-medium italic">Fetched from Day-Wise Planning</span>
                          </div>

                          {hotelAllMeals ? (
                            <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs space-y-0.5">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                                <span>🍽️</span>
                                <span>All Meals Covered by Hotel</span>
                              </div>
                              <p className="text-[10px] text-emerald-700">
                                <strong>{day.hotelName}</strong> includes Breakfast, Lunch, and Dinner (all 3 meals).
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2 bg-zinc-50 border border-zinc-200 rounded-lg">
                              {dayRestaurants.length === 0 ? (
                                <span className="text-[10px] text-zinc-400 italic py-0.5">
                                  No restaurant selected for Day {dayNum} (Configure in Day-Wise Planning).
                                </span>
                              ) : (
                                dayRestaurants.map((r: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center text-[10px] px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 font-bold border border-amber-200 gap-1"
                                  >
                                    <span>🍴 {r.name}</span>
                                    <span className="text-[9px] text-amber-700 font-medium">({r.cuisineType})</span>
                                    {r.isVeg && <span className="text-[9px] text-emerald-700 font-bold">[Veg]</span>}
                                  </span>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* Day Add-ons Display (Read-Only) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                              <PlusCircle className="h-3.5 w-3.5 text-[#B8944F]" />
                              <span>Day Add-ons</span>
                            </label>
                            <span className="text-[10px] text-zinc-400 font-medium italic">Fetched from Day-Wise Planning</span>
                          </div>

                          {/* Selected Add-ons Badges (Read-Only) */}
                          <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2 bg-zinc-50 border border-zinc-200 rounded-lg">
                            {dayAddOns.length === 0 ? (
                              <span className="text-[10px] text-zinc-400 italic py-0.5">
                                No add-on selected for Day {dayNum} (Configure in Day-Wise Planning).
                              </span>
                            ) : (
                              dayAddOns.map((a: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center text-[10px] px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 font-bold border border-blue-200 gap-1"
                                >
                                  <span>➕ {a.name}</span>
                                  <span className="text-[9px] text-emerald-700 font-mono font-bold">
                                    ₹{Number(a.price || 0).toLocaleString("en-IN")}
                                  </span>
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Row 4: Day Description - Visual Editor */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Day Description *
                        </label>
                        <RichTextEditor
                          value={day.description || ""}
                          onChange={(val) => updateDayField(dIdx, "description", val)}
                          placeholder="Detailed chronological plan of activities, sights, and highlights..."
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <div>
                <h2 className="text-xl font-bold text-[#14213D] font-fraunces flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-[#B8944F]" />
                  <span>Step 4: Stays & Accommodations</span>
                </h2>
              </div>
            </div>

            {/* Day-wise Hotel Itinerary Breakdown Cards */}
            {formData.itineraryDays.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-lg">
                No itinerary days configured. Please set your trip duration and dates in Step 2.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Day-by-Day Accommodation Schedule */}
                <div className="space-y-4">
                  {formData.itineraryDays.map((day: any, idx: number) => {
                    const matchedHotel = masterData.hotels.find(
                      (h) => h.name === day.hotelName || h.id === day.hotelId
                    );
                    const dayDateStr = formatDayDate(formData.startDate, idx);

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-5 craft-card transition-all ${
                          day.hotelName
                            ? "bg-white border-[#B8944F]/30 shadow-xs"
                            : "bg-zinc-50/70 border-zinc-200"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                          <div className="flex items-center space-x-2.5">
                            <span className="h-6 w-6 rounded-full bg-[#B8944F] text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {day.dayNumber}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-[#14213D] flex items-center gap-2">
                                <span>Day {day.dayNumber} Overnight Stay</span>
                                {matchedHotel && (
                                  <span className="text-xs text-amber-600 font-bold bg-amber-50 border border-amber-200 px-2 py-0.2 rounded">
                                    {matchedHotel.starRating}★ Star Property
                                  </span>
                                )}
                              </h4>
                              <p className="text-[11px] text-zinc-500">
                                📍 {day.cityOrStay || "Destination"} {dayDateStr ? `• 📅 ${dayDateStr}` : ""}
                              </p>
                            </div>
                          </div>

                          {/* Pricing badges */}
                          {day.hotelName && (
                            <div className="flex items-center space-x-3 text-xs font-mono font-bold text-[#8F6F33]">
                              {day.hotelPricePerNight && (
                                <span className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                  ₹{day.hotelPricePerNight.toLocaleString("en-IN")} / night
                                </span>
                              )}
                              {day.hotelPricePerPerson && (
                                <span className="bg-[#B8944F]/10 border border-[#B8944F]/20 px-2.5 py-1 rounded-lg">
                                  ₹{day.hotelPricePerPerson.toLocaleString("en-IN")} / person
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Hotel details or Empty state */}
                        {day.hotelName && matchedHotel ? (
                          <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-2.5">
                              <h5 className="font-bold text-[#14213D] text-base">
                                {matchedHotel.name}
                              </h5>
                              <p className="text-xs text-zinc-600 leading-relaxed">
                                {matchedHotel.overviewDescription ||
                                  "Luxury accommodation with premium hospitality amenities and curated guest services."}
                              </p>

                              {/* Room & Meal Details */}
                              <div className="flex flex-wrap gap-2 pt-1">
                                {matchedHotel.roomTypes?.length > 0 && (
                                  <span className="text-xs bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md font-semibold border border-zinc-200">
                                    🛏️ {matchedHotel.roomTypes[0]}
                                  </span>
                                )}
                                {matchedHotel.mealPlans?.length > 0 && (
                                  <span className="text-xs bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md font-semibold border border-zinc-200">
                                    🍽️ {matchedHotel.mealPlans[0]}
                                  </span>
                                )}
                                {matchedHotel.guestScore && (
                                  <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md font-bold">
                                    ★ {matchedHotel.guestScore}/5 ({matchedHotel.guestScoreLabel || "Excellent"})
                                  </span>
                                )}
                              </div>

                              {/* Facilities Badges */}
                              {matchedHotel.facilities?.length > 0 && (
                                <div className="pt-1">
                                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-1">
                                    Property Highlights & Amenities:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {matchedHotel.facilities.map((fac: string, fIdx: number) => (
                                      <span
                                        key={fIdx}
                                        className="text-[10px] bg-zinc-50 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded"
                                      >
                                        ✓ {fac}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Photos gallery preview */}
                            <div>
                              {matchedHotel.photos && matchedHotel.photos.length > 0 ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-semibold px-0.5">
                                    <span>Photo Gallery</span>
                                    <span className="text-[10px] bg-[#B8944F]/15 text-[#8F6F33] px-2 py-0.5 rounded-full font-bold">
                                      {matchedHotel.photos.length} Photos
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {matchedHotel.photos.slice(0, 4).map((p: string, pIdx: number) => (
                                      <div
                                        key={pIdx}
                                        className="group/photo relative h-20 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100"
                                      >
                                        <img
                                          src={p}
                                          alt={`${matchedHotel.name} ${pIdx + 1}`}
                                          className="h-full w-full object-cover group-hover/photo:scale-105 transition-transform duration-300"
                                        />
                                        {pIdx === 3 && matchedHotel.photos.length > 4 && (
                                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xs">
                                            +{matchedHotel.photos.length - 4} more
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-28 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs text-zinc-400">
                                  🏨 Master Hotel Photo
                                </div>
                              )}
                            </div>
                          </div>
                        ) : day.hotelName ? (
                          <div className="pt-3 text-xs text-zinc-700">
                            <p className="font-bold text-sm text-[#14213D]">{day.hotelName}</p>
                            <p className="text-zinc-500 mt-1">
                              Assigned for Day {day.dayNumber} in {day.cityOrStay}.
                            </p>
                          </div>
                        ) : (
                          <div className="pt-3 text-xs text-zinc-400 italic flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5 text-zinc-400" />
                            <span>
                              No overnight stay assigned for Day {day.dayNumber} (Day Trip / Transit / Departure).
                              To assign a hotel, select one in Step 2 Day-wise Planning Table.
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 5: {
        const getTransportIcon = (type: string) => {
          switch (type) {
            case "Flight":
              return <Plane className="h-4 w-4 text-[#B8944F] shrink-0" />;
            case "Train":
              return <Train className="h-4 w-4 text-[#B8944F] shrink-0" />;
            case "Bus":
            case "Luxury Coach":
              return <Bus className="h-4 w-4 text-[#B8944F] shrink-0" />;
            case "Car":
            case "Sedan":
            case "SUV":
            case "Tempo Traveller":
              return <Car className="h-4 w-4 text-[#B8944F] shrink-0" />;
            default:
              return <Car className="h-4 w-4 text-[#B8944F] shrink-0" />;
          }
        };

        const totalDays = (formData.itineraryDays || []).length;

        // Select or Deselect Inter-City Transfer for a specific day
        const handleSelectInterCity = (dayNum: number, masterRouteId: string | null) => {
          setFormData((prev: any) => {
            const updatedDays = (prev.itineraryDays || []).map((d: any) => {
              if (d.dayNumber === dayNum) {
                return {
                  ...d,
                  interCityTransferId: masterRouteId,
                  placeTransportMap: {
                    ...(d.placeTransportMap || {}),
                    inter_city_transfer_id: masterRouteId,
                  },
                };
              }
              return d;
            });
            const nextFlightDetails = syncFlightDetailsFromDays(updatedDays, masterData.flightRoutes, prev.flightDetails);
            return {
              ...prev,
              itineraryDays: updatedDays,
              flightDetails: nextFlightDetails,
            };
          });
        };

        // Clear all assigned Inter-City options across all days
        const handleClearAllInterCity = () => {
          setFormData((prev: any) => {
            const updatedDays = (prev.itineraryDays || []).map((d: any) => ({
              ...d,
              interCityTransferId: null,
              placeTransportMap: {
                ...(d.placeTransportMap || {}),
                inter_city_transfer_id: null,
              },
            }));
            const nextFlightDetails = syncFlightDetailsFromDays(updatedDays, masterData.flightRoutes, prev.flightDetails);
            return {
              ...prev,
              itineraryDays: updatedDays,
              flightDetails: nextFlightDetails,
            };
          });
        };

        // Toggle Local Transportation option (Multi-select) for a specific day
        const handleToggleLocalTransport = (dayNum: number, masterRouteId: string) => {
          setFormData((prev: any) => {
            const updatedDays = (prev.itineraryDays || []).map((d: any) => {
              if (d.dayNumber === dayNum) {
                const currentIds: string[] = d.localTransportIds || d.placeTransportMap?.local_transport_ids || [];
                const nextIds = currentIds.includes(masterRouteId)
                  ? currentIds.filter((id) => id !== masterRouteId)
                  : [...currentIds, masterRouteId];
                return {
                  ...d,
                  localTransportIds: nextIds,
                  placeTransportMap: {
                    ...(d.placeTransportMap || {}),
                    local_transport_ids: nextIds,
                  },
                };
              }
              return d;
            });
            const nextFlightDetails = syncFlightDetailsFromDays(updatedDays, masterData.flightRoutes, prev.flightDetails);
            return {
              ...prev,
              itineraryDays: updatedDays,
              flightDetails: nextFlightDetails,
            };
          });
        };

        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#14213D] font-fraunces flex items-center gap-2">
                  <Plane className="h-5 w-5 text-[#B8944F]" />
                  <span>Step 5: Transportation</span>
                </h2>
              </div>
            </div>

            {/* SECTION A: TRAVELLER'S OWN ARRANGEMENT */}
            <div className="bg-white border border-zinc-200/90 rounded-xl p-5 craft-card shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="h-5 w-5 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold flex items-center justify-center">
                    A
                  </span>
                  <h3 className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                    Traveller&apos;s Own Arrival Arrangement
                  </h3>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  name="ownArrivalArrangement"
                  value={formData.ownArrivalArrangement || ""}
                  onChange={handleInputChange}
                  placeholder="e.g. Vadodara to Ahmedabad — traveller's own arrangement."
                  className="w-full px-3.5 py-2.5 bg-zinc-50/60 hover:bg-white focus:bg-white border border-zinc-200 rounded-lg text-xs font-medium text-[#14213D] focus:ring-1 focus:ring-[#B8944F]/50 focus:border-[#B8944F] transition-all"
                />
              </div>
            </div>

            {/* SECTION B: MASTER INTER-CITY TRANSPORTATION SELECTION (PAGINATED & SEARCHABLE) */}
            <div className="bg-white border border-[#B8944F]/40 rounded-xl p-5 craft-card shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="h-8 w-8 rounded-lg bg-[#B8944F]/15 text-[#8F6F33] flex items-center justify-center shrink-0">
                    <Compass className="h-4.5 w-4.5 text-[#B8944F]" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-[#14213D] uppercase tracking-wider font-fraunces flex items-center gap-2">
                      <span>Inter-City Transportation Selection</span>
                    </h3>
                  </div>
                </div>

                {(() => {
                  const assignedCount = (formData.itineraryDays || []).filter((d: any) =>
                    Boolean(d.interCityTransferId || d.placeTransportMap?.inter_city_transfer_id)
                  ).length;
                  if (assignedCount === 0) return null;
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        {assignedCount} {assignedCount === 1 ? "Day Assigned" : "Days Assigned"}
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAllInterCity}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="Remove all assigned Inter-City routes across all days"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Remove All</span>
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Search & Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Search Input */}
                <div className="sm:col-span-6 relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={masterInterCitySearch}
                    onChange={(e) => {
                      setMasterInterCitySearch(e.target.value);
                      setMasterInterCityPage(1);
                    }}
                    placeholder="Search by city (e.g. Junagadh, Somnath), sector, provider, vehicle..."
                    className="w-full pl-8 pr-3 py-2 bg-zinc-50 hover:bg-white focus:bg-white border border-zinc-200 focus:border-[#B8944F] focus:ring-1 focus:ring-[#B8944F] rounded-lg text-xs font-medium text-[#14213D] outline-none transition-all"
                  />
                </div>

                {/* Vehicle Type Filter */}
                <div className="sm:col-span-3">
                  <select
                    value={masterInterCityTypeFilter}
                    onChange={(e) => {
                      setMasterInterCityTypeFilter(e.target.value);
                      setMasterInterCityPage(1);
                    }}
                    className="w-full px-3 py-2 bg-zinc-50 hover:bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-[#14213D] outline-none cursor-pointer focus:border-[#B8944F]"
                  >
                    <option value="ALL">All Vehicle Types</option>
                    <option value="Car">Car / Sedan</option>
                    <option value="SUV">SUV / Innova</option>
                    <option value="Tempo Traveller">Tempo Traveller</option>
                    <option value="Bus">Bus / Luxury Coach</option>
                    <option value="Train">Train</option>
                    <option value="Flight">Flight</option>
                    <option value="Helicopter">Helicopter</option>
                    <option value="Boat">Boat / Ferry</option>
                  </select>
                </div>

                {/* Page Size Selector */}
                <div className="sm:col-span-3 flex items-center justify-end gap-2 text-xs text-zinc-500 font-medium">
                  <span>Show:</span>
                  <select
                    value={masterInterCityPageSize}
                    onChange={(e) => {
                      setMasterInterCityPageSize(Number(e.target.value));
                      setMasterInterCityPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-zinc-50 hover:bg-white border border-zinc-200 rounded-md text-xs font-bold text-[#14213D] outline-none cursor-pointer"
                  >
                    <option value={6}>6 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                  </select>
                </div>
              </div>

              {/* Master Route Items List with Pagination */}
              {(() => {
                const allInterCityRoutes = masterData.flightRoutes.filter((r) =>
                  (r.transportCategory || "").toLowerCase().includes("inter-city")
                );

                const q = masterInterCitySearch.toLowerCase().trim();
                const filteredRoutes = allInterCityRoutes.filter((r) => {
                  const matchesQuery =
                    !q ||
                    (r.sector || "").toLowerCase().includes(q) ||
                    (r.fromCity || "").toLowerCase().includes(q) ||
                    (r.toCity || "").toLowerCase().includes(q) ||
                    (r.airline || "").toLowerCase().includes(q) ||
                    (r.type || "").toLowerCase().includes(q);

                  const matchesType =
                    masterInterCityTypeFilter === "ALL" ||
                    (r.type || "").toLowerCase().includes(masterInterCityTypeFilter.toLowerCase());

                  return matchesQuery && matchesType;
                });

                const totalRecords = filteredRoutes.length;
                const totalPages = Math.max(1, Math.ceil(totalRecords / masterInterCityPageSize));
                const currentPage = Math.min(masterInterCityPage, totalPages);
                const startIndex = (currentPage - 1) * masterInterCityPageSize;
                const endIndex = Math.min(startIndex + masterInterCityPageSize, totalRecords);
                const paginatedRoutes = filteredRoutes.slice(startIndex, endIndex);

                if (allInterCityRoutes.length === 0) {
                  return (
                    <div className="py-10 text-center text-zinc-400 text-xs bg-zinc-50 border border-dashed rounded-lg">
                      No Inter-City Transportation routes found in Master Data Hub.
                    </div>
                  );
                }

                if (totalRecords === 0) {
                  return (
                    <div className="py-10 text-center text-zinc-400 text-xs bg-zinc-50 border border-dashed rounded-lg">
                      No inter-city routes match your search filters.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {/* List Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {paginatedRoutes.map((r) => {
                        const assignedDays = (formData.itineraryDays || []).filter(
                          (d: any) =>
                            d.interCityTransferId === r.id ||
                            d.placeTransportMap?.inter_city_transfer_id === r.id
                        );
                        const targetDay = masterAssignDayMap[r.id] || 1;

                        return (
                          <div
                            key={r.id}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 shadow-2xs ${
                              assignedDays.length > 0
                                ? "bg-amber-50/60 border-amber-300 ring-1 ring-amber-200"
                                : "bg-white border-zinc-200/90 hover:border-[#B8944F]/50 hover:bg-amber-50/15"
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  <div className="h-7 w-7 rounded-md bg-[#B8944F]/10 text-[#B8944F] flex items-center justify-center shrink-0">
                                    {getTransportIcon(r.type || "Car")}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-[#14213D] text-xs truncate">
                                      {r.fromCity || "Departure"} &rarr; {r.toCity || "Destination"}
                                    </h4>
                                    <span className="text-[10px] text-zinc-500 font-medium">
                                      {r.sector || `${r.fromCity} to ${r.toCity}`} · {r.type || "Car"}
                                    </span>
                                  </div>
                                </div>

                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 shrink-0">
                                  {r.travelTime || "09:00 AM"}
                                </span>
                              </div>

                              <div className="text-[11px] text-zinc-600 flex items-center gap-2 flex-wrap">
                                <span>
                                  Provider: <strong>{r.airline}</strong>
                                </span>
                                {r.flightNotes && (
                                  <span className="text-[10px] text-zinc-400 italic truncate">
                                    • {r.flightNotes}
                                  </span>
                                )}
                              </div>

                              {/* Currently Assigned Days Badges */}
                              {assignedDays.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                  <span className="text-[10px] font-bold text-amber-900">
                                    Assigned to:
                                  </span>
                                  {assignedDays.map((ad: any) => (
                                    <span
                                      key={ad.dayNumber}
                                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300"
                                    >
                                      <span>Day {ad.dayNumber} ({ad.cityOrStay || "Stay"})</span>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectInterCity(ad.dayNumber, null)}
                                        className="text-amber-800 hover:text-red-600 font-bold ml-1 cursor-pointer"
                                        title={`Remove from Day ${ad.dayNumber}`}
                                      >
                                        &times;
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Assign to Day Controls */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100/90 text-xs">
                              <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                <span className="text-[11px] text-zinc-500 font-semibold shrink-0">
                                  Assign to:
                                </span>
                                <select
                                  value={targetDay}
                                  onChange={(e) =>
                                    setMasterAssignDayMap((prev) => ({
                                      ...prev,
                                      [r.id]: Number(e.target.value),
                                    }))
                                  }
                                  className="w-full max-w-[150px] px-2 py-1 bg-zinc-50 hover:bg-white border border-zinc-200 rounded-md text-[11px] font-bold text-[#14213D] outline-none cursor-pointer"
                                >
                                  {formData.itineraryDays.map((d: any, dIdx: number) => {
                                    const dNum = d.dayNumber || dIdx + 1;
                                    return (
                                      <option key={dNum} value={dNum}>
                                        Day {dNum} ({d.cityOrStay || `Day ${dNum}`})
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSelectInterCity(targetDay, r.id)}
                                className="px-3 py-1 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-md text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Assign</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-zinc-100 text-xs">
                      <span className="text-zinc-500 font-medium">
                        Showing <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{totalRecords}</strong> records
                      </span>

                      <div className="flex items-center space-x-1 self-center">
                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setMasterInterCityPage(1)}
                          className="p-1 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="First page"
                        >
                          <ChevronsLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setMasterInterCityPage((p) => Math.max(1, p - 1))}
                          className="p-1 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Previous page"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>

                        {/* Page Numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                          let pageNum = idx + 1;
                          if (totalPages > 5) {
                            if (currentPage > 3 && currentPage < totalPages - 2) {
                              pageNum = currentPage - 2 + idx;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + idx;
                            }
                          }
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setMasterInterCityPage(pageNum)}
                              className={`h-6 min-w-[24px] px-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                                currentPage === pageNum
                                  ? "bg-[#B8944F] text-white shadow-2xs"
                                  : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          disabled={currentPage === totalPages}
                          onClick={() => setMasterInterCityPage((p) => Math.min(totalPages, p + 1))}
                          className="p-1 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Next page"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={currentPage === totalPages}
                          onClick={() => setMasterInterCityPage(totalPages)}
                          className="p-1 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Last page"
                        >
                          <ChevronsRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* SECTION C: DAY-WISE TRANSPORTATION SCHEDULE */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#14213D] uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#B8944F]" />
                  <span>Day-wise Transportation Schedule ({totalDays} Days)</span>
                </h3>
              </div>

              {totalDays === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-xl">
                  No itinerary days found. Please configure days in Step 2: Day-wise Planning.
                </div>
              ) : (
                formData.itineraryDays.map((day: any, i: number) => {
                  const dayNum = day.dayNumber || (i + 1);
                  const dayDate = formatDayDate(formData.startDate, i);
                  const currCity = day.cityOrStay?.trim() || `Day ${dayNum} Location`;

                  // Selected Inter-City route for this day
                  const selectedInterCityId = day.interCityTransferId || day.placeTransportMap?.inter_city_transfer_id || null;
                  const selectedInterCity = selectedInterCityId
                    ? masterData.flightRoutes.find((r) => r.id === selectedInterCityId)
                    : null;

                  // Only show Inter-City section if an Inter-City transfer is explicitly assigned!
                  const hasInterCity = Boolean(selectedInterCity);

                  // Local Transportation from Master Data:
                  const localMatches = masterData.flightRoutes.filter((r) => {
                    const isLocalCat = (r.transportCategory || "").toLowerCase().includes("local");
                    const matchesCity =
                      (r.city?.name || "").toLowerCase().trim() === currCity.toLowerCase().trim() ||
                      (r.fromCity || "").toLowerCase().trim() === currCity.toLowerCase().trim() ||
                      (r.toCity || "").toLowerCase().trim() === currCity.toLowerCase().trim();
                    return isLocalCat && matchesCity;
                  });

                  // Current selected Local Transport IDs
                  const selectedLocalIds: string[] = day.localTransportIds || day.placeTransportMap?.local_transport_ids || [];
                  const selectedLocalRoutes = masterData.flightRoutes.filter((r) =>
                    selectedLocalIds.includes(r.id)
                  );

                  // Local Search filter
                  const localSearchTerm = (localSearchMap[dayNum] || "").toLowerCase().trim();
                  const filteredLocalMatches = localMatches.filter((r) => {
                    if (!localSearchTerm) return true;
                    return (
                      (r.sector || "").toLowerCase().includes(localSearchTerm) ||
                      (r.airline || "").toLowerCase().includes(localSearchTerm) ||
                      (r.type || "").toLowerCase().includes(localSearchTerm)
                    );
                  });

                  // Inter-City Section Renderer
                  const renderInterCitySection = () => {
                    if (!selectedInterCity) return null;

                    return (
                      <div
                        key="intercity-section"
                        className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-4 space-y-3 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-2.5">
                          <div className="flex items-center space-x-2.5">
                            <Compass className="h-4 w-4 text-[#B8944F]" />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                                  Inter-City Transportation
                                </h4>
                              </div>
                            </div>
                          </div>

                          {/* Remove Button */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSelectInterCity(dayNum, null)}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="Remove Inter-City transportation from this day"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>

                        {/* Selected Inter-City Route Display */}
                        <div className="p-3.5 bg-white border border-amber-300 rounded-lg shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-[#B8944F]/10 flex items-center justify-center shrink-0">
                              {getTransportIcon(selectedInterCity.type || "Car")}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-bold text-[#14213D] text-xs">
                                  {selectedInterCity.fromCity || currCity} &rarr; {selectedInterCity.toCity} · {selectedInterCity.type || "Transport"} · {selectedInterCity.airline}
                                </h5>
                                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                                  Active Route
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-500">
                                Provider: <strong>{selectedInterCity.airline}</strong> • Time: <strong>{selectedInterCity.travelTime || "09:00 AM"}</strong>
                                {selectedInterCity.flightNotes && <span> • <em>{selectedInterCity.flightNotes}</em></span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  // Local Section Renderer
                  const renderLocalSection = () => {
                    return (
                      <div
                        key="local-section"
                        className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-4 space-y-3 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
                          <div className="flex items-center space-x-2.5">
                            <MapPin className="h-4 w-4 text-emerald-700" />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                                  Local Transportation
                                </h4>
                              </div>
                              <p className="text-[11px] text-zinc-500 mt-0.5">
                                Destination City: <strong>{currCity}</strong> ({selectedLocalIds.length} selected)
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {localMatches.length} Options Available
                            </span>
                          </div>
                        </div>

                        {/* Selected Local Options Tag/Chip List */}
                        {selectedLocalRoutes.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                              Active Local Options for Day {dayNum}:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {selectedLocalRoutes.map((r) => (
                                <div
                                  key={r.id}
                                  className="p-2.5 bg-white border border-emerald-300 rounded-lg shadow-2xs flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-center space-x-2 min-w-0">
                                    <div className="h-6 w-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                                      {getTransportIcon(r.type || "Car")}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-[#14213D] truncate">
                                        {r.sector || `${currCity} Local Transport`}
                                      </div>
                                      <div className="text-[10px] text-zinc-500 truncate">
                                        {r.type || "Transport"} • {r.airline}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleLocalTransport(dayNum, r.id)}
                                    className="p-1 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                                    title="Deselect option"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Local Transportation Multi-Select / Searchable Picker */}
                        {localMatches.length === 0 ? (
                          /* No Local Transportation Found State */
                          <div className="flex items-center space-x-2.5 p-3.5 bg-emerald-50 border border-dashed border-emerald-300 rounded-lg text-xs text-emerald-950">
                            <AlertCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>
                              No local transportation options available in Master Data for <strong>{currCity}</strong>.
                            </span>
                          </div>
                        ) : (
                          /* Searchable Multi-select list */
                          <div className="space-y-2">
                            {localMatches.length > 4 && (
                              <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                                <input
                                  type="text"
                                  value={localSearchMap[dayNum] || ""}
                                  onChange={(e) =>
                                    setLocalSearchMap((prev) => ({
                                      ...prev,
                                      [dayNum]: e.target.value,
                                    }))
                                  }
                                  placeholder={`Search ${localMatches.length} local transport options in ${currCity}...`}
                                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium text-[#14213D] outline-none"
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                              {filteredLocalMatches.map((mr) => {
                                const isChecked = selectedLocalIds.includes(mr.id);
                                return (
                                  <button
                                    key={mr.id}
                                    type="button"
                                    onClick={() => handleToggleLocalTransport(dayNum, mr.id)}
                                    className={`text-left p-2.5 rounded-lg border transition-all flex items-start space-x-2.5 cursor-pointer shadow-2xs ${
                                      isChecked
                                        ? "bg-emerald-50/90 border-emerald-400 ring-1 ring-emerald-300"
                                        : "bg-white border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                                    }`}
                                  >
                                    <div
                                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                                        isChecked
                                          ? "bg-emerald-700 border-emerald-700 text-white"
                                          : "border-zinc-300 bg-white"
                                      }`}
                                    >
                                      {isChecked && <Check className="h-3 w-3" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-bold text-[#14213D] truncate">
                                        {mr.sector || `${currCity} Local Transfer`}
                                      </div>
                                      <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1.5">
                                        <span className="font-semibold text-zinc-700">{mr.type || "Transport"}</span>
                                        <span>•</span>
                                        <span className="truncate">{mr.airline}</span>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div
                      key={dayNum}
                      className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs space-y-4 p-5 hover:border-[#B8944F]/40 transition-all"
                    >
                      {/* READ-ONLY DAY HEADER */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FAF8F5] border border-zinc-200/80 rounded-lg px-4 py-2.5">
                        <div className="flex items-center space-x-2.5">
                          <span className="h-6 w-6 rounded-md bg-[#14213D] text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {dayNum}
                          </span>
                          <span className="font-bold text-[#14213D] text-sm font-fraunces">
                            Day {dayNum} {dayDate ? `· ${dayDate}` : ""} · {currCity}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {selectedInterCity ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <span>Inter-City Assigned: {selectedInterCity.fromCity || currCity} &rarr; {selectedInterCity.toCity}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Stay in {currCity}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Transportation Sections: Inter-City first if present, then Local */}
                      {hasInterCity && renderInterCitySection()}
                      {renderLocalSection()}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      }

      case 6: {
        const totalDays = (formData.itineraryDays || []).length;

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#14213D] font-fraunces flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-[#B8944F]" />
                  <span>Step 6: Optional Add-ons</span>
                </h2>
              </div>
            </div>

            {/* DAY-WISE BLOCKS DRIVEN BY TAB 2 */}
            <div className="space-y-5">
              {totalDays === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-xl">
                  No itinerary days found. Please configure days in Step 2: Day-wise Planning.
                </div>
              ) : (
                formData.itineraryDays.map((day: any, i: number) => {
                  const dayNum = day.dayNumber || (i + 1);
                  const dayDate = formatDayDate(formData.startDate, i);
                  const currCity = day.cityOrStay?.trim() || `Day ${dayNum} Location`;

                  // Add-ons selected for this day in Tab 2
                  const dayAddOns = (formData.addOns || [])
                    .map((a: any, originalIndex: number) => ({ ...a, originalIndex }))
                    .filter((a: any) => a.dayNumber === dayNum);

                  return (
                    <div
                      key={dayNum}
                      className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs p-5 space-y-4 hover:border-[#B8944F]/40 transition-all"
                    >
                      {/* Read-Only Day Header */}
                      <div className="flex items-center justify-between bg-[#FAF8F5] border border-zinc-200/80 rounded-lg px-4 py-2.5">
                        <div className="flex items-center space-x-2.5">
                          <span className="h-6 w-6 rounded-md bg-[#14213D] text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {dayNum}
                          </span>
                          <span className="font-bold text-[#14213D] text-sm font-fraunces">
                            Day {dayNum} {dayDate ? `· ${dayDate}` : ""} · {currCity}
                          </span>
                        </div>
               
                      </div>

                      {/* Selected Add-ons List (Read-Only) */}
                      {dayAddOns.length > 0 ? (
                        <div className="space-y-2">
                          {dayAddOns.map((a: any) => {
                            let desc: any = {};
                            try {
                              desc = typeof a.detailsJson === "string" ? JSON.parse(a.detailsJson) : a.detailsJson;
                            } catch (e) {}

                            return (
                              <div
                                key={a.originalIndex}
                                className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-[#14213D]">{a.name}</h4>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                      Day {dayNum} Add-on
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-zinc-500">
                                    <span className="font-mono font-bold text-emerald-800">₹{Number(a.price || 0).toLocaleString("en-IN")}</span> {a.priceType || "per person"}
                                    {desc?.visaType && <span> • {desc.visaType}</span>}
                                    {desc?.details && <span> • {desc.details}</span>}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 bg-zinc-50/60 border border-dashed border-zinc-200 rounded-lg text-xs text-zinc-400 italic flex items-center justify-center gap-1.5">
                          <Info className="h-3.5 w-3.5 text-zinc-400" />
                          <span>No Add-ons selected for Day {dayNum} in Step 2: Day-Wise Planning.</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      }

      case 7: {
        const totalDays = (formData.itineraryDays || []).length;

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#14213D] font-fraunces flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-[#B8944F]" />
                  <span>Step 7: Restaurant & Club</span>
                </h2>
              </div>
            </div>

            {/* DAY-WISE BLOCKS DRIVEN BY TAB 2 */}
            <div className="space-y-5">
              {totalDays === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-xl">
                  No itinerary days found. Please configure days in Step 2: Day-wise Planning.
                </div>
              ) : (
                formData.itineraryDays.map((day: any, i: number) => {
                  const dayNum = day.dayNumber || (i + 1);
                  const dayDate = formatDayDate(formData.startDate, i);
                  const currCity = day.cityOrStay?.trim() || `Day ${dayNum} Location`;

                  // Check if hotel covers all 3 meals
                  const hotelPlan = (day.mealPlan || "").toLowerCase();
                  const hotelAllMeals =
                    hotelPlan.includes("all meals") ||
                    hotelPlan.includes("american plan") ||
                    hotelPlan.includes("(ap)") ||
                    (hotelPlan.includes("breakfast") &&
                      hotelPlan.includes("lunch") &&
                      hotelPlan.includes("dinner"));

                  // Dining suggestions selected for this day in Tab 2
                  const dayRestaurants = (formData.restaurantSuggestions || [])
                    .map((r: any, originalIndex: number) => ({ ...r, originalIndex }))
                    .filter((r: any) => r.dayNumber === dayNum);

                  return (
                    <div
                      key={dayNum}
                      className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs p-5 space-y-4 hover:border-[#B8944F]/40 transition-all"
                    >
                      {/* Read-Only Day Header */}
                      <div className="flex items-center justify-between bg-[#FAF8F5] border border-zinc-200/80 rounded-lg px-4 py-2.5">
                        <div className="flex items-center space-x-2.5">
                          <span className="h-6 w-6 rounded-md bg-[#14213D] text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {dayNum}
                          </span>
                          <span className="font-bold text-[#14213D] text-sm font-fraunces">
                            Day {dayNum} {dayDate ? `· ${dayDate}` : ""} · {currCity}
                          </span>
                        </div>
                      </div>

                      {/* Content: All meals vs Restaurants vs Empty */}
                      {hotelAllMeals ? (
                        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                            <span>🍽️</span>
                            <span>All Meals Covered by Hotel</span>
                          </div>
                          <p className="text-[11px] text-emerald-700">
                            <strong>{day.hotelName || "Selected Hotel"}</strong> provides all 3 meals (Breakfast, Lunch & Dinner). External restaurant recommendations are not needed for Day {dayNum}.
                          </p>
                        </div>
                      ) : dayRestaurants.length > 0 ? (
                        <div className="space-y-2">
                          {dayRestaurants.map((r: any) => (
                            <div
                              key={r.originalIndex}
                              className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-[#14213D]">{r.name}</h4>
                                  <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded font-semibold">
                                    {r.category || "Restaurant"}
                                  </span>
                                  {r.isVeg && (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                                      Pure Veg / Jain
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-500">
                                  📍 {r.location || currCity} • Cuisine: <strong>{r.cuisineType}</strong> • ⭐ {r.rating || 4.5}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-zinc-50/60 border border-dashed border-zinc-200 rounded-lg text-xs text-zinc-400 italic flex items-center justify-center gap-1.5">
                          <Info className="h-3.5 w-3.5 text-zinc-400" />
                          <span>No restaurant selected for Day {dayNum} in Step 2: Day-Wise Planning.</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      }

      case 8: {
        const policyList: {
          key: "paymentPolicy" | "cancellationPolicy" | "visaRules" | "generalNotes";
          title: string;
          emoji: string;
        }[] = [
          {
            key: "paymentPolicy",
            title: "1. Payment Policy & Booking Deposit Schedule",
            emoji: "💳",
          },
          {
            key: "cancellationPolicy",
            title: "2. Cancellation & Refund Policy",
            emoji: "🔄",
          },
          {
            key: "visaRules",
            title: "3. Visa Rules & Passport Validity",
            emoji: "🛂",
          },
          {
            key: "generalNotes",
            title: "4. General Notes & Operational Advisory",
            emoji: "ℹ️",
          },
        ];

        const activeCount = policyList.filter(
          (p) => Boolean(formData.tripTerms?.[p.key] && formData.tripTerms[p.key].trim())
        ).length;

        const handleApplyTemplate = (val: string) => {
          setSelectedPolicyTemplateId(val);
          let targetTemplate: any = null;
          if (val === "GLOBAL") {
            targetTemplate = masterData.globalPolicy;
          } else {
            targetTemplate = (masterData.policyTemplates || []).find((pt: any) => pt.id === val);
          }

          if (targetTemplate) {
            const newCache = {
              paymentPolicy: targetTemplate.paymentPolicy || "",
              cancellationPolicy: targetTemplate.cancellationPolicy || "",
              visaRules: targetTemplate.visaRules || "",
              generalNotes: targetTemplate.generalNotes || "",
            };
            setPolicySourceCache(newCache);
            setFormData((prev: any) => ({
              ...prev,
              tripTerms: {
                paymentPolicy: newCache.paymentPolicy,
                cancellationPolicy: newCache.cancellationPolicy,
                visaRules: newCache.visaRules,
                generalNotes: newCache.generalNotes,
              },
            }));
          }
        };

        const togglePolicy = (key: "paymentPolicy" | "cancellationPolicy" | "visaRules" | "generalNotes") => {
          const isCurrentlyActive = Boolean(formData.tripTerms?.[key] && formData.tripTerms[key].trim());
          if (isCurrentlyActive) {
            // Deselect/Exclude this policy
            setFormData((prev: any) => ({
              ...prev,
              tripTerms: {
                ...prev.tripTerms,
                [key]: "",
              },
            }));
          } else {
            // Select/Include this policy
            const currentSourceVal =
              policySourceCache[key] ||
              (selectedPolicyTemplateId === "GLOBAL"
                ? masterData.globalPolicy?.[key]
                : (masterData.policyTemplates || []).find((pt: any) => pt.id === selectedPolicyTemplateId)?.[key]) ||
              masterData.globalPolicy?.[key] ||
              "<p>Standard policy terms apply.</p>";

            setFormData((prev: any) => ({
              ...prev,
              tripTerms: {
                ...prev.tripTerms,
                [key]: currentSourceVal,
              },
            }));
          }
        };

        const handleSelectAll = () => {
          const currentTemplate =
            selectedPolicyTemplateId === "GLOBAL"
              ? masterData.globalPolicy
              : (masterData.policyTemplates || []).find((pt: any) => pt.id === selectedPolicyTemplateId) ||
                masterData.globalPolicy;

          setFormData((prev: any) => ({
            ...prev,
            tripTerms: {
              paymentPolicy: policySourceCache.paymentPolicy || currentTemplate?.paymentPolicy || prev.tripTerms?.paymentPolicy || "",
              cancellationPolicy: policySourceCache.cancellationPolicy || currentTemplate?.cancellationPolicy || prev.tripTerms?.cancellationPolicy || "",
              visaRules: policySourceCache.visaRules || currentTemplate?.visaRules || prev.tripTerms?.visaRules || "",
              generalNotes: policySourceCache.generalNotes || currentTemplate?.generalNotes || prev.tripTerms?.generalNotes || "",
            },
          }));
        };

        const handleDeselectAll = () => {
          setFormData((prev: any) => ({
            ...prev,
            tripTerms: {
              paymentPolicy: "",
              cancellationPolicy: "",
              visaRules: "",
              generalNotes: "",
            },
          }));
        };

        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
                    Step 8: Master Policies & Guidelines
                  </h2>
                </div>
              </div>
            </div>

            {/* 4 Selective Policy Cards */}
            <div className="space-y-4">
              {policyList.map((pol) => {
                const content = formData.tripTerms?.[pol.key] || "";
                const isApplied = Boolean(content && content.trim());

                return (
                  <div
                    key={pol.key}
                    className={`border rounded-xl transition-all shadow-2xs overflow-hidden ${
                      isApplied
                        ? "bg-white border-emerald-300/80 ring-1 ring-emerald-400/20"
                        : "bg-zinc-50/60 border-zinc-200 opacity-80 hover:opacity-100"
                    }`}
                  >
                    {/* Policy Card Header with Toggle Switch */}
                    <div className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-150/70 bg-white">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl shrink-0">{pol.emoji}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-xs font-bold text-[#14213D] uppercase tracking-wide">
                              {pol.title}
                            </h3>
                          </div>
                        </div>
                      </div>

                      {/* Explicit Toggle Action */}
                      <button
                        type="button"
                        onClick={() => togglePolicy(pol.key)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
                          isApplied
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs"
                            : "bg-white hover:bg-emerald-50 text-zinc-700 hover:text-emerald-700 border-zinc-300 hover:border-emerald-300"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            isApplied ? "bg-white text-emerald-700 border-white" : "border-zinc-400"
                          }`}
                        >
                          {isApplied && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </div>
                        <span>{isApplied ? "Applied to Trip" : "Click to Apply"}</span>
                      </button>
                    </div>

                    {/* Policy Content Body */}
                    <div className="p-4 sm:px-5">
                      {isApplied ? (
                        <div className="space-y-3">
                          <div
                            className="text-xs text-zinc-700 leading-relaxed prose prose-sm max-w-none bg-zinc-50/70 p-3.5 rounded-lg border border-zinc-150"
                            dangerouslySetInnerHTML={{ __html: content }}
                          />
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                            <span className="flex items-center text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              This policy is selected and will appear in the proposal summary and generated PDF.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-3 px-3.5 bg-zinc-100/70 rounded-lg border border-dashed border-zinc-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                          <div className="flex items-center space-x-2 text-zinc-500 text-xs">
                            <AlertCircle className="h-4 w-4 text-zinc-400 shrink-0" />
                            <span>
                              This policy is currently <strong>excluded</strong> for this trip. It will NOT appear in the Itinerary, Summary, or Generated PDF.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => togglePolicy(pol.key)}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer shrink-0"
                          >
                            ＋ Include this policy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 9:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#14213D] font-fraunces">
              Step 9: Price Quotes
            </h2>

            {/* Price line items repeater */}
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-zinc-700">
                Plan Inclusions Cost Breakdown
              </label>

              {/* Add item bar with Master Pricing Label selector */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase">
                    Add Line Item
                  </span>
                  {masterData.pricingLabels.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setNewPriceLabel(e.target.value);
                        }
                      }}
                      value=""
                      className="text-[11px] font-semibold text-[#B8944F] bg-white border border-[#B8944F]/30 rounded px-2 py-0.5 outline-none cursor-pointer"
                    >
                      <option value="">⚡ Select from Master Pricing...</option>
                      {masterData.pricingLabels.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newPriceLabel}
                    onChange={(e) => setNewPriceLabel(e.target.value)}
                    placeholder="e.g. 5-Star Beachfront Luxury Villa (4 Nights)"
                    className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                  <div className="relative w-full sm:w-44">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={newPriceAmt}
                      onChange={(e) => setNewPriceAmt(e.target.value)}
                      placeholder="Amount (INR)"
                      className="w-full pl-7 pr-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-mono font-bold text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addPriceItem}
                    className="px-4 py-2 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {formData.priceQuoteItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-lg text-xs"
                  >
                    <span className="font-semibold text-[#14213D]">{item.label}</span>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-[#14213D]">
                        ₹{Number(item.amount).toLocaleString("en-IN")}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePriceItem(idx)}
                        className="text-zinc-400 hover:text-red-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary Card (TCS Read-only) */}
            <div className="bg-[#FAF8F5] border border-[#B8944F]/30 rounded-lg p-6 space-y-4 craft-card">
              <h3 className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                Financial Totals & Statutory TCS
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 border-b border-zinc-200 pb-4">
                <div>
                  <span className="text-[11px] text-zinc-500 font-semibold block">
                    Per-Person Price
                  </span>
                  <p className="text-sm font-bold text-[#14213D] font-mono mt-0.5">
                    ₹
                    {(() => {
                      const perPersonSubtotal = (formData.priceQuoteItems || []).reduce(
                        (acc: number, item: any) => acc + Number(item.amount || 0),
                        0
                      );
                      return perPersonSubtotal.toLocaleString("en-IN");
                    })()}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-zinc-500 font-semibold block">
                    Travellers
                  </span>
                  <p className="text-sm font-bold text-[#14213D] font-mono mt-0.5">
                    {formData.numTravellers || 1}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-zinc-500 font-semibold block">
                    Total Base Price
                  </span>
                  <p className="text-sm font-bold text-[#14213D] font-mono mt-0.5">
                    ₹
                    {(() => {
                      const perPersonSubtotal = (formData.priceQuoteItems || []).reduce(
                        (acc: number, item: any) => acc + Number(item.amount || 0),
                        0
                      );
                      return (perPersonSubtotal * Number(formData.numTravellers || 1)).toLocaleString("en-IN");
                    })()}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-zinc-500 font-semibold block">
                    Total TCS ({formData.tripFinancials.tcsPercentage}%)
                  </span>
                  <p className="text-sm font-bold text-[#14213D] font-mono mt-0.5">
                    ₹{formData.tripFinancials.tcsAmount?.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <span className="text-[11px] text-[#B8944F] font-bold block">
                    Grand Total
                  </span>
                  <p className="text-base font-black text-[#14213D] font-mono mt-0.5">
                    ₹{formData.tripFinancials.totalWithTcs?.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Additional Financial Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.tripFinancials.notes || ""}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      tripFinancials: { ...prev.tripFinancials, notes: e.target.value },
                    }))
                  }
                  placeholder="Notes regarding tax credits, payment terms, or dynamic airfare exclusions."
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-700 focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-[#FAF8F5] py-4 px-2 sm:px-6 font-sans text-[#14213D]">
      <div className="w-full mx-auto">
        {/* Nav Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-200">
          <div className="flex items-center space-x-3">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center text-xs font-bold text-zinc-600 hover:text-[#14213D] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5 text-[#B8944F]" /> Back to Workspace Console
              </button>
            ) : (
              <Link
                href="/"
                className="flex items-center text-xs font-bold text-zinc-600 hover:text-[#14213D] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5 text-[#B8944F]" /> Back to Workspace Console
              </Link>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Live Save Success Badge */}
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-in fade-in">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Blueprint Saved to Database!</span>
              </span>
            )}

            {/* Duplicate / Clone Existing Trip Button */}
            <button
              type="button"
              onClick={openDuplicateModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition-all shadow-2xs cursor-pointer"
              title="Duplicate and import an existing trip proposal"
            >
              <Copy className="h-3.5 w-3.5 text-[#B8944F]" />
              <span>Duplicate Trip</span>
            </button>

            {/* View Day-Wise Trip Summary if editing existing trip */}
            {tripId && (
              <Link
                href={`/admin/summary/${tripId}`}
                target="_blank"
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-[#B8944F]/40 bg-white hover:bg-[#B8944F]/10 text-xs font-bold text-[#B8944F] transition-all shadow-2xs cursor-pointer"
                title="Open Day-Wise Trip Summary"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Trip Summary</span>
              </Link>
            )}

            {/* Manage Master Data Button */}
            <Link
              href="/master-data"
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition-all shadow-2xs cursor-pointer"
            >
              <Database className="h-3.5 w-3.5 text-zinc-500" />
              <span>Master Data</span>
            </Link>

            {/* Top-Right Save Blueprint Button (Outside the tabs) */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#14213D] hover:bg-[#2B2E36] text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-3.5 w-3.5 text-[#B8944F]" />
                  <span>Saving Blueprint...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 text-[#B8944F]" />
                  <span>Save Blueprint</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Validation Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-bold">
            {error}
          </div>
        )}

        {/* Ungrounded Fallback Admin Review Banner */}
        {needsAdminReview && (
          <div className="mb-6 p-4 bg-amber-500/10 border-2 border-amber-400 rounded-xl flex items-start gap-3.5 text-amber-950 shadow-xs animate-in fade-in duration-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs font-extrabold uppercase tracking-wide text-amber-900 flex items-center gap-2">
                  <span>Admin Review Required</span>
                  <span className="px-1.5 py-0.2 bg-amber-200/80 text-amber-900 rounded text-[9px]">Ungrounded Source</span>
                </p>
                <p className="text-xs text-amber-950 font-medium">
                  Some details were generated without live verification — please review before finalizing this trip.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNeedsAdminReview(false)}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 px-2.5 py-1 bg-amber-200/60 hover:bg-amber-200 rounded-md self-start sm:self-center transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Step Indicators (8 exact steps, brass active indicators) */}
          <div className="lg:col-span-1 space-y-2">
            <div className="bg-white border border-[#B8944F]/20 rounded-lg p-4 sticky top-6 space-y-1 craft-card">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-3 px-1">
                BLUEPRINT STEPS
              </p>
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = step.number === currentStep;
                const isStep1IncompleteVal = step.number === 1 && isStep1Incomplete();
                const isCompleted = step.number < currentStep && !isStep1IncompleteVal;

                let buttonClasses = "text-zinc-500 hover:bg-zinc-50 cursor-pointer";
                if (isActive) {
                  buttonClasses = "bg-[#B8944F]/15 text-[#B8944F] font-bold cursor-pointer";
                } else if (isStep1IncompleteVal) {
                  buttonClasses = "text-red-500 hover:bg-red-50/50 cursor-pointer";
                } else if (isCompleted) {
                  buttonClasses = "text-[#14213D] font-medium hover:bg-zinc-50 cursor-pointer";
                }

                let indicatorClasses = "bg-zinc-50 border-zinc-200 text-zinc-500";
                if (isActive) {
                  indicatorClasses = "bg-[#B8944F] border-[#B8944F] text-white";
                } else if (isStep1IncompleteVal) {
                  indicatorClasses = "bg-red-50 border-red-300 text-red-600";
                } else if (isCompleted) {
                  indicatorClasses = "bg-zinc-100 border-zinc-300 text-zinc-700";
                }

                return (
                  <button
                    key={step.number}
                    type="button"
                    onClick={() => setCurrentStep(step.number)}
                    className={`w-full flex items-center space-x-3 p-2.5 rounded-md text-left transition-all ${buttonClasses}`}
                  >
                    <div
                      className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold border ${indicatorClasses}`}
                    >
                      {isCompleted ? <Check className="h-3 w-3" /> : step.number}
                    </div>
                    <span className="text-xs truncate">{step.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Content container */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-[#B8944F]/20 rounded-lg p-6 sm:p-8 craft-card shadow-sm">
              <div className="space-y-6">
                {renderStepContent()}

                {/* Footer Navigation */}
                <div className="flex items-center justify-between border-t border-zinc-200 pt-6 mt-8">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="flex items-center px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5 text-[#B8944F]" /> Previous Step
                  </button>

                  <div className="flex items-center space-x-2">
                    {/* Generate PDF Button stays as-is */}
                    {tripId && (
                      <button
                        type="button"
                        onClick={handleExportPDF}
                        disabled={downloading}
                        className="flex items-center px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-bold text-[#14213D] hover:border-[#B8944F] transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {downloading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-1 text-[#B8944F]" />
                            <span>Generating PDF...</span>
                          </>
                        ) : (
                          <>
                            <FileDown className="h-4 w-4 mr-1 text-[#B8944F]" />
                            <span>Generate PDF</span>
                          </>
                        )}
                      </button>
                    )}

                    {currentStep < STEPS.length ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="flex items-center px-5 py-2.5 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
                      >
                        Next Step <ArrowRight className="h-4 w-4 ml-1.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center px-6 py-2.5 rounded-lg bg-[#14213D] hover:bg-[#2B2E36] text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4 mr-1.5" /> Saving Blueprint...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-1.5 text-[#B8944F]" /> Save Blueprint
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate / Clone Trip Selection Modal */}
      {duplicateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center space-x-2">
                <Copy className="h-4 w-4 text-[#B8944F]" />
                <h3 className="text-sm font-bold text-[#14213D] font-fraunces">
                  Duplicate Existing Trip Blueprint
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <p className="text-xs text-zinc-500">
                Select an existing trip proposal to copy all its itinerary days, stays, flight details, add-ons, and policies into this new blueprint.
              </p>

              {loadingTrips ? (
                <div className="py-12 text-center text-zinc-400 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#B8944F]" />
                  <p className="text-xs">Loading available trip blueprints...</p>
                </div>
              ) : availableTrips.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                  No existing trips available to duplicate.
                </div>
              ) : (
                <div className="space-y-2">
                  {availableTrips.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 bg-zinc-50 hover:bg-[#FAF8F5] border border-zinc-200 hover:border-[#B8944F]/50 rounded-lg transition-all flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="text-xs font-bold text-[#14213D] truncate">{t.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                          <span>📍 {t.destination}</span>
                          <span>&bull;</span>
                          <span>{t.durationDays}D / {t.durationNights}N</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyTripData(t.id)}
                        disabled={cloningTripId === t.id}
                        className="px-3 py-1.5 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {cloningTripId === t.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Copying...</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy into Form</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 border-t border-zinc-100 bg-zinc-50/50 shrink-0">
              <button
                type="button"
                onClick={() => setDuplicateModalOpen(false)}
                className="px-4 py-2 border border-zinc-200 text-zinc-600 rounded-lg text-xs font-semibold hover:bg-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
