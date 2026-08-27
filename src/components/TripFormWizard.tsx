"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Loader2, 
  Calendar, 
  MapPin, 
  Plane, 
  Coffee, 
  Utensils, 
  FileText, 
  DollarSign,
  PlusCircle,
  X,
  Check,
  FileDown,
  Pencil
} from "lucide-react";
import { createTrip, updateTrip } from "@/actions/trips";
import { RichTextEditor } from "./RichTextEditor";

interface TripFormWizardProps {
  initialData?: any; // Nested trip data structure
  tripId?: string; // Present only if editing
}

const STEPS = [
  { number: 1, name: "Base Details", icon: MapPin },
  { number: 2, name: "Pricing", icon: DollarSign },
  { number: 3, name: "Itinerary Days", icon: Calendar },
  { number: 4, name: "Stays", icon: Coffee },
  { number: 5, name: "Flights", icon: Plane },
  { number: 6, name: "Add-Ons", icon: PlusCircle },
  { number: 7, name: "Dining Suggestions", icon: Utensils },
  { number: 8, name: "Terms & Conditions", icon: FileText },
];

export function TripFormWizard({ initialData, tripId }: TripFormWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [editingAccIndex, setEditingAccIndex] = useState<number | null>(null);
  const [editingFlightIndex, setEditingFlightIndex] = useState<number | null>(null);
  const [editingAddOnIndex, setEditingAddOnIndex] = useState<number | null>(null);
  const [editingRestIndex, setEditingRestIndex] = useState<number | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

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
      const res = await fetch(`/api/pdf/${tripId}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unknown server error");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Itinerary-${formData.title.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      alert(`Export PDF Failed: ${err.message || "Could not launch PDF generator."}`);
    } finally {
      setDownloading(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState<any>(() => {
    if (initialData) {
      // Map initial dates to YYYY-MM-DD strings for HTML input compatibility
      const data = { ...initialData };
      data.startDate = new Date(data.startDate).toISOString().split("T")[0];
      data.endDate = new Date(data.endDate).toISOString().split("T")[0];
      
      data.accommodations = data.accommodations.map((acc: any) => ({
        ...acc,
        checkInDate: new Date(acc.checkInDate).toISOString().split("T")[0],
        checkOutDate: new Date(acc.checkOutDate).toISOString().split("T")[0],
      }));

      data.flightDetails = data.flightDetails.map((f: any) => ({
        ...f,
        departureDateTime: new Date(f.departureDateTime).toISOString().slice(0, 16),
        arrivalDateTime: new Date(f.arrivalDateTime).toISOString().slice(0, 16),
      }));

      return data;
    }

    return {
      title: "",
      destination: "",
      departureCity: "",
      startDate: "",
      endDate: "",
      durationDays: 1,
      durationNights: 0,
      numTravellers: 1,
      consultantName: "",
      consultantPhone: "",
      coverImage: null,
      priceQuoteItems: [] as any[],
      tripFinancials: {
        tcsPercentage: 5,
        tcsAmount: 0,
        totalWithTcs: 0,
        notes: "",
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
    };
  });

  // Recalculate TCS and Total whenever Price Items or TCS % changes
  useEffect(() => {
    const subtotal = formData.priceQuoteItems.reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);
    const tcsPct = Number(formData.tripFinancials?.tcsPercentage || 0);
    const tcsAmount = subtotal * (tcsPct / 100);
    const total = subtotal + tcsAmount;

    setFormData((prev: any) => ({
      ...prev,
      tripFinancials: {
        ...prev.tripFinancials,
        tcsAmount,
        totalWithTcs: total,
      },
    }));
  }, [formData.priceQuoteItems, formData.tripFinancials?.tcsPercentage]);

  // Handle simple text field inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalVal: any = value;
    if (type === "number") {
      finalVal = value === "" ? "" : Number(value);
    }
    setFormData((prev: any) => ({ ...prev, [name]: finalVal }));
  };

  // Step Validation Helpers
  const validateStep = (): boolean => {
    setError(null);
    return true;
  };

  const isStep1Incomplete = () => {
    return (
      !formData.title || !formData.title.trim() ||
      !formData.destination || !formData.destination.trim() ||
      !formData.departureCity || !formData.departureCity.trim() ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.consultantName || !formData.consultantName.trim() ||
      !formData.consultantPhone || !formData.consultantPhone.trim()
    );
  };

  const isFieldEmpty = (name: string) => {
    const val = formData[name];
    return !val || (typeof val === "string" && !val.trim());
  };

  const fail = (msg: string) => {
    setError(msg);
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

  // Submit complete wizard
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

  // ==========================
  // DYNAMIC ITEMS APPENDERS
  // ==========================

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

  // Step 3: Itinerary Days
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

  const moveDay = (index: number, direction: "up" | "down") => {
    const updated = [...formData.itineraryDays];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;

    // Swap elements
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Reset day numbers and sortOrder
    const finalDays = updated.map((d, i) => ({
      ...d,
      dayNumber: i + 1,
      sortOrder: i + 1,
    }));

    setFormData((prev: any) => ({ ...prev, itineraryDays: finalDays }));
  };

  const updateDayField = (index: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const days = [...prev.itineraryDays];
      days[index] = { ...days[index], [field]: value };
      return { ...prev, itineraryDays: days };
    });
  };

  // Day array lists
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
  const [newAcc, setNewAcc] = useState({
    location: "",
    checkInDate: "",
    checkOutDate: "",
    hotelName: "",
    starRating: 4,
    roomType: "",
    mealPlan: "",
    ratingScore: 4.5,
    ratingLabel: "Very Good",
    facilities: [] as string[],
    nearbyAttractions: [] as { name: string; distanceKm: number }[],
    nearbyRestaurants: [] as { name: string; distance: string }[],
    photos: [] as string[],
  });

  const [newAccFacility, setNewAccFacility] = useState("");
  const [newAccAttractionName, setNewAccAttractionName] = useState("");
  const [newAccAttractionDist, setNewAccAttractionDist] = useState("");
  const [newAccRestName, setNewAccRestName] = useState("");
  const [newAccRestDist, setNewAccRestDist] = useState("");
  const [newAccPhotoUrl, setNewAccPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.url) {
        setNewAcc((prev) => ({ ...prev, photos: [...prev.photos, data.url] }));
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      alert("Error uploading file");
    } finally {
      setUploadingPhoto(false);
    }
  };

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
      ratingScore: acc.ratingScore || 4.5,
      ratingLabel: acc.ratingLabel || "Very Good",
      facilities: acc.facilities || [],
      nearbyAttractions: acc.nearbyAttractions || [],
      nearbyRestaurants: acc.nearbyRestaurants || [],
      photos: acc.photos || [],
    });
    setEditingAccIndex(idx);
  };

  const addAcc = () => {
    if (!newAcc.hotelName || !newAcc.location || !newAcc.checkInDate || !newAcc.checkOutDate) {
      alert("Check-in, Check-out, Hotel Name, and Location are required to add stay.");
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
    // Reset state
    setNewAcc({
      location: "",
      checkInDate: "",
      checkOutDate: "",
      hotelName: "",
      starRating: 4,
      roomType: "",
      mealPlan: "",
      ratingScore: 4.5,
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
  const [newFlight, setNewFlight] = useState<{
    sector: string;
    airline: string;
    departureDateTime: string;
    arrivalDateTime: string;
    durationText: string;
    stops: number;
    layoverInfo: string;
    carryOnBaggageKg: number | null;
    checkInBaggageKg: number | null;
    cancellationPolicy: string;
    flightNotes: string;
  }>({
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
      carryOnBaggageKg: f.carryOnBaggageKg,
      checkInBaggageKg: f.checkInBaggageKg,
      cancellationPolicy: f.cancellationPolicy || "",
      flightNotes: f.flightNotes || "",
    });
    setEditingFlightIndex(idx);
  };

  const addFlight = () => {
    if (!newFlight.sector || !newFlight.airline || !newFlight.departureDateTime || !newFlight.arrivalDateTime) {
      alert("Flight Sector, Airline, and Timings are required.");
      return;
    }
    setFormData((prev: any) => {
      const list = [...prev.flightDetails];
      if (editingFlightIndex !== null) {
        list[editingFlightIndex] = newFlight;
      } else {
        list.push(newFlight);
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
    });
  };

  const removeFlight = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      flightDetails: prev.flightDetails.filter((_: any, i: number) => i !== index),
    }));
  };

  // Step 6: Addons
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
    } catch(e) {}
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

  // Step 7: Restaurants Suggestions
  const [newRest, setNewRest] = useState({
    location: "",
    cuisineType: "International",
    name: "",
    rating: 4.5,
    reviewCount: 150,
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
      reviewCount: rest.reviewCount || 150,
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
      cuisineType: "International",
      name: "",
      rating: 4.5,
      reviewCount: 150,
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

  // Render Form Steps
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#0DA590]">Step 1: Core Trip & Consultant Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Itinerary Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-[#1E3B39] placeholder-zinc-400 focus:outline-none focus:ring-2 ${isFieldEmpty("title") ? "border-red-350 focus:ring-red-500/50 focus:border-red-500" : "border-zinc-200 focus:ring-[#0DA590]/50 focus:border-[#0DA590]"}`}
                  placeholder="e.g. TripCraft Bali Getaway"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Main Tour Planner Image</label>
                <div className="flex items-center space-x-4">
                  {formData.coverImage ? (
                    <div className="relative h-24 w-40 rounded-xl overflow-hidden group border border-zinc-200 shadow-sm bg-zinc-50">
                      <img src={formData.coverImage} alt="Cover Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData((prev: any) => ({ ...prev, coverImage: null }))}
                        className="absolute inset-0 bg-red-650/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold cursor-pointer"
                      >
                        Remove
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
                          className="w-full text-xs text-zinc-550 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0DA590]/10 file:text-[#0DA590] file:hover:bg-[#0DA590]/20 file:cursor-pointer disabled:opacity-50"
                        />
                        {uploadingCover && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-xs text-zinc-500">
                            <Loader2 className="animate-spin h-3.5 w-3.5 mr-1 text-[#0DA590]" /> uploading...
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Destination Country/City</label>
                <input
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-[#1E3B39] placeholder-zinc-400 focus:outline-none focus:ring-2 ${isFieldEmpty("destination") ? "border-red-355 focus:ring-red-500/50 focus:border-red-500" : "border-zinc-200 focus:ring-[#0DA590]/50 focus:border-[#0DA590]"}`}
                  placeholder="e.g. Bali, Indonesia"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Departure City</label>
                <input
                  type="text"
                  name="departureCity"
                  value={formData.departureCity}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-[#1E3B39] placeholder-zinc-400 focus:outline-none focus:ring-2 ${isFieldEmpty("departureCity") ? "border-red-350 focus:ring-red-500/50 focus:border-red-500" : "border-zinc-200 focus:ring-[#0DA590]/50 focus:border-[#0DA590]"}`}
                  placeholder="e.g. Ahmedabad (AMD)"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-[#1E3B39] focus:outline-none focus:ring-2 ${isFieldEmpty("startDate") ? "border-red-350 focus:ring-red-500/50 focus:border-red-500" : "border-zinc-200 focus:ring-[#0DA590]/50 focus:border-[#0DA590]"}`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-[#1E3B39] focus:outline-none focus:ring-2 ${isFieldEmpty("endDate") ? "border-red-350 focus:ring-red-500/50 focus:border-red-500" : "border-zinc-200 focus:ring-[#0DA590]/50 focus:border-[#0DA590]"}`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Duration Days</label>
                <input
                  type="number"
                  name="durationDays"
                  value={formData.durationDays}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-[#1E3B39] focus:outline-none focus:ring-2 focus:ring-[#0DA590]"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Duration Nights</label>
                <input
                  type="number"
                  name="durationNights"
                  value={formData.durationNights}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-[#1E3B39] focus:outline-none focus:ring-2 focus:ring-[#0DA590]"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Number of Travellers</label>
                <input
                  type="number"
                  name="numTravellers"
                  value={formData.numTravellers}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-[#1E3B39] focus:outline-none focus:ring-2 focus:ring-[#0DA590]"
                  min="1"
                />
              </div>

              <div className="hidden">
                {/* Reserved spacing / layout */}
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Consultant Name</label>
                <input
                  type="text"
                  name="consultantName"
                  value={formData.consultantName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-[#1E3B39] placeholder-zinc-400 focus:outline-none focus:ring-2 ${isFieldEmpty("consultantName") ? "border-red-350 focus:ring-red-500/50 focus:border-red-500" : "border-zinc-200 focus:ring-[#0DA590]/50 focus:border-[#0DA590]"}`}
                  placeholder="e.g. Akshar Patel"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Consultant Contact Phone</label>
                <input
                  type="text"
                  name="consultantPhone"
                  value={formData.consultantPhone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-[#1E3B39] placeholder-zinc-400 focus:outline-none focus:ring-2 ${isFieldEmpty("consultantPhone") ? "border-red-350 focus:ring-red-500/50 focus:border-red-500" : "border-zinc-200 focus:ring-[#0DA590]/50 focus:border-[#0DA590]"}`}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#0DA590]">Step 2: Price Quotes & Financials</h2>
            
            {/* Price Quote Items builder */}
            <div className="bg-zinc-50 border border-zinc-200/80 p-5 rounded-2xl">
              <h3 className="text-md font-bold mb-4 text-[#1E3B39]">Price Inclusions Breakdown</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Pricing Label (e.g. Hotels, Flights, Ground Transfers)</label>
                  <input
                    type="text"
                    value={newPriceLabel}
                    onChange={(e) => setNewPriceLabel(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-[#1E3B39] focus:outline-none focus:ring-2 focus:ring-[#0DA590]"
                    placeholder="e.g. Premium Hotels & Stays"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Amount (INR)</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={newPriceAmt}
                      onChange={(e) => setNewPriceAmt(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-[#1E3B39] focus:outline-none focus:ring-2 focus:ring-[#0DA590]"
                      placeholder="e.g. 75000"
                    />
                    <button
                      type="button"
                      onClick={addPriceItem}
                      className="p-2.5 bg-[#0DA590] hover:bg-[#0b8e7c] text-white rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {formData.priceQuoteItems.length === 0 ? (
                <p className="text-xs text-zinc-400 py-3 text-center">No price items added. Please add at least one.</p>
              ) : (
                <div className="border border-zinc-200 rounded-xl overflow-hidden mt-4 bg-white shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-650 border-b border-zinc-200">
                      <tr>
                        <th className="p-3">Label</th>
                        <th className="p-3 text-right">Amount (INR)</th>
                        <th className="p-3 text-center w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150 text-[#1E3B39]">
                      {formData.priceQuoteItems.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-50/50">
                          <td className="p-3 font-semibold">{item.label}</td>
                          <td className="p-3 text-right font-bold text-[#1E3B39]">₹{item.amount.toLocaleString("en-IN")}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removePriceItem(idx)}
                              className="text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* TCS Calculation summary */}
            <div className="bg-zinc-50 border border-zinc-200/80 p-5 rounded-2xl space-y-4">
              <h3 className="text-md font-bold text-[#1E3B39]">Automatic TCS & Financials Invoice</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1.5">TCS Percentage (%)</label>
                  <input
                    type="number"
                    value={formData.tripFinancials?.tcsPercentage}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData((prev: any) => ({
                        ...prev,
                        tripFinancials: { ...prev.tripFinancials, tcsPercentage: val },
                      }));
                    }}
                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-[#1E3B39] focus:outline-none focus:ring-2 focus:ring-[#0DA590]"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-500 mb-1.5">Computed TCS Amount</label>
                  <div className="px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-650 font-bold shadow-sm">
                    ₹{formData.tripFinancials?.tcsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-500 mb-1.5">Grand Total (with TCS)</label>
                  <div className="px-4 py-2.5 bg-[#0DA590]/10 border border-[#0DA590]/20 rounded-xl text-[#0DA590] font-black shadow-sm">
                    ₹{formData.tripFinancials?.totalWithTcs.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Additional Financial Notes</label>
                <RichTextEditor
                  value={formData.tripFinancials?.notes || ""}
                  onChange={(val) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      tripFinancials: { ...prev.tripFinancials, notes: val },
                    }));
                  }}
                  placeholder="e.g. *TCS is refundable during tax returns. Flights are dynamic and calculated at time of payment."
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="border-b border-zinc-200 pb-2">
              <h2 className="text-xl font-bold text-[#0DA590]">Step 3: Day-by-Day Itinerary Builder</h2>
            </div>

            {formData.itineraryDays.length === 0 ? (
              <div className="py-12 border border-zinc-200 border-dashed rounded-2xl text-center bg-white shadow-sm">
                <p className="text-zinc-400 text-sm mb-4">No days configured. Click "Add Day" below to start building.</p>
                <button
                  type="button"
                  onClick={addDay}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#0DA590] hover:bg-[#0b8e7c] text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Day</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {formData.itineraryDays.map((day: any, idx: number) => {
                  const loveKey = `${idx}-customerLovedTips`;
                  const watchKey = `${idx}-customerWatchOutTips`;
                  const incKey = `${idx}-inclusions`;
                  const excKey = `${idx}-exclusions`;

                  return (
                    <div 
                      key={idx} 
                      className="bg-zinc-50 border border-zinc-200/80 p-6 rounded-2xl space-y-4 relative shadow-sm"
                    >
                      {/* Day Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-3 gap-2">
                        <div className="flex items-center space-x-3">
                          <span className="h-7 w-7 bg-[#0DA590] text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                            {day.dayNumber}
                          </span>
                          <h3 className="font-extrabold text-lg text-[#1E3B39]">Day {day.dayNumber}</h3>
                        </div>

                        {/* Order & Remove actions */}
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => moveDay(idx, "up")}
                            disabled={idx === 0}
                            className="p-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded text-[#1E3B39] disabled:opacity-30 shadow-sm cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDay(idx, "down")}
                            disabled={idx === formData.itineraryDays.length - 1}
                            className="p-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded text-[#1E3B39] disabled:opacity-30 shadow-sm cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDay(idx)}
                            className="p-1.5 bg-red-50 border border-red-100 hover:bg-red-100 rounded text-red-600 ml-2 shadow-sm cursor-pointer"
                            title="Delete Day"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Day fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 mb-1">City or Stay Location</label>
                          <input
                            type="text"
                            value={day.cityOrStay}
                            onChange={(e) => updateDayField(idx, "cityOrStay", e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-[#1E3B39] focus:outline-none focus:ring-1 focus:ring-[#0DA590]"
                            placeholder="e.g. Kuta / Ubud"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-zinc-500 mb-1">Day Theme/Title</label>
                          <input
                            type="text"
                            value={day.title}
                            onChange={(e) => updateDayField(idx, "title", e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-[#1E3B39] focus:outline-none focus:ring-1 focus:ring-[#0DA590]"
                            placeholder="e.g. Arrival & Traditional Kecak Dance"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Duration (Hours - optional)</label>
                        <input
                          type="number"
                          value={day.durationHours === null ? "" : day.durationHours}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : Number(e.target.value);
                            updateDayField(idx, "durationHours", val);
                          }}
                          className="w-32 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-[#1E3B39] focus:outline-none focus:ring-1 focus:ring-[#0DA590]"
                          placeholder="e.g. 5"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Day Description</label>
                        <RichTextEditor
                          value={day.description}
                          onChange={(val) => updateDayField(idx, "description", val)}
                          placeholder="Detail the day's itinerary, sightseeing checkpoints, and driving paths."
                        />
                      </div>

                      {/* Tag Inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* Day Inclusions */}
                        <div className="bg-white p-4 border border-zinc-200 rounded-xl space-y-2 shadow-sm">
                          <label className="block text-xs font-bold text-emerald-600">Day Specific Inclusions</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={dayInputTags[incKey] || ""}
                              onChange={(e) => setDayInputTags({ ...dayInputTags, [incKey]: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddDayTag(idx, "inclusions"); } }}
                              className="w-full px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs text-[#1E3B39]"
                              placeholder="e.g. Private Cab pickup"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddDayTag(idx, "inclusions")}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {day.inclusions?.map((tag: string, tIdx: number) => (
                              <span key={tIdx} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                {tag}
                                <button type="button" onClick={() => handleRemoveDayTag(idx, "inclusions", tIdx)} className="ml-1 text-emerald-500 hover:text-emerald-700 cursor-pointer">
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Day Exclusions */}
                        <div className="bg-white p-4 border border-zinc-200 rounded-xl space-y-2 shadow-sm">
                          <label className="block text-xs font-bold text-red-600">Day Specific Exclusions</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={dayInputTags[excKey] || ""}
                              onChange={(e) => setDayInputTags({ ...dayInputTags, [excKey]: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddDayTag(idx, "exclusions"); } }}
                              className="w-full px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs text-[#1E3B39]"
                              placeholder="e.g. Lunch fees"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddDayTag(idx, "exclusions")}
                              className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {day.exclusions?.map((tag: string, tIdx: number) => (
                              <span key={tIdx} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-sm bg-red-50 text-red-700 border border-red-200 font-medium">
                                {tag}
                                <button type="button" onClick={() => handleRemoveDayTag(idx, "exclusions", tIdx)} className="ml-1 text-red-500 hover:text-red-700 cursor-pointer">
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Loved tips */}
                        <div className="bg-white p-4 border border-zinc-200 rounded-xl space-y-2 shadow-sm">
                          <label className="block text-xs font-bold text-violet-600">What Customers Love Tips</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={dayInputTags[loveKey] || ""}
                              onChange={(e) => setDayInputTags({ ...dayInputTags, [loveKey]: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddDayTag(idx, "customerLovedTips"); } }}
                              className="w-full px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs text-[#1E3B39]"
                              placeholder="e.g. Sunrise view is spectacular"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddDayTag(idx, "customerLovedTips")}
                              className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-bold cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {day.customerLovedTips?.map((tag: string, tIdx: number) => (
                              <span key={tIdx} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-sm bg-violet-50 text-violet-750 border border-violet-200 font-medium">
                                {tag}
                                <button type="button" onClick={() => handleRemoveDayTag(idx, "customerLovedTips", tIdx)} className="ml-1 text-violet-500 hover:text-violet-750 cursor-pointer">
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Watch out tips */}
                        <div className="bg-white p-4 border border-zinc-200 rounded-xl space-y-2 shadow-sm">
                          <label className="block text-xs font-bold text-amber-600">Customer Watch-out Tips</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={dayInputTags[watchKey] || ""}
                              onChange={(e) => setDayInputTags({ ...dayInputTags, [watchKey]: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddDayTag(idx, "customerWatchOutTips"); } }}
                              className="w-full px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs text-[#1E3B39]"
                              placeholder="e.g. Watch out for monkey pickpockets"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddDayTag(idx, "customerWatchOutTips")}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {day.customerWatchOutTips?.map((tag: string, tIdx: number) => (
                              <span key={tIdx} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-sm bg-amber-50 text-amber-750 border border-amber-200 font-medium">
                                {tag}
                                <button type="button" onClick={() => handleRemoveDayTag(idx, "customerWatchOutTips", tIdx)} className="ml-1 text-amber-500 hover:text-amber-700 cursor-pointer">
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Add Day Button at the bottom of the list */}
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={addDay}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#0DA590] hover:bg-[#0b8e7c] text-xs font-bold text-white shadow-md shadow-[#0DA590]/15 hover:shadow-[#0DA590]/35 transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Itinerary Day</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#0DA590]">Step 4: Stays & Accommodations</h2>
            
            {/* Stay Creator Form */}
            <div className="bg-zinc-50 border border-zinc-200/80 p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-md font-bold text-[#1E3B39]">Add Accommodations Stay</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Hotel Location/City</label>
                  <input
                    type="text"
                    value={newAcc.location}
                    onChange={(e) => setNewAcc({ ...newAcc, location: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-[#1E3B39] focus:outline-none"
                    placeholder="e.g. Ubud Stay"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Hotel Name</label>
                  <input
                    type="text"
                    value={newAcc.hotelName}
                    onChange={(e) => setNewAcc({ ...newAcc, hotelName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-[#1E3B39] focus:outline-none"
                    placeholder="e.g. Maya Ubud Resort & Spa"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Check-in Date</label>
                  <input
                    type="date"
                    value={newAcc.checkInDate}
                    onChange={(e) => setNewAcc({ ...newAcc, checkInDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-[#1E3B39] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Check-out Date</label>
                  <input
                    type="date"
                    value={newAcc.checkOutDate}
                    onChange={(e) => setNewAcc({ ...newAcc, checkOutDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-[#1E3B39] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Hotel Star Rating</label>
                  <select
                    value={newAcc.starRating}
                    onChange={(e) => setNewAcc({ ...newAcc, starRating: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-[#1E3B39] focus:outline-none"
                  >
                    <option value={5}>5-Star Luxury</option>
                    <option value={4}>4-Star Premium</option>
                    <option value={3}>3-Star Standard</option>
                    <option value={2}>2-Star Budget</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Room Type</label>
                  <input
                    type="text"
                    value={newAcc.roomType}
                    onChange={(e) => setNewAcc({ ...newAcc, roomType: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-[#1E3B39] focus:outline-none"
                    placeholder="e.g. Deluxe Garden Pool Villa"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Meal Plan</label>
                  <input
                    type="text"
                    value={newAcc.mealPlan}
                    onChange={(e) => setNewAcc({ ...newAcc, mealPlan: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-[#1E3B39] focus:outline-none"
                    placeholder="e.g. CP (Breakfast Only)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Guest Score & Label</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={newAcc.ratingScore || ""}
                      onChange={(e) => setNewAcc({ ...newAcc, ratingScore: Number(e.target.value) })}
                      className="w-1/2 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-[#1E3B39] focus:outline-none"
                      placeholder="e.g. 4.7"
                      step="0.1"
                      min="0"
                      max="5"
                    />
                    <input
                      type="text"
                      value={newAcc.ratingLabel || ""}
                      onChange={(e) => setNewAcc({ ...newAcc, ratingLabel: e.target.value })}
                      className="w-1/2 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-[#1E3B39] focus:outline-none"
                      placeholder="e.g. Superb"
                    />
                  </div>
                </div>
              </div>

              {/* Photo uploader */}
              <div className="border-t border-zinc-200 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Local Image File Upload</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0DA590]/10 file:text-[#0DA590] file:hover:bg-[#0DA590]/20 file:cursor-pointer disabled:opacity-50"
                    />
                    {uploadingPhoto && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-xs text-zinc-500">
                        <Loader2 className="animate-spin h-3.5 w-3.5 mr-1 text-[#0DA590]" /> uploading...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Added photos grid */}
              {newAcc.photos.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-zinc-400 font-medium">Added Photos ({newAcc.photos.length})</p>
                  <div className="grid grid-cols-5 gap-2 bg-zinc-100 p-2 border border-zinc-200 rounded-xl">
                    {newAcc.photos.map((url, pIdx) => (
                      <div key={pIdx} className="relative aspect-video bg-zinc-100 rounded-md overflow-hidden group">
                        <img src={url} alt="Stay Preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewAcc((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== pIdx) }))}
                          className="absolute inset-0 bg-red-650/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Facilities / Attractions / Restaurants builders */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-200 pt-4">
                {/* Facilities */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Hotel Facilities</label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={newAccFacility}
                      onChange={(e) => setNewAccFacility(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                      placeholder="e.g. Free Wi-Fi"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newAccFacility.trim()) {
                          setNewAcc((prev) => ({ ...prev, facilities: [...prev.facilities, newAccFacility.trim()] }));
                          setNewAccFacility("");
                        }
                      }}
                      className="px-2 bg-zinc-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {newAcc.facilities.map((fac, fIdx) => (
                      <span key={fIdx} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 border border-zinc-300">
                        {fac}
                        <button type="button" onClick={() => setNewAcc((prev) => ({ ...prev, facilities: prev.facilities.filter((_, i) => i !== fIdx) }))} className="ml-1 text-zinc-400 hover:text-zinc-650 cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Attractions */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Nearby Attractions</label>
                  <div className="space-y-1.5 mb-2">
                    <input
                      type="text"
                      value={newAccAttractionName}
                      onChange={(e) => setNewAccAttractionName(e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-zinc-200 rounded text-xs"
                      placeholder="e.g. Sacred Monkey Forest"
                    />
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        value={newAccAttractionDist}
                        onChange={(e) => setNewAccAttractionDist(e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-zinc-200 rounded text-xs"
                        placeholder="Dist (km)"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newAccAttractionName.trim() && newAccAttractionDist) {
                            setNewAcc((prev) => ({
                              ...prev,
                              nearbyAttractions: [...prev.nearbyAttractions, { name: newAccAttractionName.trim(), distanceKm: Number(newAccAttractionDist) }],
                            }));
                            setNewAccAttractionName("");
                            setNewAccAttractionDist("");
                          }
                        }}
                        className="px-2 bg-zinc-800 text-white rounded-xs text-xs font-bold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {newAcc.nearbyAttractions.map((att, aIdx) => (
                      <div key={aIdx} className="flex justify-between items-center text-[10px] bg-zinc-100 p-1 border border-zinc-200 rounded text-zinc-600">
                        <span>{att.name} ({att.distanceKm} km)</span>
                        <button type="button" onClick={() => setNewAcc((prev) => ({ ...prev, nearbyAttractions: prev.nearbyAttractions.filter((_, i) => i !== aIdx) }))} className="text-zinc-400 hover:text-zinc-650 cursor-pointer">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Restaurants */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Nearby Restaurants</label>
                  <div className="space-y-1.5 mb-2">
                    <input
                      type="text"
                      value={newAccRestName}
                      onChange={(e) => setNewAccRestName(e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-zinc-200 rounded text-xs"
                      placeholder="e.g. Queen's Tandoor"
                    />
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newAccRestDist}
                        onChange={(e) => setNewAccRestDist(e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-zinc-200 rounded text-xs"
                        placeholder="Dist (e.g. 5m walk)"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newAccRestName.trim() && newAccRestDist.trim()) {
                            setNewAcc((prev) => ({
                              ...prev,
                              nearbyRestaurants: [...prev.nearbyRestaurants, { name: newAccRestName.trim(), distance: newAccRestDist.trim() }],
                            }));
                            setNewAccRestName("");
                            setNewAccRestDist("");
                          }
                        }}
                        className="px-2 bg-zinc-800 text-white rounded text-xs font-bold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {newAcc.nearbyRestaurants.map((rest, rIdx) => (
                      <div key={rIdx} className="flex justify-between items-center text-[10px] bg-zinc-100 p-1 border border-zinc-200 rounded text-zinc-600">
                        <span>{rest.name} ({rest.distance})</span>
                        <button type="button" onClick={() => setNewAcc((prev) => ({ ...prev, nearbyRestaurants: prev.nearbyRestaurants.filter((_, i) => i !== rIdx) }))} className="text-zinc-400 hover:text-zinc-650 cursor-pointer">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Stay */}
              <button
                type="button"
                onClick={addAcc}
                className="w-full py-2.5 bg-[#0DA590] hover:bg-[#0b8e7c] text-white rounded-xl text-xs font-bold mt-4 shadow-sm transition-colors cursor-pointer"
              >
                {editingAccIndex !== null ? "Update Stay" : "Save Stay to Itinerary List"}
              </button>
            </div>

            {/* Configured stays list */}
            {formData.accommodations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-md font-bold text-zinc-700">Configured stays ({formData.accommodations.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.accommodations.map((acc: any, idx: number) => (
                    <div key={idx} className="bg-white border border-zinc-200 p-4 rounded-xl flex justify-between items-start shadow-sm">
                      <div>
                        <p className="text-xs text-[#0DA590] font-bold">{acc.location}</p>
                        <h4 className="font-extrabold text-[#1E3B39] text-sm">{acc.hotelName} ({acc.starRating}★)</h4>
                        <p className="text-xs text-zinc-550">{acc.roomType} | {acc.mealPlan}</p>
                        <p className="text-[10px] text-zinc-400 mt-1">Stays: {acc.checkInDate} to {acc.checkOutDate}</p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => startEditAcc(idx)}
                          className="text-zinc-500 hover:text-zinc-700 p-1 cursor-pointer"
                          title="Edit Stay"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAcc(idx)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Remove Stay"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#0DA590]">Step 5: Flight Details</h2>
            
            {/* Flight segment creator */}
            <div className="bg-zinc-50 border border-zinc-200/80 p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-md font-bold text-[#1E3B39]">Add Flight Detail Segment</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Sector (e.g. AMD to DPS)</label>
                  <input
                    type="text"
                    value={newFlight.sector}
                    onChange={(e) => setNewFlight({ ...newFlight, sector: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                    placeholder="e.g. AMD to DPS"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Airline & Flight Code</label>
                  <input
                    type="text"
                    value={newFlight.airline}
                    onChange={(e) => setNewFlight({ ...newFlight, airline: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                    placeholder="e.g. VietJet Air VJ-896"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Stops</label>
                  <input
                    type="number"
                    value={newFlight.stops}
                    onChange={(e) => setNewFlight({ ...newFlight, stops: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Departure Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newFlight.departureDateTime}
                    onChange={(e) => setNewFlight({ ...newFlight, departureDateTime: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Arrival Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newFlight.arrivalDateTime}
                    onChange={(e) => setNewFlight({ ...newFlight, arrivalDateTime: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Total Duration</label>
                  <input
                    type="text"
                    value={newFlight.durationText}
                    onChange={(e) => setNewFlight({ ...newFlight, durationText: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                    placeholder="e.g. 5h 45m"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Layover Info (e.g. 2h in SGN)</label>
                  <input
                    type="text"
                    value={newFlight.layoverInfo}
                    onChange={(e) => setNewFlight({ ...newFlight, layoverInfo: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                    placeholder="e.g. 2 Hours in Singapore (SIN)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Cabin baggage (kg)</label>
                  <input
                    type="number"
                    value={newFlight.carryOnBaggageKg === null ? "" : newFlight.carryOnBaggageKg}
                    onChange={(e) => setNewFlight({ ...newFlight, carryOnBaggageKg: e.target.value === "" ? null : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                    placeholder="e.g. 7"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Check-in baggage (kg)</label>
                  <input
                    type="number"
                    value={newFlight.checkInBaggageKg === null ? "" : newFlight.checkInBaggageKg}
                    onChange={(e) => setNewFlight({ ...newFlight, checkInBaggageKg: e.target.value === "" ? null : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                    placeholder="e.g. 20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Cancellation/Refund Policy</label>
                <RichTextEditor
                  value={newFlight.cancellationPolicy || ""}
                  onChange={(val) => setNewFlight({ ...newFlight, cancellationPolicy: val })}
                  placeholder="e.g. Non-refundable. Date change allowed with fee."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Flight Notes</label>
                <textarea
                  value={newFlight.flightNotes}
                  onChange={(e) => setNewFlight({ ...newFlight, flightNotes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none placeholder-zinc-400"
                  placeholder="e.g. Please verify seat numbers 24 hours prior; food is included."
                />
              </div>

              <button
                type="button"
                onClick={addFlight}
                className="w-full py-2 bg-[#0DA590] hover:bg-[#0b8e7c] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                {editingFlightIndex !== null ? "Update Flight Segment" : "Add Flight Segment"}
              </button>
            </div>

            {/* Flight list */}
            {formData.flightDetails.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-md font-bold text-zinc-700">Scheduled Flight segments ({formData.flightDetails.length})</h3>
                <div className="grid grid-cols-1 gap-4">
                  {formData.flightDetails.map((f: any, idx: number) => (
                    <div key={idx} className="bg-white border border-zinc-200 p-4 rounded-xl flex justify-between items-start shadow-sm">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-zinc-650 w-full">
                        <div>
                          <p className="text-zinc-400 font-bold uppercase">Sector</p>
                          <p className="font-extrabold text-[#1E3B39] text-sm">{f.sector}</p>
                          {f.flightNotes && <p className="text-[10px] text-zinc-500 mt-1 italic font-medium">Note: {f.flightNotes}</p>}
                        </div>
                        <div>
                          <p className="text-zinc-400 font-bold uppercase">Airline</p>
                          <p className="font-semibold text-zinc-700">{f.airline}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400 font-bold uppercase">Departs / Arrives</p>
                          <p className="truncate text-zinc-600">{f.departureDateTime} &rarr; {f.arrivalDateTime}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400 font-bold uppercase">Baggage Limits</p>
                          <p className="text-zinc-650">Cabin: {f.carryOnBaggageKg}kg | Cargo: {f.checkInBaggageKg}kg</p>
                        </div>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <button
                          type="button"
                          onClick={() => startEditFlight(idx)}
                          className="text-zinc-500 hover:text-zinc-700 p-1 cursor-pointer"
                          title="Edit Flight"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFlight(idx)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Remove Flight"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#0DA590]">Step 6: Optional Add-ons & Visa</h2>
            
            {/* Addon Form */}
            <div className="bg-zinc-50 border border-zinc-200/80 p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-md font-bold text-[#1E3B39]">Add Optional Extra / Visa</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Add-on Name</label>
                  <input
                    type="text"
                    value={newAddOn.name}
                    onChange={(e) => setNewAddOn({ ...newAddOn, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                    placeholder="e.g. Visa on Arrival (VoA)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Visa Type (Optional)</label>
                  <input
                    type="text"
                    value={newAddOn.visaType}
                    onChange={(e) => setNewAddOn({ ...newAddOn, visaType: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                    placeholder="e.g. Tourist E-VoA"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Validity length (Optional)</label>
                  <input
                    type="text"
                    value={newAddOn.length}
                    onChange={(e) => setNewAddOn({ ...newAddOn, length: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                    placeholder="e.g. 30 Days"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Validity window (Optional)</label>
                  <input
                    type="text"
                    value={newAddOn.validity}
                    onChange={(e) => setNewAddOn({ ...newAddOn, validity: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                    placeholder="e.g. Valid for 90 days from issue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Add-on Price (INR)</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={newAddOn.price}
                      onChange={(e) => setNewAddOn({ ...newAddOn, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                      placeholder="e.g. 3500"
                    />
                    <select
                      value={newAddOn.priceType}
                      onChange={(e) => setNewAddOn({ ...newAddOn, priceType: e.target.value })}
                      className="bg-white border border-zinc-200 rounded-lg text-xs px-2 focus:outline-none"
                    >
                      <option value="per person">Per Person</option>
                      <option value="per group">Per Group</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Details description</label>
                <RichTextEditor
                  value={newAddOn.details || ""}
                  onChange={(val) => setNewAddOn({ ...newAddOn, details: val })}
                  placeholder="Additional terms or features of this addon..."
                />
              </div>

              <button
                type="button"
                onClick={addAddOn}
                className="w-full py-2 bg-[#0DA590] hover:bg-[#0b8e7c] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                {editingAddOnIndex !== null ? "Update Add-on" : "Add Add-on"}
              </button>
            </div>

            {/* Addon list */}
            {formData.addOns.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-md font-bold text-zinc-705">Configured Add-ons ({formData.addOns.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.addOns.map((addon: any, idx: number) => (
                    <div key={idx} className="bg-white border border-zinc-200 p-4 rounded-xl flex justify-between items-start shadow-sm">
                      <div>
                        <h4 className="font-bold text-[#1E3B39] text-sm">{addon.name}</h4>
                        {addon.detailsJson?.visaType && <p className="text-xs text-zinc-500">Visa: {addon.detailsJson.visaType} ({addon.detailsJson.length})</p>}
                        {addon.detailsJson?.details && <p className="text-xs text-zinc-400 mt-1">{addon.detailsJson.details}</p>}
                        <p className="text-xs text-[#0DA590] font-bold mt-1.5">₹{addon.price.toLocaleString("en-IN")} {addon.priceType}</p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => startEditAddOn(idx)}
                          className="text-zinc-500 hover:text-zinc-700 p-1 cursor-pointer"
                          title="Edit Add-on"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAddOn(idx)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Remove Add-on"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}`
                </div>
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#0DA590]">Step 7: Restaurant & Club Suggestions</h2>
            
            {/* Dining builder */}
            <div className="bg-zinc-50 border border-zinc-200/80 p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-md font-bold text-[#1E3B39]">Add Dining Recommendation</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Location Area</label>
                  <input
                    type="text"
                    value={newRest.location}
                    onChange={(e) => setNewRest({ ...newRest, location: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                    placeholder="e.g. Ubud Center"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Restaurant Name</label>
                  <input
                    type="text"
                    value={newRest.name}
                    onChange={(e) => setNewRest({ ...newRest, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                    placeholder="e.g. Queen's Tandoor Seminyak"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Cuisine Type</label>
                  <select
                    value={newRest.cuisineType}
                    onChange={(e) => setNewRest({ ...newRest, cuisineType: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="Indian">Indian / Vegetarian</option>
                    <option value="Local">Local Balinese / Indonesian</option>
                    <option value="International">International / Italian / Cafe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Category Type</label>
                  <select
                    value={newRest.category}
                    onChange={(e) => setNewRest({ ...newRest, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="Restaurant">Fine Dining Restaurant</option>
                    <option value="Beach Club">Beach Club / Day Bar</option>
                    <option value="Night Club">Night Club / Dance Floor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Star rating / Reviews Count</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={newRest.rating || ""}
                      onChange={(e) => setNewRest({ ...newRest, rating: Number(e.target.value) })}
                      className="w-1/2 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                      step="0.1"
                      min="0"
                      max="5"
                    />
                    <input
                      type="number"
                      value={newRest.reviewCount || ""}
                      onChange={(e) => setNewRest({ ...newRest, reviewCount: Number(e.target.value) })}
                      className="w-1/2 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none"
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-white p-3 border border-zinc-200 rounded-xl shadow-sm">
                <input
                  type="checkbox"
                  id="isVeg"
                  checked={newRest.isVeg}
                  onChange={(e) => setNewRest({ ...newRest, isVeg: e.target.checked })}
                  className="rounded border-zinc-305 text-[#0DA590] focus:ring-[#0DA590] h-4 w-4 bg-white"
                />
                <label htmlFor="isVeg" className="text-xs font-bold text-emerald-600">
                  Offers Pure Veg / Jain Food Options
                </label>
              </div>

              <button
                type="button"
                onClick={addRest}
                className="w-full py-2 bg-[#0DA590] hover:bg-[#0b8e7c] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                {editingRestIndex !== null ? "Update Suggestion" : "Add Suggestion"}
              </button>
            </div>

            {/* Dining lists */}
            {formData.restaurantSuggestions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-md font-bold text-zinc-700">Dining recommendations ({formData.restaurantSuggestions.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.restaurantSuggestions.map((rest: any, idx: number) => (
                    <div key={idx} className="bg-white border border-zinc-200 p-4 rounded-xl flex justify-between items-start shadow-sm">
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">{rest.category} | {rest.location}</p>
                        <h4 className="font-bold text-[#1E3B39] text-sm">{rest.name}</h4>
                        <p className="text-xs text-zinc-550">{rest.cuisineType} cuisine ({rest.rating}★ rating)</p>
                        {rest.isVeg && <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded bg-emerald-55 text-emerald-700 border border-emerald-200 font-bold">Pure Veg Options</span>}
                      </div>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => startEditRest(idx)}
                          className="text-zinc-500 hover:text-zinc-700 p-1 cursor-pointer"
                          title="Edit Suggestion"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRest(idx)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Remove Suggestion"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-200 pb-2 text-[#0DA590]">Step 8: Master Policies & Guidelines</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Payment Policy</label>
                <RichTextEditor
                  value={formData.tripTerms.paymentPolicy || ""}
                  onChange={(val) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      tripTerms: { ...prev.tripTerms, paymentPolicy: val },
                    }));
                  }}
                  placeholder="Specify standard booking fees, token payment requirements, and stage payment deadlines."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Cancellation Policy</label>
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
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Visa Rules & Travel Requirements</label>
                <RichTextEditor
                  value={formData.tripTerms.visaRules || ""}
                  onChange={(val) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      tripTerms: { ...prev.tripTerms, visaRules: val },
                    }));
                  }}
                  placeholder="Specify passport validity minimum duration, visa fees on arrival or online e-visa steps."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">General Notes & Advisory Rules</label>
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

      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FAF8F5] py-10 px-4 sm:px-6 lg:px-8 font-sans text-[#1E3B39]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(13,165,144,0.06),transparent_50%)] pointer-events-none" />

      <div className="max-w-5xl mx-auto">
        {/* Nav Header */}
        <div className="flex items-center justify-between mb-8 pb-5 border-b border-zinc-200">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center text-xs font-bold text-zinc-555 hover:text-[#1E3B39] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5 text-[#0DA590]" /> Back to Console
          </button>
          <span className="text-sm font-black text-[#0DA590]">
            {tripId ? "Edit Travel Plan" : "Create Master TripCraft"}
          </span>
        </div>

        {/* Form Validation Error Callout */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-bold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Step Indicators */}
          <div className="lg:col-span-1 space-y-2">
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sticky top-6 space-y-1 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-3 px-1">BUILDING STEPS</p>
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = step.number === currentStep;
                const isStep1IncompleteVal = step.number === 1 && isStep1Incomplete();
                const isCompleted = step.number < currentStep && !isStep1IncompleteVal;

                let buttonClasses = "text-zinc-450 hover:bg-zinc-50 cursor-pointer";
                if (isActive) {
                  buttonClasses = "bg-[#0DA590]/10 text-[#0DA590] font-bold border border-[#0DA590]/25 shadow-sm cursor-pointer";
                } else if (isStep1IncompleteVal) {
                  buttonClasses = "text-red-500 hover:bg-red-50/50 border border-red-200/40 shadow-sm cursor-pointer";
                } else if (isCompleted) {
                  buttonClasses = "text-emerald-650 hover:bg-zinc-50 cursor-pointer";
                }

                let indicatorClasses = "bg-zinc-50 border-zinc-200 text-zinc-500";
                if (isActive) {
                  indicatorClasses = "bg-[#0DA590]/20 border-[#0DA590]/35 text-[#0DA590]";
                } else if (isStep1IncompleteVal) {
                  indicatorClasses = "bg-red-50 border-red-300 text-red-600";
                } else if (isCompleted) {
                  indicatorClasses = "bg-emerald-50 border-emerald-200 text-emerald-600";
                }

                return (
                  <button
                    key={step.number}
                    type="button"
                    onClick={() => {
                      setCurrentStep(step.number);
                    }}
                    className={`w-full flex items-center space-x-3 p-2.5 rounded-xl text-left transition-all ${buttonClasses}`}
                  >
                    <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold border ${indicatorClasses}`}>
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
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xl">
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                {renderStepContent()}

                {/* Navigation Buttons */}
                {currentStep === 1 && isStep1Incomplete() && (
                  <div className="text-red-500 text-xs font-bold text-right mb-4">
                    ⚠️ Please fill in all required fields.
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-zinc-200 pt-6 mt-8">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="flex items-center px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-500 hover:text-zinc-800 disabled:opacity-30 disabled:pointer-events-none shadow-sm transition-all cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5 text-[#0DA590]" /> Previous
                  </button>

                  <div className="flex items-center space-x-2">
                    {currentStep === STEPS.length && tripId && (
                      <button
                        type="button"
                        onClick={handleExportPDF}
                        disabled={downloading}
                        className="flex items-center px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-[#1E3B39] hover:text-[#0DA590] hover:border-[#0DA590]/30 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {downloading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-1 text-[#0DA590]" />
                            <span>Exporting...</span>
                          </>
                        ) : (
                          <>
                            <FileDown className="h-4 w-4 mr-1 text-[#0DA590]" />
                            <span>Export PDF</span>
                          </>
                        )}
                      </button>
                    )}
                    
                    {currentStep < STEPS.length ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="flex items-center px-5 py-2.5 rounded-xl bg-[#0DA590] hover:bg-[#0b8e7c] text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
                      >
                        Next Step <ArrowRight className="h-4 w-4 ml-1.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center px-6 py-2.5 rounded-xl bg-[#0DA590] hover:bg-[#0b8e7c] text-xs font-bold text-white shadow-md disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4 mr-1.5" /> Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-1.5" /> Save Itinerary
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
