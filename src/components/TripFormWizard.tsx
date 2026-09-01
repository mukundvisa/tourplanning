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
} from "lucide-react";
import { createTrip, updateTrip } from "@/actions/trips";
import { getAllMasterDataForSelectors } from "@/actions/master-data";
import { RichTextEditor } from "./RichTextEditor";
import { downloadTripPdf } from "@/lib/download-pdf";

interface TripFormWizardProps {
  initialData?: any;
  tripId?: string;
}

const STEPS = [
  { number: 1, name: "Core Trip & Consultant", icon: MapPin },
  { number: 2, name: "Day-by-Day Itinerary", icon: Calendar },
  { number: 3, name: "Stays & Accommodations", icon: Coffee },
  { number: 4, name: "Flight Details", icon: Plane },
  { number: 5, name: "Optional Add-ons & Visa", icon: PlusCircle },
  { number: 6, name: "Restaurant & Club Suggestions", icon: Utensils },
  { number: 7, name: "Master Policies & Guidelines", icon: FileText },
  { number: 8, name: "Price Quotes & Financials", icon: DollarSign },
];

export function TripFormWizard({ initialData, tripId }: TripFormWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Master Data Cache
  const [masterData, setMasterData] = useState<{
    cities: any[];
    consultants: any[];
    taxSetting: any;
    pricingLabels: any[];
    activities: any[];
    hotels: any[];
    flightRoutes: any[];
    addOns: any[];
    restaurants: any[];
    policyTemplates: any[];
    bannerImages: any[];
  }>({
    cities: [],
    consultants: [],
    taxSetting: { currentTcsPercentage: 5.0 },
    pricingLabels: [],
    activities: [],
    hotels: [],
    flightRoutes: [],
    addOns: [],
    restaurants: [],
    policyTemplates: [],
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
      }
    }
    loadMasterData();
  }, [initialData]);

  // Form State
  const [formData, setFormData] = useState<any>(() => {
    if (initialData) {
      const data = { ...initialData };
      if (data.startDate) data.startDate = new Date(data.startDate).toISOString().split("T")[0];
      if (data.endDate) data.endDate = new Date(data.endDate).toISOString().split("T")[0];
      
      data.accommodations = (data.accommodations || []).map((acc: any) => ({
        ...acc,
        checkInDate: acc.checkInDate ? new Date(acc.checkInDate).toISOString().split("T")[0] : "",
        checkOutDate: acc.checkOutDate ? new Date(acc.checkOutDate).toISOString().split("T")[0] : "",
      }));

      data.flightDetails = (data.flightDetails || []).map((f: any) => ({
        ...f,
        departureDateTime: f.departureDateTime ? new Date(f.departureDateTime).toISOString().slice(0, 16) : "",
        arrivalDateTime: f.arrivalDateTime ? new Date(f.arrivalDateTime).toISOString().slice(0, 16) : "",
        type: f.type || "Flight",
        travelTime: f.travelTime || "",
        isStartingTransfer: f.isStartingTransfer || false,
        isPackageIncluded: f.isPackageIncluded || false,
      }));

      if (!data.pricingTitle) data.pricingTitle = "";
      if (!data.transportationArrangement) data.transportationArrangement = "Planner";
      if (!data.startingTransferDetails) data.startingTransferDetails = "";
      if (!data.packageTransportationDetails) data.packageTransportationDetails = "";
      return data;
    }

    return {
      title: "",
      pricingTitle: "",
      destination: "",
      departureCity: "",
      startDate: "",
      endDate: "",
      durationDays: 1,
      durationNights: 0,
      numTravellers: 2,
      consultantName: "",
      consultantPhone: "",
      coverImage: null,
      priceQuoteItems: [] as any[],
      tripFinancials: {
        tcsPercentage: 5,
        tcsAmount: 0,
        totalWithTcs: 0,
        notes: "*Govt TCS is fully refundable and adjustable against annual income tax returns.",
      },
      itineraryDays: [] as any[],
      accommodations: [] as any[],
      flightDetails: [] as any[],
      addOns: [] as any[],
      restaurantSuggestions: [] as any[],
      tripTerms: {
        paymentPolicy: "",
        cancellationPolicy: "",
        visaRules: "",
        generalNotes: "",
      },
      transportationArrangement: "Planner",
      startingTransferDetails: "",
      packageTransportationDetails: "",
    };
  });

  // Auto-calculate Duration Days and Nights from Start and End Dates
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (diffDays >= 1) {
        setFormData((prev: any) => ({
          ...prev,
          durationDays: diffDays,
          durationNights: Math.max(0, diffDays - 1),
        }));
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
      if (!c.departureCity) return false;
      const cCity = c.departureCity.split("(")[0].trim().toLowerCase();
      return cCity === cleanInputCity || cleanInputCity.includes(cCity) || cCity.includes(cleanInputCity);
    });

    if (matched) {
      setAutoMatchedConsultant(`${matched.name} (${matched.departureCity})`);
      setFormData((prev: any) => {
        if (prev.consultantName === matched.name && prev.consultantPhone === matched.phone) {
          return prev;
        }
        return {
          ...prev,
          consultantName: matched.name,
          consultantPhone: matched.phone,
        };
      });
    } else {
      setAutoMatchedConsultant(null);
    }
  }, [formData.departureCity, masterData.consultants]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    let finalVal: any = value;
    if (type === "number") {
      finalVal = value === "" ? "" : Number(value);
    }
    setFormData((prev: any) => ({ ...prev, [name]: finalVal }));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.url) {
        setFormData((prev: any) => ({ ...prev, coverImage: data.url }));
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      alert("Error uploading cover image");
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
        router.push("/");
        router.refresh();
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

  // Step 2: Price Quotes
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

  // Step 3: Days
  const addDay = () => {
    const nextDayNum = formData.itineraryDays.length + 1;
    const newDay = {
      dayNumber: nextDayNum,
      cityOrStay: "",
      title: "",
      durationHours: null,
      description: "",
      inclusions: [] as string[],
      exclusions: [] as string[],
      customerLovedTips: [] as string[],
      customerWatchOutTips: [] as string[],
      sortOrder: nextDayNum,
    };
    setFormData((prev: any) => ({
      ...prev,
      itineraryDays: [...prev.itineraryDays, newDay],
    }));
  };

  const removeDay = (index: number) => {
    const updated = formData.itineraryDays
      .filter((_: any, i: number) => i !== index)
      .map((day: any, i: number) => ({ ...day, dayNumber: i + 1, sortOrder: i + 1 }));
    setFormData((prev: any) => ({ ...prev, itineraryDays: updated }));
  };

  const updateDayField = (index: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const days = [...prev.itineraryDays];
      days[index] = { ...days[index], [field]: value };
      return { ...prev, itineraryDays: days };
    });
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

  // Step 4: Accommodations
  const [editingAccIndex, setEditingAccIndex] = useState<number | null>(null);
  const [newAcc, setNewAcc] = useState({
    location: "",
    checkInDate: "",
    checkOutDate: "",
    hotelName: "",
    starRating: 4,
    roomType: "",
    mealPlan: "",
    ratingScore: 4.8,
    ratingLabel: "Very Good",
    facilities: [] as string[],
    nearbyAttractions: [] as { name: string; distanceKm: number }[],
    nearbyRestaurants: [] as { name: string; distance: string }[],
    photos: [] as string[],
  });

  const [scopedHotel, setScopedHotel] = useState<any | null>(null);
  const [newAccPhotoUrl, setNewAccPhotoUrl] = useState("");
  const [uploadingAccPhoto, setUploadingAccPhoto] = useState(false);

  const startEditAcc = (idx: number) => {
    const acc = formData.accommodations[idx];
    setNewAcc({
      location: acc.location || "",
      checkInDate: acc.checkInDate || "",
      checkOutDate: acc.checkOutDate || "",
      hotelName: acc.hotelName || "",
      starRating: acc.starRating || 4,
      roomType: acc.roomType || "",
      mealPlan: acc.mealPlan || "",
      ratingScore: acc.ratingScore || 4.8,
      ratingLabel: acc.ratingLabel || "Very Good",
      facilities: acc.facilities || [],
      nearbyAttractions: acc.nearbyAttractions || [],
      nearbyRestaurants: acc.nearbyRestaurants || [],
      photos: acc.photos || [],
    });
    const matched = masterData.hotels.find((h) => h.name === acc.hotelName);
    setScopedHotel(matched || null);
    setEditingAccIndex(idx);
  };

  const addAcc = () => {
    if (!newAcc.hotelName || !newAcc.location || !newAcc.checkInDate || !newAcc.checkOutDate) {
      alert("Check-in, Check-out, Hotel Name, and Location are required.");
      return;
    }
    setFormData((prev: any) => {
      const list = [...prev.accommodations];
      if (editingAccIndex !== null) {
        list[editingAccIndex] = newAcc;
      } else {
        list.push(newAcc);
      }
      return { ...prev, accommodations: list };
    });
    setEditingAccIndex(null);
    setScopedHotel(null);
    setNewAcc({
      location: "",
      checkInDate: "",
      checkOutDate: "",
      hotelName: "",
      starRating: 4,
      roomType: "",
      mealPlan: "",
      ratingScore: 4.8,
      ratingLabel: "Very Good",
      facilities: [],
      nearbyAttractions: [],
      nearbyRestaurants: [],
      photos: [],
    });
  };

  const removeAcc = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      accommodations: prev.accommodations.filter((_: any, i: number) => i !== index),
    }));
  };

  // Step 5: Flights
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
    type: "Flight",
    travelTime: "12:00 PM",
    flightCodeDefault: "",
    isStartingTransfer: false,
    isPackageIncluded: false,
  });

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
      type: f.type || "Flight",
      travelTime: f.travelTime || "12:00 PM",
      flightCodeDefault: f.flightCodeDefault || "",
      isStartingTransfer: f.isStartingTransfer || false,
      isPackageIncluded: f.isPackageIncluded || false,
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
      type: "Flight",
      travelTime: "12:00 PM",
      flightCodeDefault: "",
      isStartingTransfer: false,
      isPackageIncluded: false,
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
                <label className="block text-xs font-semibold text-zinc-700">
                  Itinerary Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Magical 5 Days Bali Luxury Escape"
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

              {/* Destination Country/City (Master Data Hub Only) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  Destination Country/City *
                </label>
                <select
                  name="destination"
                  value={formData.destination}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none cursor-pointer"
                >
                  <option value="">-- Select Master Destination City / Country --</option>
                  {formData.destination &&
                    !masterData.cities.some(
                      (c) => `${c.name}, ${c.country}` === formData.destination || c.name === formData.destination
                    ) && (
                      <option value={formData.destination}>{formData.destination} (Current)</option>
                    )}
                  {masterData.cities.map((c) => (
                    <option key={c.id} value={`${c.name}, ${c.country}`}>
                      {c.name}, {c.country} {c.state ? `(${c.state})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-400">
                  Displays only cities managed in Master Data Hub &rarr; Cities.
                </p>
              </div>

              {/* Departure City (India Hubs Only - Master Data Hub Only) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Departure City (India Hubs Only) *
                  </label>
                </div>
                <select
                  name="departureCity"
                  value={formData.departureCity}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-[#14213D] focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none cursor-pointer"
                >
                  <option value="">-- Select Master Departure City (India Hub) --</option>
                  {formData.departureCity &&
                    !indianCities.some(
                      (c) => c.name === formData.departureCity || `${c.name} (${c.state})` === formData.departureCity
                    ) && (
                      <option value={formData.departureCity}>{formData.departureCity} (Current)</option>
                    )}
                  {indianCities.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.state ? `(${c.state})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-400">
                  Displays only Indian cities managed in Master Data Hub &rarr; Cities. Auto-assigns mapped consultant.
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
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
                Step 2: Day-by-Day Itinerary Builder
              </h2>
              <button
                type="button"
                onClick={addDay}
                className="px-3.5 py-1.5 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Day
              </button>
            </div>

            <div className="space-y-6">
              {formData.itineraryDays.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-lg">
                  No itinerary days added yet. Click &quot;Add Day&quot; to build your itinerary.
                </div>
              ) : (
                formData.itineraryDays.map((day: any, dIdx: number) => (
                  <div
                    key={dIdx}
                    className="bg-white border border-[#B8944F]/20 rounded-lg p-5 craft-card space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="h-6 w-6 rounded-full bg-[#B8944F] text-white text-xs font-bold flex items-center justify-center">
                          {day.dayNumber}
                        </span>
                        <span className="text-xs font-bold text-[#14213D]">
                          Day {day.dayNumber} Itinerary
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Select from Activity Library Picker */}
                        {masterData.activities.length > 0 && (
                          <select
                            onChange={(e) => {
                              const act = masterData.activities.find(
                                (a) => a.title === e.target.value
                              );
                              if (act) {
                                setFormData((prev: any) => {
                                  const updatedDays = [...prev.itineraryDays];
                                  updatedDays[dIdx] = {
                                    ...updatedDays[dIdx],
                                    title: act.title,
                                    durationHours: act.defaultDurationHours,
                                    description: act.description,
                                    inclusions: act.inclusions || [],
                                    exclusions: act.exclusions || [],
                                    customerLovedTips: act.loveTips || [],
                                    customerWatchOutTips: act.watchOutTips || [],
                                  };
                                  return { ...prev, itineraryDays: updatedDays };
                                });
                              }
                            }}
                            value=""
                            className="text-[11px] font-semibold text-[#B8944F] bg-[#B8944F]/10 border border-[#B8944F]/30 rounded px-2.5 py-1 outline-none cursor-pointer"
                          >
                            <option value="">⚡ Select from Activity Library...</option>
                            {masterData.activities.map((a) => (
                              <option key={a.id} value={a.title}>
                                {a.title}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          type="button"
                          onClick={() => removeDay(dIdx)}
                          className="text-zinc-400 hover:text-red-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          City / Stay Location *
                        </label>
                        <input
                          type="text"
                          value={day.cityOrStay}
                          onChange={(e) => updateDayField(dIdx, "cityOrStay", e.target.value)}
                          placeholder="e.g. Seminyak, Ubud, Dubai"
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Day Theme / Title *
                        </label>
                        <input
                          type="text"
                          value={day.title}
                          onChange={(e) => updateDayField(dIdx, "title", e.target.value)}
                          placeholder="e.g. Uluwatu Cliff Sunset & Jimbaran Seafood Dinner"
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] focus:ring-1 focus:ring-[#B8944F] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Day Description *
                      </label>
                      <textarea
                        rows={3}
                        value={day.description}
                        onChange={(e) => updateDayField(dIdx, "description", e.target.value)}
                        placeholder="Detailed chronological plan of activities, sightseeing spots, and timings..."
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] outline-none leading-relaxed"
                      />
                    </div>

                    {/* Inclusions & Exclusions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Inclusions
                        </label>
                        <div className="flex gap-1 mb-2">
                          <input
                            type="text"
                            value={dayInputTags[`${dIdx}-inclusions`] || ""}
                            onChange={(e) =>
                              setDayInputTags((prev) => ({
                                ...prev,
                                [`${dIdx}-inclusions`]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddDayTag(dIdx, "inclusions");
                              }
                            }}
                            placeholder="Add inclusion tag..."
                            className="flex-1 px-2.5 py-1.5 border border-zinc-200 rounded text-xs outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddDayTag(dIdx, "inclusions")}
                            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(day.inclusions || []).map((tag: string, tIdx: number) => (
                            <span
                              key={tIdx}
                              className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveDayTag(dIdx, "inclusions", tIdx)}
                                className="ml-1 text-emerald-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Exclusions
                        </label>
                        <div className="flex gap-1 mb-2">
                          <input
                            type="text"
                            value={dayInputTags[`${dIdx}-exclusions`] || ""}
                            onChange={(e) =>
                              setDayInputTags((prev) => ({
                                ...prev,
                                [`${dIdx}-exclusions`]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddDayTag(dIdx, "exclusions");
                              }
                            }}
                            placeholder="Add exclusion tag..."
                            className="flex-1 px-2.5 py-1.5 border border-zinc-200 rounded text-xs outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddDayTag(dIdx, "exclusions")}
                            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(day.exclusions || []).map((tag: string, tIdx: number) => (
                            <span
                              key={tIdx}
                              className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveDayTag(dIdx, "exclusions", tIdx)}
                                className="ml-1 text-red-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tips fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          ❤️ Love Tips (Traveler Highlights)
                        </label>
                        <div className="flex gap-1 mb-2">
                          <input
                            type="text"
                            value={dayInputTags[`${dIdx}-customerLovedTips`] || ""}
                            onChange={(e) =>
                              setDayInputTags((prev) => ({
                                ...prev,
                                [`${dIdx}-customerLovedTips`]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddDayTag(dIdx, "customerLovedTips");
                              }
                            }}
                            placeholder="Add highlight tip..."
                            className="flex-1 px-2.5 py-1.5 border border-zinc-200 rounded text-xs outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddDayTag(dIdx, "customerLovedTips")}
                            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(day.customerLovedTips || []).map((tag: string, tIdx: number) => (
                            <span
                              key={tIdx}
                              className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-pink-50 text-pink-800 border border-pink-200"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveDayTag(dIdx, "customerLovedTips", tIdx)
                                }
                                className="ml-1 text-pink-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          ⚠️ Watch-out Tips (Advisory & Rules)
                        </label>
                        <div className="flex gap-1 mb-2">
                          <input
                            type="text"
                            value={dayInputTags[`${dIdx}-customerWatchOutTips`] || ""}
                            onChange={(e) =>
                              setDayInputTags((prev) => ({
                                ...prev,
                                [`${dIdx}-customerWatchOutTips`]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddDayTag(dIdx, "customerWatchOutTips");
                              }
                            }}
                            placeholder="Add advisory warning..."
                            className="flex-1 px-2.5 py-1.5 border border-zinc-200 rounded text-xs outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddDayTag(dIdx, "customerWatchOutTips")}
                            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(day.customerWatchOutTips || []).map((tag: string, tIdx: number) => (
                            <span
                              key={tIdx}
                              className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveDayTag(dIdx, "customerWatchOutTips", tIdx)
                                }
                                className="ml-1 text-amber-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#14213D] font-fraunces">
              Step 3: Stays & Accommodations
            </h2>

            {/* Hotel Entry Form */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                  {editingAccIndex !== null ? "Edit Hotel Stay" : "Add Hotel Stay"}
                </span>

                {/* Master Hotel Selector */}
                {masterData.hotels.length > 0 && (
                  <select
                    onChange={(e) => {
                      const h = masterData.hotels.find((item) => item.name === e.target.value);
                      if (h) {
                        setScopedHotel(h);
                        setNewAcc((prev) => ({
                          ...prev,
                          hotelName: h.name,
                          location: h.city ? `${h.city.name}, ${h.city.country}` : prev.location,
                          starRating: h.starRating || 4,
                          ratingScore: h.guestScore || 4.8,
                          ratingLabel: h.guestScoreLabel || "Very Good",
                          roomType: h.roomTypes?.[0] || prev.roomType,
                          mealPlan: h.mealPlans?.[0] || prev.mealPlan,
                          facilities: h.facilities || [],
                          nearbyAttractions: h.nearbyAttractions || [],
                          nearbyRestaurants: h.nearbyRestaurants || [],
                          photos: h.photos || [],
                        }));
                      }
                    }}
                    value=""
                    className="text-[11px] font-semibold text-[#B8944F] bg-white border border-[#B8944F]/30 rounded px-2.5 py-1 outline-none cursor-pointer"
                  >
                    <option value="">⚡ Pre-fill from Master Hotel Catalog...</option>
                    {masterData.hotels.map((h) => (
                      <option key={h.id} value={h.name}>
                        {h.name} ({h.city ? h.city.name : ""})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Hotel Location/City *
                  </label>
                  <input
                    type="text"
                    value={newAcc.location}
                    onChange={(e) => setNewAcc({ ...newAcc, location: e.target.value })}
                    placeholder="e.g. Seminyak, Bali"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Hotel Name *
                  </label>
                  <input
                    type="text"
                    value={newAcc.hotelName}
                    onChange={(e) => setNewAcc({ ...newAcc, hotelName: e.target.value })}
                    placeholder="e.g. The Seminyak Beach Resort & Spa"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Check-in Date *
                  </label>
                  <input
                    type="date"
                    value={newAcc.checkInDate}
                    onChange={(e) => setNewAcc({ ...newAcc, checkInDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Check-out Date *
                  </label>
                  <input
                    type="date"
                    value={newAcc.checkOutDate}
                    onChange={(e) => setNewAcc({ ...newAcc, checkOutDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                </div>

                {/* Scoped Room Type and Meal Plan */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Room Type *
                  </label>
                  {scopedHotel && scopedHotel.roomTypes?.length > 0 ? (
                    <select
                      value={newAcc.roomType}
                      onChange={(e) => setNewAcc({ ...newAcc, roomType: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                    >
                      <option value="">-- Select Available Room Type --</option>
                      {scopedHotel.roomTypes.map((r: string, i: number) => (
                        <option key={i} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newAcc.roomType}
                      onChange={(e) => setNewAcc({ ...newAcc, roomType: e.target.value })}
                      placeholder="e.g. Deluxe Garden Villa with Private Pool"
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Meal Plan *
                  </label>
                  {scopedHotel && scopedHotel.mealPlans?.length > 0 ? (
                    <select
                      value={newAcc.mealPlan}
                      onChange={(e) => setNewAcc({ ...newAcc, mealPlan: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                    >
                      <option value="">-- Select Available Meal Plan --</option>
                      {scopedHotel.mealPlans.map((m: string, i: number) => (
                        <option key={i} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newAcc.mealPlan}
                      onChange={(e) => setNewAcc({ ...newAcc, mealPlan: e.target.value })}
                      placeholder="e.g. Daily Buffet Breakfast (CP)"
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Photos upload / URL */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Stay Photos (URLs)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newAccPhotoUrl}
                    onChange={(e) => setNewAccPhotoUrl(e.target.value)}
                    placeholder="Paste image URL..."
                    className="flex-1 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newAccPhotoUrl.trim()) {
                        setNewAcc((prev) => ({
                          ...prev,
                          photos: [...prev.photos, newAccPhotoUrl.trim()],
                        }));
                        setNewAccPhotoUrl("");
                      }
                    }}
                    className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 rounded-lg text-xs font-bold"
                  >
                    + Add URL
                  </button>
                </div>
                {newAcc.photos.length > 0 && (
                  <div className="flex space-x-2 overflow-x-auto py-1">
                    {newAcc.photos.map((p, idx) => (
                      <div
                        key={idx}
                        className="relative h-16 w-24 rounded-lg overflow-hidden border border-zinc-200 shrink-0 group"
                      >
                        <img src={p} alt="Preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setNewAcc((prev) => ({
                              ...prev,
                              photos: prev.photos.filter((_, i) => i !== idx),
                            }))
                          }
                          className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                {editingAccIndex !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccIndex(null);
                      setScopedHotel(null);
                    }}
                    className="px-3.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={addAcc}
                  className="px-4 py-2 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {editingAccIndex !== null ? "Update Stay" : "+ Add Stay to Trip"}
                </button>
              </div>
            </div>

            {/* Stays List */}
            <div className="space-y-3">
              {formData.accommodations.map((acc: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-white border border-[#B8944F]/20 rounded-lg craft-card text-xs"
                >
                  <div>
                    <h4 className="font-bold text-[#14213D] text-sm">{acc.hotelName}</h4>
                    <p className="text-zinc-500 mt-0.5">
                      📍 {acc.location} &bull; {acc.roomType} ({acc.mealPlan})
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      📅 {acc.checkInDate} to {acc.checkOutDate} &bull; {acc.starRating}★
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => startEditAcc(idx)}
                      className="p-1.5 text-zinc-500 hover:text-[#B8944F] cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAcc(idx)}
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

      case 4: {
        const TRANSPORT_TYPES = ["Flight", "Train", "Bus", "Car", "Sedan", "SUV", "Other"];
        const getTransportIcon = (type: string) => {
          switch (type) {
            case "Flight":
              return <Plane className="h-3.5 w-3.5 text-[#B8944F] mr-2" />;
            case "Train":
              return <Train className="h-3.5 w-3.5 text-[#B8944F] mr-2" />;
            case "Bus":
              return <Bus className="h-3.5 w-3.5 text-[#B8944F] mr-2" />;
            case "Car":
            case "Sedan":
            case "SUV":
              return <Car className="h-3.5 w-3.5 text-[#B8944F] mr-2" />;
            default:
              return <Car className="h-3.5 w-3.5 text-[#B8944F] mr-2" />;
          }
        };

        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#14213D] font-fraunces flex items-center justify-between">
              <span>Step 4: Transportation & Transit arrangements</span>
              <span className="text-xs bg-[#B8944F]/10 text-[#B8944F] font-bold px-2 py-1 rounded">
                Master Catalog Linked
              </span>
            </h2>

            {/* Arrangement Selector */}
            <div className="bg-white border border-[#B8944F]/20 rounded-lg p-5 craft-card space-y-4">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Transportation Arrangement Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, transportationArrangement: "Own" })}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    formData.transportationArrangement === "Own"
                      ? "border-[#B8944F] bg-[#B8944F]/5 text-[#14213D] shadow-sm font-bold"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider font-bold mb-1">Own Transportation</div>
                  <div className="text-[11px] font-normal text-zinc-400">Traveller will arrange their own transit.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, transportationArrangement: "Planner" })}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    formData.transportationArrangement === "Planner"
                      ? "border-[#B8944F] bg-[#B8944F]/5 text-[#14213D] shadow-sm font-bold"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider font-bold mb-1">Trip Planner Arrangement</div>
                  <div className="text-[11px] font-normal text-zinc-400">Arranged by trip planner using catalog options.</div>
                </button>
              </div>
            </div>

            {/* Starting Point Transfer Section */}
            <div className="bg-white border border-[#B8944F]/20 rounded-lg p-5 craft-card space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#14213D]">Starting Point Hub Transfer</h3>
                <p className="text-[11px] text-zinc-500">Arrange travel to reach the starting point of the main tour (e.g. Vadodara → Ahmedabad)</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Transfer Route Details (Optional)
                </label>
                <input
                  type="text"
                  value={formData.startingTransferDetails || ""}
                  onChange={(e) => setFormData({ ...formData, startingTransferDetails: e.target.value })}
                  placeholder="e.g. Vadodara to Ahmedabad by Sedan (starts 2 hours prior)"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs outline-none"
                />
              </div>
            </div>

            {/* Package Level Route Display */}
            <div className="bg-white border border-[#B8944F]/20 rounded-lg p-5 craft-card space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#14213D]">Package-Level Included Transportation</h3>
                <p className="text-[11px] text-zinc-500">Specify transit included directly in the main package (e.g. Ahmedabad → Udaipur by Sedan)</p>
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={formData.packageTransportationDetails || ""}
                  onChange={(e) => setFormData({ ...formData, packageTransportationDetails: e.target.value })}
                  placeholder="e.g. Ahmedabad to Udaipur - AC Sedan included in package"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs outline-none"
                />
              </div>
            </div>

            {formData.transportationArrangement === "Planner" && (
              <>
                {/* Detail Transit Route Items */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <span className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                      {editingFlightIndex !== null ? "Edit Transit Leg" : "Add Transportation / Flight Leg"}
                    </span>

                    {/* Generalized Route selector */}
                    {masterData.flightRoutes.length > 0 && (
                      <select
                        onChange={(e) => {
                          const route = masterData.flightRoutes.find((r) => r.id === e.target.value);
                          if (route) {
                            setNewFlight((prev) => ({
                              ...prev,
                              sector: route.sector,
                              airline: route.airline,
                              flightCodeDefault: route.flightCodeDefault || "",
                              stops: route.typicalStops || 0,
                              layoverInfo: route.typicalLayoverInfo || "",
                              carryOnBaggageKg: route.cabinBaggageKg ?? 7,
                              checkInBaggageKg: route.checkInBaggageKg ?? 20,
                              cancellationPolicy: route.cancellationPolicy || "",
                              flightNotes: route.flightNotes || "",
                              type: route.type || "Flight",
                              travelTime: route.travelTime || "12:00 PM",
                            }));
                          }
                        }}
                        value=""
                        className="text-[11px] font-semibold text-[#B8944F] bg-white border border-[#B8944F]/30 rounded px-2.5 py-1 outline-none cursor-pointer"
                      >
                        <option value="">⚡ Pre-fill from Master Routes Catalog...</option>
                        {masterData.flightRoutes.map((r) => (
                          <option key={r.id} value={r.id}>
                            [{r.type || "Flight"}] {r.sector} &bull; {r.airline} &bull; {r.travelTime || "Anytime"}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Timing Matcher Suggestion */}
                  {newFlight.sector && (
                    <div className="bg-white border border-[#B8944F]/20 rounded-lg p-3 text-xs space-y-2">
                      <div className="font-bold text-[#14213D] flex items-center justify-between">
                        <span>💡 Timing-Matched Master Suggestions for "{newFlight.sector}":</span>
                        {newFlight.travelTime && (
                          <span className="text-[10px] bg-[#B8944F]/10 text-[#B8944F] px-1.5 py-0.5 rounded font-mono">
                            Target Time: {newFlight.travelTime}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const matched = masterData.flightRoutes.filter(
                          (r) => r.sector.toLowerCase().includes(newFlight.sector.toLowerCase())
                        );
                        if (matched.length === 0) {
                          return <p className="text-[10px] text-zinc-400">No timing suggestions found in Master Catalog.</p>;
                        }
                        return (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {matched.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                  setNewFlight((prev) => ({
                                    ...prev,
                                    sector: r.sector,
                                    airline: r.airline,
                                    flightCodeDefault: r.flightCodeDefault || "",
                                    stops: r.typicalStops || 0,
                                    layoverInfo: r.typicalLayoverInfo || "",
                                    carryOnBaggageKg: r.cabinBaggageKg ?? 7,
                                    checkInBaggageKg: r.checkInBaggageKg ?? 20,
                                    cancellationPolicy: r.cancellationPolicy || "",
                                    flightNotes: r.flightNotes || "",
                                    type: r.type || "Flight",
                                    travelTime: r.travelTime || "12:00 PM",
                                  }));
                                }}
                                className="bg-zinc-50 hover:bg-[#B8944F]/10 border border-zinc-200 hover:border-[#B8944F] rounded p-2 text-left text-[11px] transition-all cursor-pointer flex flex-col"
                              >
                                <span className="font-bold text-zinc-700">[{r.type}] {r.airline}</span>
                                <span className="text-[10px] text-[#B8944F] font-semibold mt-0.5">🕒 Time: {r.travelTime || "Any"}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Transportation Type *
                      </label>
                      <select
                        value={newFlight.type}
                        onChange={(e) => setNewFlight({ ...newFlight, type: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none cursor-pointer"
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
                        Preferred Travel Timing (e.g. 08:00 PM)
                      </label>
                      <input
                        type="text"
                        value={newFlight.travelTime}
                        onChange={(e) => setNewFlight({ ...newFlight, travelTime: e.target.value })}
                        placeholder="e.g. 08:00 PM"
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Sector * (e.g. Vadodara to Ahmedabad)
                      </label>
                      <input
                        type="text"
                        value={newFlight.sector}
                        onChange={(e) => setNewFlight({ ...newFlight, sector: e.target.value })}
                        placeholder="e.g. Ahmedabad to Udaipur"
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
                        placeholder="e.g. Indigo, Indian Railways, Private Vendor"
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Route Code / Flight Number / Plate
                      </label>
                      <input
                        type="text"
                        value={newFlight.flightCodeDefault || ""}
                        onChange={(e) => setNewFlight({ ...newFlight, flightCodeDefault: e.target.value })}
                        placeholder="e.g. Train-12952, Indigo PNR"
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Transit Details / Layovers
                      </label>
                      <input
                        type="text"
                        value={newFlight.layoverInfo}
                        onChange={(e) => setNewFlight({ ...newFlight, layoverInfo: e.target.value })}
                        placeholder="e.g. Non-stop, or Layover at BOM"
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Departure Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={newFlight.departureDateTime}
                        onChange={(e) => setNewFlight({ ...newFlight, departureDateTime: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Arrival Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={newFlight.arrivalDateTime}
                        onChange={(e) => setNewFlight({ ...newFlight, arrivalDateTime: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="col-span-2 flex flex-wrap gap-4 pt-2">
                      <label className="flex items-center space-x-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newFlight.isStartingTransfer}
                          onChange={(e) => setNewFlight({ ...newFlight, isStartingTransfer: e.target.checked })}
                          className="h-4 w-4 rounded border-zinc-300 text-[#B8944F] focus:ring-[#B8944F]"
                        />
                        <span>Starting point hub transfer (e.g. Vadodara → Ahmedabad)</span>
                      </label>

                      <label className="flex items-center space-x-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newFlight.isPackageIncluded}
                          onChange={(e) => setNewFlight({ ...newFlight, isPackageIncluded: e.target.checked })}
                          className="h-4 w-4 rounded border-zinc-300 text-[#B8944F] focus:ring-[#B8944F]"
                        />
                        <span>Package Included Transportation</span>
                      </label>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Route Advisory Notes & Policies
                      </label>
                      <input
                        type="text"
                        value={newFlight.flightNotes}
                        onChange={(e) => setNewFlight({ ...newFlight, flightNotes: e.target.value })}
                        placeholder="e.g. Includes private AC vehicle, road toll charges and driver allowance."
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    {editingFlightIndex !== null && (
                      <button
                        type="button"
                        onClick={() => setEditingFlightIndex(null)}
                        className="px-3.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={addFlight}
                      className="px-4 py-2 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      {editingFlightIndex !== null ? "Update Arrangement" : "+ Add Transit Option to Plan"}
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="space-y-3">
                  {formData.flightDetails.map((f: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-white border border-[#B8944F]/20 rounded-lg craft-card text-xs"
                    >
                      <div>
                        <h4 className="font-bold text-[#14213D] text-sm flex items-center">
                          {getTransportIcon(f.type || "Flight")}
                          <span>{f.sector} ({f.airline})</span>
                          {f.isStartingTransfer && (
                            <span className="ml-2 bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded text-[9px] font-bold">
                              Starting Transfer
                            </span>
                          )}
                          {f.isPackageIncluded && (
                            <span className="ml-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded text-[9px] font-bold">
                              Package Included
                            </span>
                          )}
                        </h4>
                        <p className="text-zinc-500 mt-0.5 font-semibold text-[11px] flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-[#B8944F]" />
                          Preferred Travel Time: {f.travelTime || "Anytime"} &bull; Type: <span className="capitalize ml-1 text-[#14213D]">{f.type || "Flight"}</span>
                        </p>
                        {(f.departureDateTime || f.arrivalDateTime) && (
                          <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            📅 Dep: {f.departureDateTime || "N/A"} &bull; Arr: {f.arrivalDateTime || "N/A"}
                          </p>
                        )}
                        {f.flightNotes && (
                          <p className="text-[11px] text-zinc-400 mt-0.5 italic">
                            Notes: {f.flightNotes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => startEditFlight(idx)}
                          className="p-1.5 text-zinc-500 hover:text-[#B8944F] cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFlight(idx)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      }

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#14213D] font-fraunces">
              Step 5: Optional Add-ons & Visa
            </h2>

            {/* Add-on Entry Form with Master AddOn picker */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                  {editingAddOnIndex !== null ? "Edit Add-on Service" : "Add Service / Visa Package"}
                </span>

                {/* Master Add-on Picker */}
                {masterData.addOns.length > 0 && (
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
                    <option value="">⚡ Pre-fill from Master Add-ons...</option>
                    {masterData.addOns.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name} (₹{a.defaultPrice})
                      </option>
                    ))}
                  </select>
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

      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#14213D] font-fraunces">
              Step 6: Restaurant & Club Suggestions
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

      case 7:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
                Step 7: Master Policies & Guidelines
              </h2>

              {/* Master Policy Template Loader */}
              {masterData.policyTemplates.length > 0 && (
                <select
                  onChange={(e) => {
                    const template = masterData.policyTemplates.find(
                      (p) => p.name === e.target.value
                    );
                    if (template) {
                      setFormData((prev: any) => ({
                        ...prev,
                        tripTerms: {
                          paymentPolicy: template.paymentPolicy,
                          cancellationPolicy: template.cancellationPolicy,
                          visaRules: template.visaRules,
                          generalNotes: template.generalNotes,
                        },
                      }));
                    }
                  }}
                  value=""
                  className="text-[11px] font-semibold text-[#B8944F] bg-[#B8944F]/10 border border-[#B8944F]/30 rounded-lg px-3 py-1.5 outline-none cursor-pointer"
                >
                  <option value="">⚡ Load from Policy Preset...</option>
                  {masterData.policyTemplates.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
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

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
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

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  3. Visa Rules & Entry Requirements
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

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  4. General Notes & Advisory Guidelines
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

      case 8:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#14213D] font-fraunces">
              Step 8: Price Quotes & Financials
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
    <div className="relative min-h-screen bg-[#FAF8F5] py-8 px-4 sm:px-6 lg:px-8 font-sans text-[#14213D]">
      <div className="max-w-6xl mx-auto">
        {/* Nav Header */}
        <div className="flex items-center justify-between mb-8 pb-5 border-b border-zinc-200">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center text-xs font-bold text-zinc-600 hover:text-[#14213D] transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5 text-[#B8944F]" /> Back to Workspace Console
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Day-Wise Trip Summary if editing existing trip */}
            {tripId && (
              <Link
                href={`/admin/summary/${tripId}`}
                target="_blank"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#B8944F]/40 bg-white hover:bg-[#B8944F]/10 text-xs font-bold text-[#B8944F] transition-all shadow-2xs cursor-pointer"
                title="Open Day-Wise Trip Summary"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Trip Summary</span>
              </Link>
            )}

            {/* Manage Master Data Button (Spec Requirement) */}
            <Link
              href="/master-data"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition-all shadow-2xs cursor-pointer"
            >
              <Database className="h-3.5 w-3.5 text-zinc-500" />
              <span>Master Data</span>
            </Link>

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#14213D] text-[#FAF8F5]">
              {tripId ? "Edit Travel Blueprint" : "Create Travel Blueprint"}
            </span>
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
    </div>
  );
}
