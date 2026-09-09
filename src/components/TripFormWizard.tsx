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
  { number: 1, name: "Core Trip & Consultant", icon: MapPin },
  { number: 2, name: "Day-wise Planning", icon: Table2 },
  { number: 3, name: "Day-by-Day Itinerary", icon: Calendar },
  { number: 4, name: "Stays & Accommodations", icon: Coffee },
  { number: 5, name: "Transportation", icon: Bus },
  { number: 6, name: "Optional Add-ons & Visa", icon: PlusCircle },
  { number: 7, name: "Restaurant & Club Suggestions", icon: Utensils },
  { number: 8, name: "Master Policies & Guidelines", icon: FileText },
  { number: 9, name: "Price Quotes & Financials", icon: DollarSign },
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
            }
            return prev;
          });
        }
      }
    }
    loadMasterData();
  }, [initialData]);

  const [isTitleCustomized, setIsTitleCustomized] = useState<boolean>(Boolean(initialData?.title));

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
        addOns: initialData.addOns || [],
        restaurantSuggestions: initialData.restaurantSuggestions || [],
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

  // Sync formData whenever initialData updates (e.g. switching trips inside dashboard)
  useEffect(() => {
    if (initialData) {
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
        itineraryDays: initialData.itineraryDays || [],
        accommodations: initialData.accommodations || [],
        flightDetails: initialData.flightDetails || [],
        addOns: initialData.addOns || [],
        restaurantSuggestions: initialData.restaurantSuggestions || [],
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
            title: `Day ${i + 1} - ${defaultCity || "Destination Exploration"}`,
            durationHours: "Full Day (8-9 hrs)",
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
    if (!formData.departureCity || masterData.consultants.length === 0) {
      setAutoMatchedConsultant(null);
      return;
    }

    const cleanInputCity = formData.departureCity.split("(")[0].trim().toLowerCase();
    if (!cleanInputCity) return;

    const matched = masterData.consultants.find((c: any) => {
      const consultantCity = (c.hubCity || "").toLowerCase();
      return consultantCity.includes(cleanInputCity) || cleanInputCity.includes(consultantCity);
    });

    if (matched) {
      setAutoMatchedConsultant(`${matched.name} (${matched.hubCity})`);
      setFormData((prev: any) => ({
        ...prev,
        consultantName: matched.name,
        consultantPhone: matched.phone || prev.consultantPhone,
      }));
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
      setFormData((prev: any) => {
        const newTitle = !isTitleCustomized
          ? generateAutoTitle(value, prev.destination, prev.itineraryDays)
          : prev.title;
        return {
          ...prev,
          departureCity: value,
          title: newTitle || prev.title,
        };
      });
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
            title: day.title,
            durationHours: day.durationHours || "Full Day (8-9 hrs)",
            description: day.description || "",
            places: day.places || [],
            hotelId: day.hotelId || null,
            hotelName: day.hotelName || null,
            hotelPricePerNight: day.hotelPricePerNight || null,
            hotelPricePerPerson: day.hotelPricePerPerson || null,
            inclusions: day.inclusions || [],
            exclusions: day.exclusions || [],
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
          addOns: (src.addOns || []).map((a: any) => ({
            name: a.name,
            detailsJson: a.detailsJson || {},
            price: a.price,
            priceType: a.priceType || "per person",
          })),
          restaurantSuggestions: (src.restaurantSuggestions || []).map((r: any) => ({
            location: r.location,
            cuisineType: r.cuisineType,
            name: r.name,
            rating: r.rating || 4.5,
            reviewCount: r.reviewCount || 100,
            isVeg: Boolean(r.isVeg),
            category: r.category || "Restaurant",
          })),
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
      title: `Day ${nextDayNum} - ${defaultCity || "Tour & Sightseeing"}`,
      durationHours: "Full Day (8-9 hrs)",
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
        description: "",
        title: `Day ${currentDay.dayNumber} - ${newCityName || "Exploration"}`,
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

      // Aggregate Descriptions
      const aggregatedDescription = selectedPlaceObjs
        .filter((p) => p.description)
        .map((p) => `• ${p.name}: ${p.description}`)
        .join("\n\n");

      const newTitle =
        currentPlaces.length > 0
          ? `${currentDay.cityOrStay || "Tour"}: ${currentPlaces.slice(0, 2).join(" & ")}${
              currentPlaces.length > 2 ? ` (+${currentPlaces.length - 2} more)` : ""
            }`
          : currentDay.title;

      updatedDays[dIdx] = {
        ...currentDay,
        places: currentPlaces,
        placeTransportMap: currentTransportMap,
        title: newTitle || currentDay.title,
        description: aggregatedDescription || currentDay.description,
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

  // Quick Add / Inline Add to Master Data State
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    transportCategory: "Inter-City Transfer" as "Inter-City Transfer" | "Local Transfer",
    fromCity: "",
    toCity: "",
    city: "",
    airline: "",
    type: "Car",
    travelTime: "10:00 AM",
    flightCodeDefault: "",
    flightNotes: "",
    saveToMasterData: true,
    targetDayNum: null as number | null,
  });
  const [savingQuickAdd, setSavingQuickAdd] = useState(false);

  // Search filter states for Tab 5 pickers
  const [interCitySearchMap, setInterCitySearchMap] = useState<{ [dayNum: number]: string }>({});
  const [localSearchMap, setLocalSearchMap] = useState<{ [dayNum: number]: string }>({});

  const syncFlightDetailsFromDays = (days: any[], masterRoutes: any[], existingFlightDetails: any[] = []) => {
    const list: any[] = [];
    (days || []).forEach((d: any) => {
      const dayNum = d.dayNumber;
      
      // 1. Inter-City Transfer
      const interId = d.interCityTransferId || d.placeTransportMap?.inter_city_transfer_id;
      if (interId) {
        const mr = masterRoutes.find((r: any) => r.id === interId);
        if (mr) {
          list.push({
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
          });
        }
      }

      // 2. Local Transfers
      const localIds: string[] = d.localTransportIds || d.placeTransportMap?.local_transport_ids || [];
      localIds.forEach((lid) => {
        const mr = masterRoutes.find((r: any) => r.id === lid);
        if (mr) {
          list.push({
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
    });

    return list;
  };

  const startQuickAdd = (
    category: "Inter-City Transfer" | "Local Transfer",
    fromCity = "",
    toCity = "",
    city = "",
    targetDayNum?: number
  ) => {
    setQuickAddForm({
      transportCategory: category,
      fromCity,
      toCity,
      city: city || fromCity || "",
      airline: "",
      type: "Car",
      travelTime: "10:00 AM",
      flightCodeDefault: "",
      flightNotes: "",
      saveToMasterData: true,
      targetDayNum: targetDayNum ?? null,
    });
    setQuickAddModalOpen(true);
  };

  const handleQuickAddSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddForm.airline.trim()) {
      alert("Please provide a Carrier or Vehicle Provider Name.");
      return;
    }

    setSavingQuickAdd(true);
    try {
      const isInterCity = quickAddForm.transportCategory === "Inter-City Transfer";
      const fromC = isInterCity ? quickAddForm.fromCity : quickAddForm.city;
      const toC = isInterCity ? quickAddForm.toCity : quickAddForm.city;
      const sectorName = isInterCity
        ? `${quickAddForm.fromCity} to ${quickAddForm.toCity}`
        : `${quickAddForm.city} Local Transfer`;

      const fromCityObj = masterData.cities.find(
        (c) => c.name.toLowerCase() === fromC.toLowerCase()
      );
      const toCityObj = masterData.cities.find(
        (c) => c.name.toLowerCase() === toC.toLowerCase()
      );

      const res = await createMasterFlightRoute({
        sector: sectorName,
        airline: quickAddForm.airline,
        transportCategory: quickAddForm.transportCategory,
        fromCity: fromC,
        fromCityId: fromCityObj?.id || undefined,
        toCity: toC,
        toCityId: toCityObj?.id || undefined,
        cityId: fromCityObj?.id || undefined,
        type: quickAddForm.type,
        travelTime: quickAddForm.travelTime,
        flightCodeDefault: quickAddForm.flightCodeDefault,
        flightNotes: quickAddForm.flightNotes,
        cabinBaggageKg: 7,
        checkInBaggageKg: 20,
      });

      if (res.success && res.data) {
        const createdRoute = res.data;
        const updatedRoutes = [createdRoute, ...masterData.flightRoutes];
        setMasterData((prev) => ({
          ...prev,
          flightRoutes: updatedRoutes,
        }));

        // Auto-select the newly created record for the target day
        if (quickAddForm.targetDayNum) {
          const targetDay = quickAddForm.targetDayNum;
          setFormData((prev: any) => {
            const updatedDays = (prev.itineraryDays || []).map((d: any) => {
              if (d.dayNumber === targetDay) {
                if (isInterCity) {
                  return {
                    ...d,
                    interCityTransferId: createdRoute.id,
                    placeTransportMap: {
                      ...(d.placeTransportMap || {}),
                      inter_city_transfer_id: createdRoute.id,
                    },
                  };
                } else {
                  const currentLocalIds = d.localTransportIds || d.placeTransportMap?.local_transport_ids || [];
                  const nextLocalIds = currentLocalIds.includes(createdRoute.id)
                    ? currentLocalIds
                    : [...currentLocalIds, createdRoute.id];
                  return {
                    ...d,
                    localTransportIds: nextLocalIds,
                    placeTransportMap: {
                      ...(d.placeTransportMap || {}),
                      local_transport_ids: nextLocalIds,
                    },
                  };
                }
              }
              return d;
            });

            const nextFlightDetails = syncFlightDetailsFromDays(updatedDays, updatedRoutes, prev.flightDetails);
            return {
              ...prev,
              itineraryDays: updatedDays,
              flightDetails: nextFlightDetails,
            };
          });
        }
      }

      setQuickAddModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error adding transport option.");
    } finally {
      setSavingQuickAdd(false);
    }
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
              Step 1: Core Trip & Consultant Details
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
                <p className="text-[10px] text-zinc-400">
                  Format: [Origin City] to [Destination City] [Trip Type] (Editable).
                </p>
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

              {/* Destination Country/City (Single-Select from Master Data Hub) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Destination Country/City *
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
                <p className="text-[10px] text-zinc-400">
                  Select the primary destination city from Master Data Hub &rarr; Cities.
                </p>
              </div>

              {/* Departure City (India Hubs Only - Single City Only) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Departure City (India Hubs Only) *
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
                    setFormData((prev: any) => ({
                      ...prev,
                      departureCity: chosen,
                      title: newTitle || prev.title,
                    }));
                    if (chosen && masterData.consultants.length > 0) {
                      const matchedC = masterData.consultants.find((c: any) => {
                        const dep = (c.hubCity || c.departureCity || "").toLowerCase();
                        return dep.includes(chosen.toLowerCase()) || chosen.toLowerCase().includes(dep);
                      });
                      if (matchedC) {
                        setFormData((prev: any) => ({
                          ...prev,
                          consultantName: matchedC.name,
                          consultantPhone: matchedC.phone || prev.consultantPhone,
                        }));
                      }
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
                <p className="text-[10px] text-zinc-400">
                  Displays single return departure hub managed in Master Data Hub &rarr; Cities. Auto-assigns mapped consultant.
                </p>
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
                  Duration Days (Auto-Calculated)
                </label>
                <div className="px-4 py-2.5 bg-zinc-100/80 border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] font-mono">
                  {formData.durationDays} Days
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Duration Nights (Auto-Calculated)
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
                <p className="text-[10px] text-zinc-400">
                  Plain text note for client itinerary (no master data link or cost calculation).
                </p>
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
                    const dayDateStr = formatDayDate(formData.startDate, dIdx);
                    const currentCity = masterData.cities.find(
                      (c) => c.name.toLowerCase() === (day.cityOrStay || "").toLowerCase()
                    );
                    const cityHotels = currentCity
                      ? masterData.hotels.filter((h) => h.cityId === currentCity.id)
                      : masterData.hotels;
                    const cityPlaces = currentCity
                      ? masterData.places.filter((p) => p.cityId === currentCity.id)
                      : masterData.places;

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
                              <p className="text-[10px] text-zinc-400">
                                Filters available hotels and places from Master Data Hub.
                              </p>
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
                                <span className="text-[10px] text-zinc-400 font-normal">
                                  {(day.places || []).length} Selected
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

                            {/* Auto-Populated Summary Preview */}
                            <div className="space-y-2 bg-[#FAF8F5]/80 p-3 rounded-lg border border-zinc-200/70 text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-zinc-700">
                                <Sparkles className="h-3.5 w-3.5 text-[#B8944F]" />
                                <span>Auto-Generated Day Summary</span>
                              </div>

                              <div className="text-[11px] font-semibold text-[#14213D] truncate">
                                🏷️ {day.title || `Day ${day.dayNumber}`}
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
                                  {day.description}
                                </p>
                              )}
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
                  const currentCity = masterData.cities.find(
                    (c) =>
                      c.name.toLowerCase() === (day.cityOrStay || "").toLowerCase()
                  );
                  const cityPlaces = currentCity
                    ? masterData.places.filter((p) => p.cityId === currentCity.id)
                    : masterData.places;

                  return (
                    <div
                      key={dIdx}
                      className="bg-white border border-[#B8944F]/20 rounded-xl p-5 craft-card space-y-5"
                    >
                      {/* Top Header of Day */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                        <div className="flex items-center space-x-2">
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

                      {/* Row 2: Places Badges */}
                      <div className="space-y-2 bg-zinc-50/70 p-3 rounded-lg border border-zinc-200/80">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-zinc-700 flex items-center space-x-1.5">
                            <Landmark className="h-3.5 w-3.5 text-[#B8944F]" />
                            <span>Places & Sights Included</span>
                          </label>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {(day.places || []).length} places assigned
                          </span>
                        </div>

                        {/* Selected Places Pills */}
                        <div className="flex flex-wrap gap-1.5 min-h-7 p-2 bg-white border border-zinc-200 rounded-lg">
                          {(day.places || []).map((pName: string, pIdx: number) => (
                            <span
                              key={pIdx}
                              className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-[#B8944F]/15 text-[#8F6F33] font-semibold border border-[#B8944F]/30"
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
                          ))}
                        </div>

                        {/* Special Transport Dropdowns for Places in Step 3 */}
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

                        {/* Quick City Places Picker */}
                        {cityPlaces.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                              Quick Add Place ({day.cityOrStay || "All"}):
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {cityPlaces.map((cp: any) => {
                                const isSelected = (day.places || []).includes(cp.name);
                                return (
                                  <button
                                    key={cp.id}
                                    type="button"
                                    onClick={() => handleToggleDayPlace(dIdx, cp.name)}
                                    className={`text-[11px] px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-[#B8944F] text-white border-[#B8944F] font-bold"
                                        : "bg-white text-zinc-600 border-zinc-200"
                                    }`}
                                  >
                                    {isSelected ? "✓ " : "+ "}
                                    {cp.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Row 3: Hotel Stay Badge */}
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

                      {/* Row 4: Day Description */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Day Description *
                        </label>
                        <textarea
                          rows={4}
                          value={day.description || ""}
                          onChange={(e) => updateDayField(dIdx, "description", e.target.value)}
                          placeholder="Detailed chronological plan of activities..."
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] outline-none leading-relaxed"
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
                  <span>Step 5: Transportation & Transit Arrangements</span>
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Connected directly to Master Data Transportation (Inter-City &amp; Local Transportation).
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => startQuickAdd("Inter-City Transfer")}
                  className="px-3.5 py-1.5 bg-white border border-[#B8944F]/40 hover:bg-zinc-50 text-[#8F6F33] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Quick Add Route</span>
                </button>
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
                <span className="text-[11px] text-zinc-400 font-medium">Independent Transit</span>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  name="ownArrivalArrangement"
                  value={formData.ownArrivalArrangement || ""}
                  onChange={handleInputChange}
                  placeholder="e.g. Vadodara to Ahmedabad — traveller's own arrangement."
                  className="w-full px-3.5 py-2.5 bg-zinc-50/60 hover:bg-white focus:bg-white border border-zinc-200 rounded-lg text-xs font-medium text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none transition-all"
                />
                <p className="text-[11px] text-zinc-400">
                  {formData.ownArrivalArrangement ? (
                    <span className="text-emerald-700 font-medium">✓ Displayed in final client itinerary under Traveller Arrangements.</span>
                  ) : (
                    "Plain text for traveller's independent arrival transit. No master data link or cost calculation."
                  )}
                </p>
              </div>
            </div>

            {/* DAY-WISE BLOCKS DRIVEN BY TAB 2 */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#14213D] uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#B8944F]" />
                  <span>Day-wise Transportation Schedule ({totalDays} Days)</span>
                </h3>
                <span className="text-[11px] text-zinc-400">
                  Sourced strictly from Tab 2 Day-wise Planning
                </span>
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
                  const isLastDay = i === totalDays - 1;
                  const nextDay = !isLastDay ? formData.itineraryDays[i + 1] : null;
                  const nextCity = nextDay ? (nextDay.cityOrStay?.trim() || null) : null;
                  
                  // Inter-City Skip Logic:
                  // Show ONLY when: not last day AND current city !== next city
                  const isInterCityTransition = Boolean(
                    !isLastDay && nextCity && currCity.toLowerCase() !== nextCity.toLowerCase()
                  );

                  // 1. Query Inter-City Transfer from Master Data:
                  // category = "Inter-City Transfer" AND from_city = current_day.city AND to_city = next_day.city
                  const interCityMatches = isInterCityTransition
                    ? masterData.flightRoutes.filter((r) => {
                        const isInterCityCat = (r.transportCategory || "").toLowerCase().includes("inter-city");
                        const matchesFrom = (r.fromCity || "").toLowerCase().trim() === currCity.toLowerCase().trim();
                        const matchesTo = (r.toCity || "").toLowerCase().trim() === nextCity!.toLowerCase().trim();
                        return isInterCityCat && matchesFrom && matchesTo;
                      })
                    : [];

                  // Current selected Inter-City route ID
                  const selectedInterCityId = day.interCityTransferId || day.placeTransportMap?.inter_city_transfer_id || null;
                  const selectedInterCity = selectedInterCityId
                    ? masterData.flightRoutes.find((r) => r.id === selectedInterCityId)
                    : null;

                  // Inter-City Search filter
                  const interSearchTerm = (interCitySearchMap[dayNum] || "").toLowerCase().trim();
                  const filteredInterCityMatches = interCityMatches.filter((r) => {
                    if (!interSearchTerm) return true;
                    return (
                      (r.sector || "").toLowerCase().includes(interSearchTerm) ||
                      (r.airline || "").toLowerCase().includes(interSearchTerm) ||
                      (r.type || "").toLowerCase().includes(interSearchTerm)
                    );
                  });

                  // 2. Query Local Transportation from Master Data:
                  // category = "Local Transportation" (or "Local Transfer") AND destination_city = current_day.city
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
                          {isInterCityTransition ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <span>Inter-City Transition &rarr; {nextCity}</span>
                            </span>
                          ) : isLastDay ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                              Final Tour Day
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Stay in {currCity} (No Inter-City Transfer)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 1. INTER-CITY TRANSFER SECTION (Shown ONLY when current day city !== next day city) */}
                      {isInterCityTransition && (
                        <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-2.5">
                            <div className="flex items-center space-x-2">
                              <Compass className="h-4 w-4 text-[#B8944F]" />
                              <div>
                                <h4 className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                                  Inter-City Transfer
                                </h4>
                                <p className="text-[11px] text-zinc-500">
                                  From: <strong>{currCity}</strong> &nbsp;•&nbsp; To: <strong>{nextCity}</strong>
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => startQuickAdd("Inter-City Transfer", currCity, nextCity!, "", dayNum)}
                              className="text-[11px] font-bold text-[#8F6F33] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add New Transfer</span>
                            </button>
                          </div>

                          {/* Selected Inter-City Route Display */}
                          {selectedInterCity ? (
                            <div className="p-3.5 bg-white border border-amber-300 rounded-lg shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-[#B8944F]/10 flex items-center justify-center shrink-0">
                                  {getTransportIcon(selectedInterCity.type || "Car")}
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className="font-bold text-[#14213D] text-xs">
                                      {selectedInterCity.fromCity || currCity} &rarr; {selectedInterCity.toCity || nextCity} · {selectedInterCity.type || "Transport"} · {selectedInterCity.airline}
                                    </h5>
                                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                                      Selected Route
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-zinc-500">
                                    Provider: <strong>{selectedInterCity.airline}</strong> • Time: <strong>{selectedInterCity.travelTime || "09:00 AM"}</strong>
                                    {selectedInterCity.flightNotes && <span> • <em>{selectedInterCity.flightNotes}</em></span>}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSelectInterCity(dayNum, null)}
                                  className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : interCityMatches.length === 0 ? (
                            /* No Matching Inter-City Transfer Found State */
                            <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-amber-50 border border-dashed border-amber-300 rounded-lg text-xs gap-3">
                              <div className="flex items-center space-x-2 text-amber-950 font-medium">
                                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                                <span>
                                  No transfer found for <strong>{currCity} to {nextCity}</strong> — Add New
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => startQuickAdd("Inter-City Transfer", currCity, nextCity!, "", dayNum)}
                                className="px-3 py-1.5 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-md text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add New</span>
                              </button>
                            </div>
                          ) : (
                            /* Search and Select Inter-City Picker */
                            <div className="space-y-2">
                              {interCityMatches.length > 3 && (
                                <div className="relative">
                                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                                  <input
                                    type="text"
                                    value={interCitySearchMap[dayNum] || ""}
                                    onChange={(e) =>
                                      setInterCitySearchMap((prev) => ({
                                        ...prev,
                                        [dayNum]: e.target.value,
                                      }))
                                    }
                                    placeholder={`Search ${interCityMatches.length} transfer options for ${currCity} → ${nextCity}...`}
                                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium text-[#14213D] outline-none"
                                  />
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                {filteredInterCityMatches.map((mr) => (
                                  <button
                                    key={mr.id}
                                    type="button"
                                    onClick={() => handleSelectInterCity(dayNum, mr.id)}
                                    className="text-left p-2.5 bg-white border border-amber-200/90 hover:border-[#B8944F] hover:bg-amber-50/50 rounded-lg transition-all flex items-start space-x-2.5 cursor-pointer shadow-2xs group"
                                  >
                                    <div className="h-7 w-7 rounded-md bg-[#B8944F]/10 text-[#B8944F] flex items-center justify-center shrink-0 mt-0.5">
                                      {getTransportIcon(mr.type || "Car")}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-bold text-[#14213D] truncate group-hover:text-[#B8944F]">
                                        {mr.fromCity || currCity} &rarr; {mr.toCity || nextCity} · {mr.type || "Transport"} · {mr.airline}
                                      </div>
                                      <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-2">
                                        <span>Time: {mr.travelTime || "09:00 AM"}</span>
                                        {mr.flightNotes && <span className="truncate italic">• {mr.flightNotes}</span>}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. LOCAL TRANSPORTATION SECTION (Always displayed for EVERY day) */}
                      <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-emerald-700" />
                            <div>
                              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                                Local Transportation
                              </h4>
                              <p className="text-[11px] text-zinc-500">
                                Destination City: <strong>{currCity}</strong> ({selectedLocalIds.length} selected)
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => startQuickAdd("Local Transfer", currCity, currCity, currCity, dayNum)}
                            className="text-[11px] font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add New Local Transport</span>
                          </button>
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
                          <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-emerald-50 border border-dashed border-emerald-300 rounded-lg text-xs gap-3">
                            <div className="flex items-center space-x-2 text-emerald-950 font-medium">
                              <AlertCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span>
                                No local transportation found for <strong>{currCity}</strong> — Add New
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => startQuickAdd("Local Transfer", currCity, currCity, currCity, dayNum)}
                              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-md text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add New</span>
                            </button>
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
                    </div>
                  );
                })
              )}
            </div>

            {/* QUICK ADD MODAL (SAVED DIRECTLY TO MASTER DATA & ASSIGNED TO DAY) */}
            {quickAddModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
                    <h3 className="text-sm font-bold text-[#14213D] flex items-center gap-2">
                      <Plus className="h-4 w-4 text-[#B8944F]" />
                      <span>
                        Add Master {quickAddForm.transportCategory === "Inter-City Transfer" ? "Inter-City Transfer" : "Local Transportation"}
                      </span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setQuickAddModalOpen(false)}
                      className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleQuickAddSave} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
                    {quickAddForm.transportCategory === "Inter-City Transfer" ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            From City *
                          </label>
                          <input
                            type="text"
                            required
                            value={quickAddForm.fromCity}
                            onChange={(e) => setQuickAddForm({ ...quickAddForm, fromCity: e.target.value })}
                            placeholder="e.g. Ahmedabad"
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            To City *
                          </label>
                          <input
                            type="text"
                            required
                            value={quickAddForm.toCity}
                            onChange={(e) => setQuickAddForm({ ...quickAddForm, toCity: e.target.value })}
                            placeholder="e.g. Udaipur"
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Destination City *
                        </label>
                        <input
                          type="text"
                          required
                          value={quickAddForm.city}
                          onChange={(e) => setQuickAddForm({ ...quickAddForm, city: e.target.value })}
                          placeholder="e.g. Ahmedabad or Udaipur"
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Carrier / Vehicle Provider Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={quickAddForm.airline}
                        onChange={(e) => setQuickAddForm({ ...quickAddForm, airline: e.target.value })}
                        placeholder="e.g. ABC Travels / Private AC Sedan"
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Vehicle Type
                        </label>
                        <select
                          value={quickAddForm.type}
                          onChange={(e) => setQuickAddForm({ ...quickAddForm, type: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                        >
                          {["Car", "Sedan", "SUV", "Tempo Traveller", "Flight", "Train", "Bus", "Luxury Coach", "Helicopter", "Boat", "Auto-rickshaw", "Other"].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Preferred Travel Time
                        </label>
                        <input
                          type="text"
                          value={quickAddForm.travelTime}
                          onChange={(e) => setQuickAddForm({ ...quickAddForm, travelTime: e.target.value })}
                          placeholder="e.g. 10:00 AM / Flexible"
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Notes / Instructions
                      </label>
                      <input
                        type="text"
                        value={quickAddForm.flightNotes}
                        onChange={(e) => setQuickAddForm({ ...quickAddForm, flightNotes: e.target.value })}
                        placeholder="e.g. Tolls, fuel and driver allowance included"
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#B8944F] shrink-0" />
                      <span>
                        Saves to Master Data Hub and automatically assigns to <strong>Day {quickAddForm.targetDayNum || 1}</strong>.
                      </span>
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => setQuickAddModalOpen(false)}
                        className="px-4 py-2 border border-zinc-200 text-zinc-600 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingQuickAdd}
                        className="px-4 py-2 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {savingQuickAdd && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>Save &amp; Select</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 6: {
        const totalDays = (formData.itineraryDays || []).length;

        const handleAddMasterAddOnToDay = (dayNum: number, addonName: string) => {
          if (!addonName) return;
          const addon = masterData.addOns.find((a) => a.name === addonName);
          if (!addon) return;

          const newItem = {
            dayNumber: dayNum,
            name: addon.name,
            detailsJson: {
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
            addOns: prev.addOns.filter((_: any, i: number) => i !== index),
          }));
        };

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#14213D] font-fraunces flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-[#B8944F]" />
                  <span>Step 6: Optional Add-ons, Visas & Experiences</span>
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Day-wise add-on services, visa arrangements, sightseeing passes, and travel packages.
                </p>
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

                  // Matching master add-ons for this day's city
                  const matchingMasterAddons = masterData.addOns.filter((a: any) => {
                    const cityMatch =
                      a.city?.name?.toLowerCase() === currCity.toLowerCase() ||
                      a.cityId === masterData.cities.find((c: any) => c.name.toLowerCase() === currCity.toLowerCase())?.id ||
                      (a.cityIds && a.cityIds.includes(masterData.cities.find((c: any) => c.name.toLowerCase() === currCity.toLowerCase())?.id));
                    const isUniversal = !a.cityId && (!a.cityIds || a.cityIds.length === 0) && !a.city;
                    return cityMatch || isUniversal;
                  });

                  // Add-ons selected for this day
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
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {dayAddOns.length} {dayAddOns.length === 1 ? "Add-on Selected" : "Add-ons Selected"}
                        </span>
                      </div>

                      {/* Selected Add-ons List */}
                      {dayAddOns.length > 0 && (
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
                                  <h4 className="font-bold text-[#14213D]">{a.name}</h4>
                                  <p className="text-[11px] text-zinc-500">
                                    <span className="font-mono font-bold text-emerald-800">₹{Number(a.price || 0).toLocaleString("en-IN")}</span> {a.priceType || "per person"}
                                    {desc?.visaType && <span> • {desc.visaType}</span>}
                                    {desc?.details && <span> • {desc.details}</span>}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveDayAddOn(a.originalIndex)}
                                  className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Remove add-on"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add-on Selector */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddMasterAddOnToDay(dayNum, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-[#14213D] outline-none cursor-pointer"
                        >
                          <option value="">
                            {matchingMasterAddons.length > 0
                              ? `+ Add add-on for Day ${dayNum} (${matchingMasterAddons.length} available for ${currCity})...`
                              : `+ Add add-on for Day ${dayNum}...`}
                          </option>
                          {matchingMasterAddons.length > 0 && (
                            <optgroup label={`Add-ons for ${currCity}`}>
                              {matchingMasterAddons.map((a: any) => (
                                <option key={a.id} value={a.name}>
                                  {a.name} (₹{a.defaultPrice}) {a.visaType ? `• ${a.visaType}` : ""}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="All Master Add-ons">
                            {masterData.addOns.map((a: any) => (
                              <option key={a.id} value={a.name}>
                                {a.name} (₹{a.defaultPrice})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
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

        const handleAddMasterRestaurantToDay = (dayNum: number, currCity: string, restName: string) => {
          if (!restName) return;
          const rest = masterData.restaurants.find((r) => r.name === restName);
          if (!rest) return;

          const newItem = {
            dayNumber: dayNum,
            location: rest.city?.name || currCity,
            cuisineType: rest.cuisineType,
            name: rest.name,
            rating: rest.starRating || 4.5,
            reviewCount: rest.reviewsCount || 100,
            isVeg: rest.offersPureVegJain,
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
            restaurantSuggestions: prev.restaurantSuggestions.filter((_: any, i: number) => i !== index),
          }));
        };

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#14213D] font-fraunces flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-[#B8944F]" />
                  <span>Step 7: Restaurant & Club Suggestions</span>
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Day-wise curated dining recommendations, Indian cuisines, beach clubs, and cafes.
                </p>
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

                  // Matching master restaurants for this day's city
                  const matchingMasterRestaurants = masterData.restaurants.filter((r: any) => {
                    const cityMatch =
                      r.city?.name?.toLowerCase() === currCity.toLowerCase() ||
                      r.cityId === masterData.cities.find((c: any) => c.name.toLowerCase() === currCity.toLowerCase())?.id;
                    const isUniversal = !r.cityId && !r.city;
                    return cityMatch || isUniversal;
                  });

                  // Dining suggestions selected for this day
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
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {dayRestaurants.length} {dayRestaurants.length === 1 ? "Dining Spot" : "Dining Spots"}
                        </span>
                      </div>

                      {/* Selected Dining Suggestions List */}
                      {dayRestaurants.length > 0 && (
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
                                  📍 {r.location} • Cuisine: <strong>{r.cuisineType}</strong> • ⭐ {r.rating || 4.5}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveDayRestaurant(r.originalIndex)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Remove dining suggestion"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Restaurant Selector */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddMasterRestaurantToDay(dayNum, currCity, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-[#14213D] outline-none cursor-pointer"
                        >
                          <option value="">
                            {matchingMasterRestaurants.length > 0
                              ? `+ Add Dining spot for Day ${dayNum} (${matchingMasterRestaurants.length} available in ${currCity})...`
                              : `+ Add Dining spot for Day ${dayNum}...`}
                          </option>
                          {matchingMasterRestaurants.length > 0 && (
                            <optgroup label={`Dining Spots in ${currCity}`}>
                              {matchingMasterRestaurants.map((r: any) => (
                                <option key={r.id} value={r.name}>
                                  {r.name} ({r.cuisineType}) • ⭐ {r.starRating || 4.5} {r.offersPureVegJain ? "• [Veg/Jain]" : ""}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="All Master Dining Spots">
                            {masterData.restaurants.map((r: any) => (
                              <option key={r.id} value={r.name}>
                                {r.name} ({r.cuisineType}) {r.city ? `- ${r.city.name}` : ""}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      }

      case 8:
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
                    Step 8: Master Policies & Guidelines
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                    Global Policy Active
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  The system automatically applies your single global Policy configuration to this itinerary. You can customize details below if needed.
                </p>
              </div>

              {/* Sync / Reset with Global Policy */}
              {masterData.globalPolicy && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Reset this itinerary's policies to match the latest Master Global Policy?")) {
                      setFormData((prev: any) => ({
                        ...prev,
                        tripTerms: {
                          paymentPolicy: masterData.globalPolicy.paymentPolicy || "",
                          cancellationPolicy: masterData.globalPolicy.cancellationPolicy || "",
                          visaRules: masterData.globalPolicy.visaRules || "",
                          generalNotes: masterData.globalPolicy.generalNotes || "",
                        },
                      }));
                    }
                  }}
                  className="px-3 py-1.5 bg-[#B8944F]/10 hover:bg-[#B8944F]/20 text-[#8F6F33] border border-[#B8944F]/30 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Sync with Master Policy</span>
                </button>
              )}
            </div>

            <div className="space-y-5">
              <div className="bg-white border border-[#B8944F]/20 rounded-xl p-5 craft-card shadow-2xs">
                <label className="block text-xs font-bold text-[#14213D] uppercase tracking-wider mb-2">
                  1. Payment Policy
                </label>
                <RichTextEditor
                  value={formData.tripTerms.paymentPolicy || ""}
                  onChange={(val) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      tripTerms: { ...prev.tripTerms, paymentPolicy: val },
                    }));
                  }}
                  placeholder="Specify standard booking deposit percentages, stage payment schedules, and final payment deadlines."
                />
              </div>

              <div className="bg-white border border-[#B8944F]/20 rounded-xl p-5 craft-card shadow-2xs">
                <label className="block text-xs font-bold text-[#14213D] uppercase tracking-wider mb-2">
                  2. Cancellation Policy
                </label>
                <RichTextEditor
                  value={formData.tripTerms.cancellationPolicy || ""}
                  onChange={(val) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      tripTerms: { ...prev.tripTerms, cancellationPolicy: val },
                    }));
                  }}
                  placeholder="Detail cancellation penalty percentages based on day thresholds prior to departure date."
                />
              </div>

              <div className="bg-white border border-[#B8944F]/20 rounded-xl p-5 craft-card shadow-2xs">
                <label className="block text-xs font-bold text-[#14213D] uppercase tracking-wider mb-2">
                  3. Visa Rules & Passport Validity
                </label>
                <RichTextEditor
                  value={formData.tripTerms.visaRules || ""}
                  onChange={(val) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      tripTerms: { ...prev.tripTerms, visaRules: val },
                    }));
                  }}
                  placeholder="Specify passport validity minimum duration, visa fees on arrival, or online e-visa steps."
                />
              </div>

              <div className="bg-white border border-[#B8944F]/20 rounded-xl p-5 craft-card shadow-2xs">
                <label className="block text-xs font-bold text-[#14213D] uppercase tracking-wider mb-2">
                  4. General Notes & Operational Advisory
                </label>
                <RichTextEditor
                  value={formData.tripTerms.generalNotes || ""}
                  onChange={(val) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      tripTerms: { ...prev.tripTerms, generalNotes: val },
                    }));
                  }}
                  placeholder="Specify standard hotel check-in/out hours, driver service rules, extreme weather clauses, and baggage notes."
                />
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#14213D] font-fraunces">
              Step 9: Price Quotes & Financials
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
                  buttonClasses = "bg-[#B8944F]/15 text-[#B8944F] font-bold border-l-3 border-[#B8944F] cursor-pointer";
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
