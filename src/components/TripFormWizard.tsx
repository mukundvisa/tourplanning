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
  Table2,
  CalendarDays,
  Hotel,
  Info,
  Copy,
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
  });
  const [savingQuickAdd, setSavingQuickAdd] = useState(false);

  const startQuickAdd = (
    category: "Inter-City Transfer" | "Local Transfer",
    fromCity = "",
    toCity = "",
    city = ""
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

      if (quickAddForm.saveToMasterData) {
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
          setMasterData((prev) => ({
            ...prev,
            flightRoutes: [res.data, ...prev.flightRoutes],
          }));
        }
      }

      // Add to Trip formData
      const newLeg = {
        sector: sectorName,
        fromCity: fromC,
        toCity: toC,
        transportCategory: quickAddForm.transportCategory,
        airline: quickAddForm.airline,
        type: quickAddForm.type,
        travelTime: quickAddForm.travelTime,
        departureDateTime: "",
        arrivalDateTime: "",
        durationText: "Direct",
        stops: 0,
        layoverInfo: "",
        carryOnBaggageKg: 7,
        checkInBaggageKg: 20,
        cancellationPolicy: "",
        flightNotes: quickAddForm.flightNotes,
        flightCodeDefault: quickAddForm.flightCodeDefault,
        isStartingTransfer: false,
        isPackageIncluded: true,
        isAutoSuggested: false,
      };

      setFormData((prev: any) => ({
        ...prev,
        flightDetails: [...prev.flightDetails, newLeg],
      }));
      setQuickAddModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error adding transport option.");
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
        const TRANSPORT_TYPES = ["Flight", "Train", "Bus", "Car", "Sedan", "SUV", "Helicopter", "Boat", "Auto-rickshaw", "Other"];
        const getTransportIcon = (type: string) => {
          switch (type) {
            case "Flight":
              return <Plane className="h-4 w-4 text-[#B8944F] shrink-0" />;
            case "Train":
              return <Train className="h-4 w-4 text-[#B8944F] shrink-0" />;
            case "Bus":
              return <Bus className="h-4 w-4 text-[#B8944F] shrink-0" />;
            case "Car":
            case "Sedan":
            case "SUV":
              return <Car className="h-4 w-4 text-[#B8944F] shrink-0" />;
            default:
              return <Car className="h-4 w-4 text-[#B8944F] shrink-0" />;
          }
        };

        // 1. Detect Inter-City Route Transitions from consecutive days in Tab 2
        const interCityTransitions: {
          fromCity: string;
          toCity: string;
          fromDay: number;
          toDay: number;
          matchingMasterRoutes: any[];
        }[] = [];

        for (let i = 0; i < (formData.itineraryDays || []).length - 1; i++) {
          const d1 = formData.itineraryDays[i];
          const d2 = formData.itineraryDays[i + 1];
          const c1 = d1.cityOrStay?.trim();
          const c2 = d2.cityOrStay?.trim();
          if (c1 && c2 && c1.toLowerCase() !== c2.toLowerCase()) {
            const matched = masterData.flightRoutes.filter(
              (r) =>
                r.transportCategory === "Inter-City Transfer" &&
                ((r.fromCity?.toLowerCase() === c1.toLowerCase() && r.toCity?.toLowerCase() === c2.toLowerCase()) ||
                 (r.fromCity?.toLowerCase() === c2.toLowerCase() && r.toCity?.toLowerCase() === c1.toLowerCase()) ||
                 (r.sector?.toLowerCase().includes(c1.toLowerCase()) && r.sector?.toLowerCase().includes(c2.toLowerCase())))
            );
            interCityTransitions.push({
              fromCity: c1,
              toCity: c2,
              fromDay: d1.dayNumber,
              toDay: d2.dayNumber,
              matchingMasterRoutes: matched,
            });
          }
        }

        // 2. Detect Distinct Cities for Local Transfers
        const distinctCityStays = Array.from(
          new Set(
            (formData.itineraryDays || [])
              .map((d: any) => d.cityOrStay?.trim())
              .filter(Boolean)
          )
        ).map((cityName) => {
          const matched = masterData.flightRoutes.filter(
            (r) =>
              r.transportCategory === "Local Transfer" &&
              (r.city?.name?.toLowerCase() === (cityName as string).toLowerCase() ||
               r.fromCity?.toLowerCase() === (cityName as string).toLowerCase() ||
               r.sector?.toLowerCase().includes((cityName as string).toLowerCase()))
          );
          return {
            city: cityName as string,
            matchingMasterRoutes: matched,
          };
        });

        // 3. Separate Current Flight Details by Category
        const interCityList = (formData.flightDetails || []).map((f: any, idx: number) => ({ ...f, originalIndex: idx })).filter(
          (f: any) => (f.transportCategory || "Inter-City Transfer") === "Inter-City Transfer"
        );
        const localList = (formData.flightDetails || []).map((f: any, idx: number) => ({ ...f, originalIndex: idx })).filter(
          (f: any) => f.transportCategory === "Local Transfer"
        );

        // 4. Auto-populate from Master Data
        const handleAutoPopulate = () => {
          const current = [...formData.flightDetails];
          let added = 0;

          // Add inter-city transfers
          interCityTransitions.forEach((t) => {
            const exists = current.some(
              (f: any) =>
                (f.transportCategory || "Inter-City Transfer") === "Inter-City Transfer" &&
                ((f.fromCity?.toLowerCase() === t.fromCity.toLowerCase() && f.toCity?.toLowerCase() === t.toCity.toLowerCase()) ||
                 (f.sector?.toLowerCase().includes(t.fromCity.toLowerCase()) && f.sector?.toLowerCase().includes(t.toCity.toLowerCase())))
            );
            if (!exists && t.matchingMasterRoutes.length > 0) {
              const best = t.matchingMasterRoutes[0];
              current.push({
                sector: best.sector || `${t.fromCity} to ${t.toCity}`,
                fromCity: t.fromCity,
                toCity: t.toCity,
                transportCategory: "Inter-City Transfer",
                airline: best.airline,
                type: best.type || "Car",
                travelTime: best.travelTime || "09:00 AM",
                departureDateTime: "",
                arrivalDateTime: "",
                durationText: "Direct",
                stops: best.typicalStops || 0,
                layoverInfo: best.typicalLayoverInfo || "",
                carryOnBaggageKg: best.cabinBaggageKg ?? 7,
                checkInBaggageKg: best.checkInBaggageKg ?? 20,
                cancellationPolicy: best.cancellationPolicy || "",
                flightNotes: best.flightNotes || "",
                flightCodeDefault: best.flightCodeDefault || "",
                isStartingTransfer: false,
                isPackageIncluded: true,
                isAutoSuggested: true,
              });
              added++;
            }
          });

          // Add local transfers
          distinctCityStays.forEach((s) => {
            const exists = current.some(
              (f: any) =>
                f.transportCategory === "Local Transfer" &&
                (f.fromCity?.toLowerCase() === s.city.toLowerCase() ||
                 f.toCity?.toLowerCase() === s.city.toLowerCase() ||
                 f.sector?.toLowerCase().includes(s.city.toLowerCase()))
            );
            if (!exists && s.matchingMasterRoutes.length > 0) {
              s.matchingMasterRoutes.forEach((r) => {
                current.push({
                  sector: r.sector || `${s.city} Local Transfer`,
                  fromCity: s.city,
                  toCity: s.city,
                  transportCategory: "Local Transfer",
                  airline: r.airline,
                  type: r.type || "Car",
                  travelTime: r.travelTime || "Flexible",
                  departureDateTime: "",
                  arrivalDateTime: "",
                  durationText: "Direct",
                  stops: 0,
                  layoverInfo: "",
                  carryOnBaggageKg: r.cabinBaggageKg ?? 7,
                  checkInBaggageKg: r.checkInBaggageKg ?? 20,
                  cancellationPolicy: r.cancellationPolicy || "",
                  flightNotes: r.flightNotes || "",
                  flightCodeDefault: r.flightCodeDefault || "",
                  isStartingTransfer: false,
                  isPackageIncluded: true,
                  isAutoSuggested: true,
                });
                added++;
              });
            }
          });

          if (added > 0) {
            setFormData((prev: any) => ({ ...prev, flightDetails: current }));
          } else {
            alert("All detected inter-city and local routes from Master Data are already active in your plan!");
          }
        };

        return (
          <div className="space-y-6">
            {/* Header with Auto-Suggest Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#14213D] font-fraunces flex items-center gap-2">
                  <Plane className="h-5 w-5 text-[#B8944F]" />
                  <span>Step 5: Transportation & Transit Arrangements</span>
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Categorized into Own Arrangement, Inter-City Transfers, and City-level Local Transfers with live Master Data suggestions.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAutoPopulate}
                  className="px-3.5 py-1.5 bg-[#B8944F]/15 hover:bg-[#B8944F]/25 text-[#8F6F33] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border border-[#B8944F]/30"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Auto-Populate Transfers</span>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION A: TRAVELLER'S OWN ARRANGEMENT */}
            {/* ========================================================================= */}
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
                <span className="text-[11px] text-zinc-400 font-medium">Sourced from Step 1</span>
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

            {/* ========================================================================= */}
            {/* SECTION B: INTER-CITY TRANSFERS */}
            {/* ========================================================================= */}
            <div className="bg-white border border-[#B8944F]/30 rounded-xl p-5 craft-card shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="h-5 w-5 rounded-full bg-[#B8944F] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    B
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                      Inter-City Transfers (Consecutive Day Transitions)
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Auto-detected between consecutive days when stay city changes in Day Planning.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startQuickAdd("Inter-City Transfer")}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#14213D] hover:bg-[#2B2E36] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Inter-City Leg</span>
                </button>
              </div>

              {/* Detected Transitions Prompts / Missing Master Data alerts */}
              {interCityTransitions.length > 0 && (
                <div className="space-y-2 bg-[#FAF8F5] p-3.5 rounded-lg border border-[#B8944F]/20">
                  <span className="text-[11px] font-bold text-[#8F6F33] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Detected Route Transitions from Day-wise Plan:</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {interCityTransitions.map((t, tIdx) => {
                      const isAlreadyInTrip = (formData.flightDetails || []).some(
                        (f: any) =>
                          (f.transportCategory || "Inter-City Transfer") === "Inter-City Transfer" &&
                          ((f.fromCity?.toLowerCase() === t.fromCity.toLowerCase() && f.toCity?.toLowerCase() === t.toCity.toLowerCase()) ||
                           (f.sector?.toLowerCase().includes(t.fromCity.toLowerCase()) && f.sector?.toLowerCase().includes(t.toCity.toLowerCase())))
                      );

                      if (isAlreadyInTrip) {
                        return (
                          <div
                            key={tIdx}
                            className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-md text-xs"
                          >
                            <span className="font-semibold text-emerald-900">
                              ✓ Day {t.fromDay}&rarr;{t.toDay}: {t.fromCity} &rarr; {t.toCity}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                              Active in Plan
                            </span>
                          </div>
                        );
                      }

                      if (t.matchingMasterRoutes.length > 0) {
                        const mr = t.matchingMasterRoutes[0];
                        return (
                          <div
                            key={tIdx}
                            className="flex items-center justify-between p-2.5 bg-amber-50/70 border border-amber-200 rounded-md text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-[#14213D] block truncate">
                                ⚡ Day {t.fromDay}&rarr;{t.toDay}: {t.fromCity} &rarr; {t.toCity}
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                Master option: {mr.airline} ({mr.type || "Car"}) • {mr.travelTime || "10:00 AM"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newLeg = {
                                  sector: mr.sector || `${t.fromCity} to ${t.toCity}`,
                                  fromCity: t.fromCity,
                                  toCity: t.toCity,
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
                                setFormData((prev: any) => ({
                                  ...prev,
                                  flightDetails: [...prev.flightDetails, newLeg],
                                }));
                              }}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold shrink-0 cursor-pointer shadow-2xs"
                            >
                              + Add Route
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={tIdx}
                          className="flex items-center justify-between p-2.5 bg-red-50/60 border border-red-200 rounded-md text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-red-950 block truncate">
                              ⚠️ No transport found for {t.fromCity} &rarr; {t.toCity}
                            </span>
                            <span className="text-[10px] text-red-700">
                              Missing in master data catalog.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => startQuickAdd("Inter-City Transfer", t.fromCity, t.toCity)}
                            className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-[11px] font-bold shrink-0 cursor-pointer shadow-2xs"
                          >
                            + Add Option
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Inter-City Items List */}
              <div className="space-y-3">
                {interCityList.length === 0 ? (
                  <div className="py-8 text-center text-zinc-400 text-xs bg-zinc-50/60 border border-dashed rounded-lg">
                    No inter-city transfers configured. Use auto-suggest above or click &quot;+ Add Inter-City Leg&quot;.
                  </div>
                ) : (
                  interCityList.map((f: any) => (
                    <div
                      key={f.originalIndex}
                      className="p-4 bg-white border border-zinc-200/90 hover:border-[#B8944F]/50 rounded-lg shadow-2xs transition-all space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-[#B8944F]/10 flex items-center justify-center shrink-0">
                            {getTransportIcon(f.type || "Car")}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-[#14213D] text-sm truncate">
                                {f.sector || `${f.fromCity || "Origin"} to ${f.toCity || "Destination"}`}
                              </h4>
                              {f.isAutoSuggested ? (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                                  ✨ Auto-suggested from master data
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                                  Custom Entry
                                </span>
                              )}
                            </div>
                            <p className="text-zinc-500 text-xs font-semibold mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>Carrier: <strong>{f.airline}</strong></span>
                              <span>•</span>
                              <span>Mode: <strong>{f.type || "Car"}</strong></span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-[#B8944F]" />
                                Preferred Time: <strong>{f.travelTime || "10:00 AM"}</strong>
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center space-x-2 shrink-0">
                          {/* Swap Selector with other matching master routes */}
                          {masterData.flightRoutes.filter((r) => r.transportCategory === "Inter-City Transfer").length > 0 && (
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleSwapFlightWithMaster(f.originalIndex, e.target.value);
                                }
                              }}
                              className="text-[11px] font-semibold text-[#8F6F33] bg-amber-50/60 border border-amber-200 rounded px-2 py-1 outline-none cursor-pointer"
                              title="Swap with another Master Data route"
                            >
                              <option value="">⇄ Swap option...</option>
                              {masterData.flightRoutes
                                .filter((r) => r.transportCategory === "Inter-City Transfer")
                                .map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.sector} &bull; {r.airline} ({r.type || "Car"})
                                  </option>
                                ))}
                            </select>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditFlight(f.originalIndex)}
                            className="p-1.5 text-zinc-500 hover:text-[#B8944F] rounded-md hover:bg-zinc-50 transition-colors cursor-pointer"
                            title="Edit Leg"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFlight(f.originalIndex)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove Leg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {f.flightNotes && (
                        <p className="text-[11px] text-zinc-500 bg-zinc-50 p-2 rounded border border-zinc-100 italic">
                          📝 {f.flightNotes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION C: LOCAL TRANSFERS */}
            {/* ========================================================================= */}
            <div className="bg-white border border-[#6B7A5E]/40 rounded-xl p-5 craft-card shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="h-5 w-5 rounded-full bg-[#6B7A5E] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    C
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                      Local Transfers (City Stay, Station &amp; Hotel Logistics)
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Scoped per city stay (e.g. arrival transfer, station-to-hotel car, local day cab).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startQuickAdd("Local Transfer")}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#6B7A5E] hover:bg-[#58654D] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Local Transfer</span>
                </button>
              </div>

              {/* City Stay Suggestions */}
              {distinctCityStays.length > 0 && (
                <div className="space-y-2 bg-[#FAF8F5] p-3.5 rounded-lg border border-[#6B7A5E]/30">
                  <span className="text-[11px] font-bold text-[#58654D] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>City Stays in Day Plan:</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {distinctCityStays.map((s, sIdx) => {
                      const isAlreadyInTrip = (formData.flightDetails || []).some(
                        (f: any) =>
                          f.transportCategory === "Local Transfer" &&
                          (f.fromCity?.toLowerCase() === s.city.toLowerCase() ||
                           f.toCity?.toLowerCase() === s.city.toLowerCase() ||
                           f.sector?.toLowerCase().includes(s.city.toLowerCase()))
                      );

                      if (isAlreadyInTrip) {
                        return (
                          <div
                            key={sIdx}
                            className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-md text-xs"
                          >
                            <span className="font-semibold text-emerald-900">
                              ✓ {s.city} Local Transport
                            </span>
                            <span className="text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                              Active in Plan
                            </span>
                          </div>
                        );
                      }

                      if (s.matchingMasterRoutes.length > 0) {
                        const mr = s.matchingMasterRoutes[0];
                        return (
                          <div
                            key={sIdx}
                            className="flex items-center justify-between p-2.5 bg-emerald-50/40 border border-emerald-200 rounded-md text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-[#14213D] block truncate">
                                📍 {s.city} Local Transit
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                {mr.sector} • {mr.airline} ({mr.type || "Car"})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newLeg = {
                                  sector: mr.sector || `${s.city} Local Transfer`,
                                  fromCity: s.city,
                                  toCity: s.city,
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
                                };
                                setFormData((prev: any) => ({
                                  ...prev,
                                  flightDetails: [...prev.flightDetails, newLeg],
                                }));
                              }}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold shrink-0 cursor-pointer shadow-2xs"
                            >
                              + Add Local
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={sIdx}
                          className="flex items-center justify-between p-2.5 bg-red-50/60 border border-red-200 rounded-md text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-red-950 block truncate">
                              ⚠️ No local transport found for {s.city}
                            </span>
                            <span className="text-[10px] text-red-700">
                              Add standard local transfer option.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => startQuickAdd("Local Transfer", s.city, s.city, s.city)}
                            className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-[11px] font-bold shrink-0 cursor-pointer shadow-2xs"
                          >
                            + Add Option
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Local Items List */}
              <div className="space-y-3">
                {localList.length === 0 ? (
                  <div className="py-8 text-center text-zinc-400 text-xs bg-zinc-50/60 border border-dashed rounded-lg">
                    No local transfers configured. Use suggestions above or click &quot;+ Add Local Transfer&quot;.
                  </div>
                ) : (
                  localList.map((f: any) => (
                    <div
                      key={f.originalIndex}
                      className="p-4 bg-white border border-zinc-200/90 hover:border-[#6B7A5E]/60 rounded-lg shadow-2xs transition-all space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-[#6B7A5E]/10 flex items-center justify-center shrink-0">
                            {getTransportIcon(f.type || "Car")}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-[#14213D] text-sm truncate">
                                {f.sector || `${f.fromCity || "City"} Local Transfer`}
                              </h4>
                              {f.isAutoSuggested ? (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                                  ✨ Auto-suggested from master data
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                                  Custom Entry
                                </span>
                              )}
                            </div>
                            <p className="text-zinc-500 text-xs font-semibold mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>Provider: <strong>{f.airline}</strong></span>
                              <span>•</span>
                              <span>Mode: <strong>{f.type || "Car"}</strong></span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-[#6B7A5E]" />
                                Preferred Time: <strong>{f.travelTime || "Flexible"}</strong>
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center space-x-2 shrink-0">
                          {/* Swap Selector */}
                          {masterData.flightRoutes.filter((r) => r.transportCategory === "Local Transfer").length > 0 && (
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleSwapFlightWithMaster(f.originalIndex, e.target.value);
                                }
                              }}
                              className="text-[11px] font-semibold text-[#58654D] bg-emerald-50/60 border border-emerald-200 rounded px-2 py-1 outline-none cursor-pointer"
                              title="Swap with another Local Master route"
                            >
                              <option value="">⇄ Swap option...</option>
                              {masterData.flightRoutes
                                .filter((r) => r.transportCategory === "Local Transfer")
                                .map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.sector} &bull; {r.airline} ({r.type || "Car"})
                                  </option>
                                ))}
                            </select>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditFlight(f.originalIndex)}
                            className="p-1.5 text-zinc-500 hover:text-[#6B7A5E] rounded-md hover:bg-zinc-50 transition-colors cursor-pointer"
                            title="Edit Leg"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFlight(f.originalIndex)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove Leg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {f.flightNotes && (
                        <p className="text-[11px] text-zinc-500 bg-zinc-50 p-2 rounded border border-zinc-100 italic">
                          📝 {f.flightNotes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* EDIT MODAL / DRAWER FOR SINGLE FLIGHT DETAIL */}
            {/* ========================================================================= */}
            {editingFlightIndex !== null && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
                    <h3 className="text-sm font-bold text-[#14213D] flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-[#B8944F]" />
                      <span>Edit Transportation Leg</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingFlightIndex(null)}
                      className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Transport Category
                      </label>
                      <select
                        value={newFlight.transportCategory}
                        onChange={(e) =>
                          setNewFlight({
                            ...newFlight,
                            transportCategory: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] outline-none"
                      >
                        <option value="Inter-City Transfer">Inter-City Transfer (Between Cities)</option>
                        <option value="Local Transfer">Local Transfer (Station/Hotel/Sightseeing)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Vehicle / Transit Type
                        </label>
                        <select
                          value={newFlight.type}
                          onChange={(e) => setNewFlight({ ...newFlight, type: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                        >
                          {TRANSPORT_TYPES.map((t) => (
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
                          value={newFlight.travelTime}
                          onChange={(e) => setNewFlight({ ...newFlight, travelTime: e.target.value })}
                          placeholder="e.g. 10:00 AM or Morning slot"
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Sector / Route Name *
                      </label>
                      <input
                        type="text"
                        value={newFlight.sector}
                        onChange={(e) => setNewFlight({ ...newFlight, sector: e.target.value })}
                        placeholder="e.g. Ahmedabad to Udaipur or Udaipur Station Pickup"
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Carrier / Provider Name *
                      </label>
                      <input
                        type="text"
                        value={newFlight.airline}
                        onChange={(e) => setNewFlight({ ...newFlight, airline: e.target.value })}
                        placeholder="e.g. Private AC Sedan or Indigo Airlines"
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Transit Notes / Guidelines
                      </label>
                      <textarea
                        rows={2}
                        value={newFlight.flightNotes}
                        onChange={(e) => setNewFlight({ ...newFlight, flightNotes: e.target.value })}
                        placeholder="e.g. Tolls and parking included. Luggage space for 2 large suitcases."
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => setEditingFlightIndex(null)}
                        className="px-4 py-2 border border-zinc-200 text-zinc-600 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={addFlight}
                        className="px-4 py-2 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Update Arrangement
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* QUICK ADD MODAL (WITH OPTION TO SAVE TO MASTER DATA) */}
            {/* ========================================================================= */}
            {quickAddModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
                    <h3 className="text-sm font-bold text-[#14213D] flex items-center gap-2">
                      <Plus className="h-4 w-4 text-[#B8944F]" />
                      <span>Add {quickAddForm.transportCategory}</span>
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
                          City / Scope *
                        </label>
                        <input
                          type="text"
                          required
                          value={quickAddForm.city}
                          onChange={(e) => setQuickAddForm({ ...quickAddForm, city: e.target.value })}
                          placeholder="e.g. Udaipur or Bali"
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
                        placeholder="e.g. Private AC Sedan / Station Car"
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
                          {TRANSPORT_TYPES.map((t) => (
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
                          placeholder="e.g. 10:00 AM"
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Notes / Inclusions
                      </label>
                      <input
                        type="text"
                        value={quickAddForm.flightNotes}
                        onChange={(e) => setQuickAddForm({ ...quickAddForm, flightNotes: e.target.value })}
                        placeholder="e.g. Driver allowance and fuel included"
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs outline-none"
                      />
                    </div>

                    {/* Option to Save to Master Data Hub */}
                    <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={quickAddForm.saveToMasterData}
                          onChange={(e) =>
                            setQuickAddForm({
                              ...quickAddForm,
                              saveToMasterData: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-zinc-300 text-[#B8944F] focus:ring-[#B8944F] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[#14213D]">
                          ⚡ Save to Master Data Hub (Auto-suggest for future trips)
                        </span>
                      </label>
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
                        <span>Add to Trip</span>
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
        // Collect all active cities from the itinerary days & destination
        const tripCities: string[] = Array.from(
          new Set(
            (formData.itineraryDays || [])
              .map((d: any) => d.cityOrStay?.trim())
              .filter(Boolean)
          )
        );
        if (tripCities.length === 0 && formData.destination) {
          tripCities.push(formData.destination.trim());
        }

        // City-wise filtering for Add-ons & Visa
        const availableMasterAddOns = masterData.addOns.filter((addon: any) => {
          if (addOnCityFilter !== "All") {
            const matchedCity = masterData.cities.find(
              (c) => c.name.toLowerCase() === addOnCityFilter.toLowerCase()
            );
            if (matchedCity) {
              if (addon.cityId === matchedCity.id) return true;
              if (addon.cityIds && addon.cityIds.includes(matchedCity.id)) return true;
            }
            if (addon.city?.name?.toLowerCase() === addOnCityFilter.toLowerCase()) return true;
            return false;
          }

          if (tripCities.length > 0) {
            const matchesItineraryCity = tripCities.some((cityName) => {
              const matchedCity = masterData.cities.find(
                (c) => c.name.toLowerCase() === cityName.toLowerCase()
              );
              if (matchedCity) {
                if (addon.cityId === matchedCity.id) return true;
                if (addon.cityIds && addon.cityIds.includes(matchedCity.id)) return true;
              }
              if (addon.city?.name?.toLowerCase() === cityName.toLowerCase()) return true;
              return false;
            });
            const isUniversal = !addon.cityId && (!addon.cityIds || addon.cityIds.length === 0) && !addon.city;
            return matchesItineraryCity || isUniversal;
          }

          return true;
        });

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
                  Step 6: Optional Add-ons & Visa
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  City-connected visa packages, fast-track entry, insurance, and extra amenities.
                </p>
              </div>

              {/* Dynamic City-wise filter tags for Itinerary */}
              {tripCities.length > 0 && (
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
                    City Filter:
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddOnCityFilter("All")}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      addOnCityFilter === "All"
                        ? "bg-[#14213D] text-[#DDA74F] shadow-2xs"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    All Itinerary Cities ({tripCities.length})
                  </button>
                  {tripCities.map((cityName) => (
                    <button
                      type="button"
                      key={cityName}
                      onClick={() => setAddOnCityFilter(cityName)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                        addOnCityFilter === cityName
                          ? "bg-[#B8944F] text-white shadow-2xs"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      <MapPin className="h-2.5 w-2.5" />
                      <span>{cityName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add-on Entry Form with City-Filtered Master AddOn picker */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                    {editingAddOnIndex !== null ? "Edit Add-on Service" : "Add Service / Visa Package"}
                  </span>
                  {addOnCityFilter !== "All" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      📍 Filtered for {addOnCityFilter}
                    </span>
                  )}
                </div>

                {/* Master Add-on Picker with City-Aware Options */}
                {availableMasterAddOns.length > 0 ? (
                  <select
                    onChange={(e) => {
                      const addon = masterData.addOns.find((a) => a.name === e.target.value);
                      if (addon) {
                        setNewAddOn((prev) => ({
                          ...prev,
                          name: addon.name,
                          visaType: addon.visaType || "",
                          length: addon.validityLength || "",
                          validity: addon.validityWindow || "",
                          details: addon.detailsDescription || "",
                          price: addon.defaultPrice || 0,
                        }));
                      }
                    }}
                    value=""
                    className="text-[11px] font-semibold text-[#B8944F] bg-white border border-[#B8944F]/30 rounded px-2.5 py-1 outline-none cursor-pointer"
                  >
                    <option value="">⚡ Pre-fill from Master Add-ons ({availableMasterAddOns.length} available)...</option>
                    {availableMasterAddOns.map((a: any) => {
                      const cityName = a.city?.name ? ` [${a.city.name}]` : "";
                      return (
                        <option key={a.id} value={a.name}>
                          {a.name}{cityName} (₹{a.defaultPrice})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <span className="text-[11px] text-zinc-400 italic">
                    No master add-ons configured for this city.
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Add-on Name *
                  </label>
                  <input
                    type="text"
                    value={newAddOn.name}
                    onChange={(e) => setNewAddOn({ ...newAddOn, name: e.target.value })}
                    placeholder="e.g. Indonesia Official E-VOA (Electronic Visa on Arrival)"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Visa Type
                  </label>
                  <input
                    type="text"
                    value={newAddOn.visaType}
                    onChange={(e) => setNewAddOn({ ...newAddOn, visaType: e.target.value })}
                    placeholder="e.g. Tourist E-VOA 30 Days"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Validity Length / Window
                  </label>
                  <input
                    type="text"
                    value={newAddOn.validity}
                    onChange={(e) => setNewAddOn({ ...newAddOn, validity: e.target.value })}
                    placeholder="e.g. 90 Days from issue"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={newAddOn.price}
                    onChange={(e) =>
                      setNewAddOn({ ...newAddOn, price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-mono font-bold text-[#14213D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Price Structure
                  </label>
                  <select
                    value={newAddOn.priceType}
                    onChange={(e) => setNewAddOn({ ...newAddOn, priceType: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  >
                    <option value="per person">per person</option>
                    <option value="per group">per group</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Details Description
                  </label>
                  <input
                    type="text"
                    value={newAddOn.details}
                    onChange={(e) => setNewAddOn({ ...newAddOn, details: e.target.value })}
                    placeholder="e.g. Clears immigration queues via dedicated e-gate barcode scanners."
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                {editingAddOnIndex !== null && (
                  <button
                    type="button"
                    onClick={() => setEditingAddOnIndex(null)}
                    className="px-3.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={addAddOn}
                  className="px-4 py-2 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {editingAddOnIndex !== null ? "Update Add-on" : "+ Add Service"}
                </button>
              </div>
            </div>

            {/* Addons List */}
            <div className="space-y-3">
              {formData.addOns.map((a: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-white border border-[#B8944F]/20 rounded-lg craft-card text-xs"
                >
                  <div>
                    <h4 className="font-bold text-[#14213D] text-sm">{a.name}</h4>
                    <p className="text-zinc-500 mt-0.5">
                      ₹{a.price?.toLocaleString("en-IN")} {a.priceType}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => startEditAddOn(idx)}
                      className="p-1.5 text-zinc-500 hover:text-[#B8944F] cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAddOn(idx)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 7:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#14213D] font-fraunces">
              Step 7: Restaurant & Club Suggestions
            </h2>

            {/* Restaurant Form with Master Restaurant Selector */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                  {editingRestIndex !== null ? "Edit Dining Recommendation" : "Add Dining Recommendation"}
                </span>

                {/* Master Restaurant Picker (filtered by destination city if matched) */}
                {masterData.restaurants.length > 0 && (
                  <select
                    onChange={(e) => {
                      const rest = masterData.restaurants.find((r) => r.name === e.target.value);
                      if (rest) {
                        setNewRest((prev) => ({
                          ...prev,
                          name: rest.name,
                          location: rest.city ? `${rest.city.name}` : prev.location,
                          cuisineType: rest.cuisineType,
                          category: rest.categoryType || "Restaurant",
                          rating: rest.starRating || 4.5,
                          reviewCount: rest.reviewsCount || 150,
                          isVeg: rest.offersPureVegJain,
                        }));
                      }
                    }}
                    value=""
                    className="text-[11px] font-semibold text-[#B8944F] bg-white border border-[#B8944F]/30 rounded px-2.5 py-1 outline-none cursor-pointer"
                  >
                    <option value="">⚡ Select from Curated Dining Library...</option>
                    {masterData.restaurants.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name} ({r.cuisineType}) {r.city ? `- ${r.city.name}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Location Area *
                  </label>
                  <input
                    type="text"
                    value={newRest.location}
                    onChange={(e) => setNewRest({ ...newRest, location: e.target.value })}
                    placeholder="e.g. Seminyak, Ubud, Downtown Dubai"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Restaurant Name *
                  </label>
                  <input
                    type="text"
                    value={newRest.name}
                    onChange={(e) => setNewRest({ ...newRest, name: e.target.value })}
                    placeholder="e.g. Queen's Tandoor Seminyak"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Cuisine Type
                  </label>
                  <input
                    type="text"
                    value={newRest.cuisineType}
                    onChange={(e) => setNewRest({ ...newRest, cuisineType: e.target.value })}
                    placeholder="e.g. North & South Indian, Italian"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Category Type
                  </label>
                  <select
                    value={newRest.category}
                    onChange={(e) => setNewRest({ ...newRest, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  >
                    <option value="Restaurant">Restaurant</option>
                    <option value="Beach Club">Beach Club</option>
                    <option value="Night Club">Night Club</option>
                    <option value="Cafe">Cafe</option>
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="veg-jain-flag"
                    checked={newRest.isVeg}
                    onChange={(e) => setNewRest({ ...newRest, isVeg: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-[#B8944F] focus:ring-[#B8944F]"
                  />
                  <label htmlFor="veg-jain-flag" className="text-xs font-semibold text-zinc-700 cursor-pointer">
                    Offers Dedicated Pure Veg / Jain Food Options
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                {editingRestIndex !== null && (
                  <button
                    type="button"
                    onClick={() => setEditingRestIndex(null)}
                    className="px-3.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={addRest}
                  className="px-4 py-2 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {editingRestIndex !== null ? "Update Suggestion" : "+ Add Suggestion"}
                </button>
              </div>
            </div>

            {/* Suggestions list */}
            <div className="space-y-3">
              {formData.restaurantSuggestions.map((r: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-white border border-[#B8944F]/20 rounded-lg craft-card text-xs"
                >
                  <div>
                    <h4 className="font-bold text-[#14213D] text-sm">{r.name}</h4>
                    <p className="text-zinc-500 mt-0.5">
                      📍 {r.location} &bull; {r.category} ({r.cuisineType})
                    </p>
                    {r.isVeg && (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        Pure Veg / Jain Available
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => startEditRest(idx)}
                      className="p-1.5 text-zinc-500 hover:text-[#B8944F] cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRest(idx)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

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
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
              </form>
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
