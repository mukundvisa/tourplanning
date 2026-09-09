import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getMasterPlaceDefaults } from "@/actions/master-data";
import { generateTripWithFallback } from "@/lib/ai/providers";

export const dynamic = "force-dynamic";

const DESTINATION_FALLBACK_IMG =
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1600&auto=format&fit=crop";

const HOTEL_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1200&auto=format&fit=crop",
];

const HOTEL_FALLBACK_IMG = HOTEL_FALLBACK_IMAGES[0];

export interface CategorizedHotelPhotos {
  front_exterior: string[];
  side_view: string[];
  interior_lobby: string[];
  room_types: { type: string; photos: string[] }[];
  bathroom: string[];
  facilities: { name: string; photos: string[] }[];
}

/**
 * AI TRIP BANNER GENERATOR
 */
async function generateAITripBanner(
  destination: string,
  highlights: string[] = [],
  places: string[] = [],
  theme: string = "curated travel"
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const keyPlaces = places.slice(0, 3).filter(Boolean);
  const placesSnippet = keyPlaces.length > 0 ? `showcasing iconic landmarks ${keyPlaces.join(", ")}` : "";
  const highlightSnippet = highlights.slice(0, 2).filter(Boolean).join(", ");

  const descriptivePrompt = `Award-winning National Geographic scenic travel photography of ${destination}${
    placesSnippet ? `, ${placesSnippet}` : ""
  }${
    highlightSnippet ? `, featuring ${highlightSnippet}` : ""
  }, ${theme} experience, panoramic wide-angle landscape, golden hour sunlight, dramatic scenery, cinematic 16:9 composition, 8k resolution, shot on 35mm lens, photorealistic ultra-high detail, professional travel brochure cover quality`;

  if (apiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const imagenRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: descriptivePrompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "16:9",
              outputMimeType: "image/jpeg",
              personGeneration: "allow_adult",
              safetySetting: "block_only_high",
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (imagenRes.ok) {
        const data = await imagenRes.json();
        const base64Bytes = data.predictions?.[0]?.bytesBase64Encoded;
        if (base64Bytes) {
          return `data:image/jpeg;base64,${base64Bytes}`;
        }
      }
    } catch (err: any) {
      console.warn("Imagen 3 banner generation attempt:", err?.message || err);
    }
  }

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    descriptivePrompt
  )}?width=1920&height=1080&nologo=true&enhance=true&model=flux`;
}

/**
 * Authentic Multi-Photo Fetcher for Hotels
 */
async function fetchPexelsHotelImages(
  query: string,
  count: number = 3
): Promise<string[]> {
  const pexelsApiKey = process.env.PEXELS_API_KEY;
  if (!pexelsApiKey || !pexelsApiKey.trim()) {
    return HOTEL_FALLBACK_IMAGES.slice(0, count);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}`,
      {
        headers: {
          Authorization: pexelsApiKey.trim(),
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      return HOTEL_FALLBACK_IMAGES.slice(0, count);
    }

    const data = await res.json();
    const photos: string[] = (data.photos || [])
      .map((p: any) => p.src?.large2x || p.src?.large || p.src?.original || p.src?.medium)
      .filter((url: any): url is string => Boolean(url));

    if (photos.length === 0) {
      return HOTEL_FALLBACK_IMAGES.slice(0, count);
    }

    let fallbackIdx = 0;
    while (photos.length < Math.min(count, 3) && fallbackIdx < HOTEL_FALLBACK_IMAGES.length) {
      const fb = HOTEL_FALLBACK_IMAGES[fallbackIdx];
      if (!photos.includes(fb)) photos.push(fb);
      fallbackIdx++;
    }

    return photos;
  } catch (err: any) {
    return HOTEL_FALLBACK_IMAGES.slice(0, count);
  }
}

/**
 * Categorized Hotel Photos Collector
 */
async function fetchCategorizedHotelPhotos(
  hotelName: string,
  destination: string,
  roomTypes: string[] = ["Deluxe Heritage Room", "Executive Suite"],
  facilities: string[] = ["Swimming Pool", "Spa & Wellness", "Restaurant"]
): Promise<{
  categorized: CategorizedHotelPhotos;
  allPhotos: string[];
}> {
  const [exterior, sideView, lobby, bathroom] = await Promise.all([
    fetchPexelsHotelImages(`${hotelName} ${destination} hotel building exterior facade`, 2),
    fetchPexelsHotelImages(`${hotelName} ${destination} hotel resort view architecture`, 2),
    fetchPexelsHotelImages(`${hotelName} ${destination} hotel luxury lobby reception interior`, 2),
    fetchPexelsHotelImages(`${hotelName} ${destination} luxury hotel bathroom shower vanity`, 2),
  ]);

  const roomTypesData = await Promise.all(
    roomTypes.slice(0, 3).map(async (rType) => ({
      type: rType,
      photos: await fetchPexelsHotelImages(`${hotelName} ${destination} ${rType} hotel bedroom suite`, 2),
    }))
  );

  const facilitiesData = await Promise.all(
    facilities.slice(0, 3).map(async (fac) => ({
      name: fac,
      photos: await fetchPexelsHotelImages(`${hotelName} ${destination} hotel ${fac} amenity`, 2),
    }))
  );

  const categorized: CategorizedHotelPhotos = {
    front_exterior: exterior,
    side_view: sideView,
    interior_lobby: lobby,
    room_types: roomTypesData,
    bathroom: bathroom,
    facilities: facilitiesData,
  };

  const allPhotos = Array.from(
    new Set([
      ...exterior,
      ...sideView,
      ...lobby,
      ...roomTypesData.flatMap((r) => r.photos),
      ...bathroom,
      ...facilitiesData.flatMap((f) => f.photos),
    ])
  );

  return { categorized, allPhotos: allPhotos.length > 0 ? allPhotos : HOTEL_FALLBACK_IMAGES };
}

interface GenerateTripRequest {
  prompt: string;
  mode?: "mode1" | "mode2" | "auto";
  chatHistory?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "admin-user";

    const rateLimit = checkRateLimit(clientIp, 30, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      const waitMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / (60 * 1000));
      return NextResponse.json(
        {
          status: "error",
          error: `Rate limit reached. Please try again in ${waitMinutes} minutes.`,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const body = (await req.json()) as GenerateTripRequest;
    const { prompt, mode = "auto", chatHistory = [] } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { status: "error", error: "Please enter a valid trip description or destination brief." },
        { status: 400 }
      );
    }

    const hasAnyApiKey = Boolean(
      process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY
    );

    if (!hasAnyApiKey) {
      return NextResponse.json(
        {
          status: "error",
          error:
            "No AI API keys configured. Please configure GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY in your environment (.env.local file).",
        },
        { status: 500 }
      );
    }

    // 2. Fetch CURRENT MASTER DATA from Database
    const [
      dbCities,
      dbConsultants,
      dbHotels,
      dbPlaces,
      dbRestaurants,
      dbFlightRoutes,
      dbAddOns,
      dbPolicyTemplate,
      dbTaxSetting,
      placeDefaultsRes,
      dbBanners,
    ] = await Promise.all([
      db.masterCity.findMany({ orderBy: { name: "asc" } }),
      db.masterConsultant.findMany({ orderBy: { name: "asc" } }),
      db.masterHotel.findMany({ include: { city: true }, orderBy: { name: "asc" } }),
      db.masterPlace.findMany({ include: { city: true }, orderBy: { name: "asc" } }),
      db.masterRestaurant.findMany({ include: { city: true }, orderBy: { name: "asc" } }),
      db.masterFlightRoute.findMany({ orderBy: { sector: "asc" } }),
      db.masterAddOn.findMany({ orderBy: { name: "asc" } }),
      db.masterPolicyTemplate.findFirst({ orderBy: { createdAt: "desc" } }),
      db.masterTaxSetting.findFirst({ where: { isActive: true }, orderBy: { effectiveFrom: "desc" } }),
      getMasterPlaceDefaults(),
      db.masterBannerImage.findMany(),
    ]);

    const activeTaxPercentage = dbTaxSetting?.currentTcsPercentage ?? 5.0;

    const currentMasterDataForAI = {
      tax_setting: {
        tax_percentage: activeTaxPercentage,
        label: "TCS / Standard Travel Tax",
      },
      policy_template: {
        payment_policy: dbPolicyTemplate?.paymentPolicy || "30% advance on confirmation, balance 15 days before departure.",
        cancellation_policy: dbPolicyTemplate?.cancellationPolicy || "Free cancellation up to 30 days prior. 50% between 15-30 days. Non-refundable under 14 days.",
        visa_rules: dbPolicyTemplate?.visaRules || "Valid government photo ID proof required for domestic travel. Passport with 6+ months validity for international.",
        general_notes: dbPolicyTemplate?.generalNotes || "Standard check-in is 14:00 hrs and check-out is 11:00 hrs.",
      },
      global_inclusions_exclusions: {
        inclusions: placeDefaultsRes.data?.defaultInclusions || [
          "Private Chauffeur-driven AC Vehicle for All Transfers",
          "Dedicated Experience Coordinator & Local Guide Assistance",
          "All Tolls, Parking, Inter-State Taxes & Driver Allowances",
        ],
        exclusions: placeDefaultsRes.data?.defaultExclusions || [
          "Personal Shopping & Laundry Expenses",
          "Tips, Gratuities & Porterage",
          "Optional Adventure Upgrades / Camera Fees",
        ],
      },
      cities: dbCities.map((c) => ({
        city_id: c.id,
        city_name: c.name,
        state_name: c.state,
        country_name: c.country,
      })),
      consultants: dbConsultants.map((c) => ({
        consultant_name: c.name,
        assigned_departure_city: c.departureCity || "",
        direct_phone: c.phone || "",
        email_address: c.email || "",
      })),
      hotels: dbHotels.map((h) => ({
        hotel_name: h.name,
        destination_city: h.city?.name || "",
        star_rating: h.starRating,
        price_per_night: h.pricePerNight,
        price_per_person: h.pricePerPerson,
        guest_score: h.guestScore || 4.5,
        guest_score_label: h.guestScoreLabel || "Very Good",
        room_types: h.roomTypes || [],
        meal_plans: h.mealPlans || [],
        amenities: h.facilities || [],
        photo_urls: h.photos || [],
      })),
      places: dbPlaces.map((p) => ({
        place_name: p.name,
        city: p.city?.name || "",
        category: p.category,
        description_historical_significance: p.description,
        place_inclusions: p.inclusions || [],
        place_exclusions: p.exclusions || [],
      })),
      restaurants: dbRestaurants.map((r) => ({
        restaurant_club_name: r.name,
        destination_city: r.city?.name || "",
        category_types: [r.categoryType || "Restaurant"],
        cuisine_specialties: [r.cuisineType || "Local Cuisine"],
        star_rating: r.starRating || 4.5,
        reviews_count: r.reviewsCount || 100,
        veg_jain_option: Boolean(r.offersPureVegJain),
      })),
      transportation: dbFlightRoutes.map((f) => ({
        transportation_type: f.type || "Flight",
        preferred_travel_time: f.travelTime || "3h 00m",
        route_sector: f.sector,
        carrier_provider_name: f.airline,
        route_vehicle_code: f.flightCodeDefault || "",
        number_of_stops: f.typicalStops || 0,
        transit_details: f.flightNotes || "",
        cabin_baggage_kg: f.cabinBaggageKg || 7,
        checkin_baggage_kg: f.checkInBaggageKg || 15,
        cancellation_advisory_policy: f.cancellationPolicy || "",
        route_notes_advisory: f.flightNotes || "",
      })),
      addons: dbAddOns.map((a) => ({
        package_item_name: a.name,
        category_type: a.type || "Visa",
        default_price: a.defaultPrice || 0,
        visa_service_subtype: a.visaType || "",
        stay_validity_window_expiry: a.validityWindow || a.validityLength || "",
        description_features: a.detailsDescription || "",
        city: "",
      })),
    };

    // 3. Auto-Detect Mode if mode is "auto"
    const isMode1Input =
      mode === "mode1" ||
      (mode === "auto" &&
        (prompt.length > 220 ||
          /\b(hotel|resort|day 1|day 2|itinerary|flight|breakfast|dinner|inclusions|exclusions|policy|tcs|tax|pax|per person|quote|package price)\b/i.test(
            prompt
          )));

    const selectedMode = isMode1Input ? "mode1" : "mode2";

    // 4. Multi-Provider Invocation with Fallback Chain & Retries
    let aiResult;
    try {
      aiResult = await generateTripWithFallback({
        mode: selectedMode,
        prompt: prompt,
        currentMasterData: currentMasterDataForAI,
        chatHistory: chatHistory as any,
      });
    } catch (routingErr: any) {
      console.error("[API /api/generate-trip] AI Provider routing failed:", routingErr);
      return NextResponse.json(
        {
          status: "error",
          error:
            "AI service is currently under peak demand or temporarily unavailable. Please try again in a moment.",
        },
        { status: 503 }
      );
    }

    const { rawText, providerUsed, isFallback, needsAdminReview, modelName } = aiResult;

    // 5. Parse JSON output safely
    let aiResponse: any;
    try {
      const cleanJson = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      aiResponse = JSON.parse(cleanJson);
    } catch (parseErr: any) {
      console.error("Failed to parse AI JSON response:", parseErr, rawText);
      return NextResponse.json(
        { status: "error", error: "Failed to parse structured trip blueprint. Please refine the prompt." },
        { status: 500 }
      );
    }

    const masterDataExtracted = aiResponse.master_data || {};
    const blueprintExtracted = aiResponse.trip_blueprint || {};
    const validationExtracted = aiResponse.validation || {
      missing_fields: [],
      assumptions_made: [],
      needs_admin_review: [],
    };

    if (needsAdminReview) {
      if (!validationExtracted.needs_admin_review) {
        validationExtracted.needs_admin_review = [];
      }
      const notice = "Some details were generated without live verification — please review before finalizing this trip.";
      if (!validationExtracted.needs_admin_review.includes(notice)) {
        validationExtracted.needs_admin_review.unshift(notice);
      }
    }

    // 7. Auto-Sync Master Data to Prisma Database
    const matchedSummary = {
      city: { name: "", matched: false, isNewDraft: false, cities: [] as any[] },
      hotelsMatched: [] as any[],
      hotelsDrafted: [] as any[],
      placesMatched: [] as any[],
      placesDrafted: [] as any[],
      restaurantsMatched: [] as any[],
      restaurantsDrafted: [] as any[],
      consultantMatched: null as any,
      flightsMatched: null as any,
    };

    // A. City Resolution
    let cityRecord: any = null;
    const extractedCity = masterDataExtracted.city || {};
    const rawCityName =
      extractedCity.city_name ||
      blueprintExtracted.tab1_core_trip_consultant?.destination_country_city?.split(",")?.[0] ||
      "Curated Destination";

    const cleanCityName = rawCityName.trim();

    if (cleanCityName) {
      cityRecord = await db.masterCity.findFirst({
        where: {
          name: { equals: cleanCityName, mode: "insensitive" },
        },
      });

      if (!cityRecord) {
        cityRecord = await db.masterCity.findFirst({
          where: {
            name: { contains: cleanCityName, mode: "insensitive" },
          },
        });
      }

      if (!cityRecord && (extractedCity.action === "new" || !cityRecord)) {
        cityRecord = await db.masterCity.create({
          data: {
            name: cleanCityName,
            state: extractedCity.state_name || cleanCityName,
            country: extractedCity.country_name || "India",
          },
        });
        matchedSummary.city = {
          name: cleanCityName,
          matched: false,
          isNewDraft: true,
          cities: [{ ...cityRecord, isNewDraft: true }],
        };
      } else if (cityRecord) {
        matchedSummary.city = {
          name: cityRecord.name,
          matched: true,
          isNewDraft: false,
          cities: [{ ...cityRecord, isNewDraft: false }],
        };
      }
    }

    const cityId = cityRecord?.id || null;
    const destinationTitle = cityRecord ? `${cityRecord.name}, ${cityRecord.country}` : cleanCityName;

    // B. Consultant Resolution
    const consultantsList = await db.masterConsultant.findMany();
    const extractedConsultant = masterDataExtracted.consultant || {};
    let resolvedConsultant = consultantsList.find((c) => {
      if (extractedConsultant.consultant_name) {
        return c.name.toLowerCase().includes(extractedConsultant.consultant_name.toLowerCase());
      }
      return false;
    });

    if (!resolvedConsultant && consultantsList.length > 0) {
      const departureCity = blueprintExtracted.tab1_core_trip_consultant?.departure_city || "";
      resolvedConsultant = consultantsList.find((c) => {
        const dep = (c.departureCity || "").toLowerCase();
        return dep && departureCity && dep.includes(departureCity.toLowerCase());
      }) || consultantsList[0];
    }

    matchedSummary.consultantMatched = resolvedConsultant
      ? { name: resolvedConsultant.name, phone: resolvedConsultant.phone || "" }
      : {
          name: extractedConsultant.consultant_name || "Senior Travel Consultant",
          phone: extractedConsultant.direct_phone || "+91 98765 43210",
        };

    // C. Hotels Resolution & Auto-Drafting
    const existingDbHotels = await db.masterHotel.findMany({ include: { city: true } });
    const rawHotels = Array.isArray(masterDataExtracted.hotels) ? masterDataExtracted.hotels : [];
    const resolvedHotels: any[] = [];

    for (const h of rawHotels) {
      const hName = (h.hotel_name || "").trim();
      if (!hName) continue;

      let matchedHotel = existingDbHotels.find((dbH) => {
        const dbName = dbH.name.toLowerCase().trim();
        const query = hName.toLowerCase().trim();
        return dbName === query || dbName.includes(query) || query.includes(dbName);
      });

      if (matchedHotel) {
        resolvedHotels.push(matchedHotel);
        matchedSummary.hotelsMatched.push({
          id: matchedHotel.id,
          name: matchedHotel.name,
          starRating: matchedHotel.starRating,
          photo: matchedHotel.photos?.[0] || HOTEL_FALLBACK_IMG,
          photos: matchedHotel.photos || HOTEL_FALLBACK_IMAGES,
        });
      } else {
        const starRating = Number(h.star_rating) || 4;
        const pricePerNight = Number(h.price_per_night) || (starRating >= 5 ? 12500 : starRating === 3 ? 4500 : 7500);
        const pricePerPerson = Number(h.price_per_person) || Math.round(pricePerNight / 2);
        const roomTypes = Array.isArray(h.room_types) && h.room_types.length > 0 ? h.room_types : ["Deluxe Panoramic Room", "Executive Suite"];
        const mealPlans = Array.isArray(h.meal_plans) && h.meal_plans.length > 0 ? h.meal_plans : ["Daily Buffet Breakfast (CP)", "Breakfast & Dinner (MAP)"];
        const facilities = Array.isArray(h.amenities) && h.amenities.length > 0 ? h.amenities : ["Swimming Pool", "Multi-Cuisine Restaurant", "Wi-Fi", "Spa & Wellness"];

        const { categorized, allPhotos } = await fetchCategorizedHotelPhotos(
          hName,
          cleanCityName,
          roomTypes,
          facilities
        );

        const newHotel = await db.masterHotel.create({
          data: {
            name: hName,
            cityId: cityId,
            starRating: starRating,
            pricePerNight: pricePerNight,
            pricePerPerson: pricePerPerson,
            guestScore: Number(h.guest_score) || 4.7,
            guestScoreLabel: h.guest_score_label || "Very Good",
            roomTypes: roomTypes,
            mealPlans: mealPlans,
            facilities: facilities,
            photos: Array.isArray(h.photo_urls) && h.photo_urls.length > 0 ? h.photo_urls : allPhotos,
          },
        });

        resolvedHotels.push(newHotel);
        matchedSummary.hotelsDrafted.push({
          id: newHotel.id,
          name: newHotel.name,
          starRating: newHotel.starRating,
          photo: newHotel.photos?.[0] || HOTEL_FALLBACK_IMG,
          photos: newHotel.photos || HOTEL_FALLBACK_IMAGES,
          categorized: categorized,
          draft: true,
        });
      }
    }

    // D. Places & Activities Resolution & Auto-Drafting
    const existingDbPlaces = await db.masterPlace.findMany({ include: { city: true } });
    const rawPlaces = Array.isArray(masterDataExtracted.places) ? masterDataExtracted.places : [];
    const resolvedPlaces: any[] = [];

    for (const p of rawPlaces) {
      const pName = (p.place_name || "").trim();
      if (!pName) continue;

      let matchedPlace = existingDbPlaces.find((dbP) => {
        const dbName = dbP.name.toLowerCase().trim();
        const query = pName.toLowerCase().trim();
        return dbName === query || dbName.includes(query) || query.includes(dbName);
      });

      if (matchedPlace) {
        resolvedPlaces.push(matchedPlace);
        matchedSummary.placesMatched.push({
          id: matchedPlace.id,
          name: matchedPlace.name,
          category: matchedPlace.category,
        });
      } else {
        const newPlace = await db.masterPlace.create({
          data: {
            name: pName,
            cityId: cityId,
            category: p.category || "Sightseeing",
            description: p.description_historical_significance || `Curated local attraction and experience in ${cleanCityName}.`,
            inclusions: Array.isArray(p.place_inclusions) && p.place_inclusions.length > 0
              ? p.place_inclusions
              : ["Entry Tickets & Activity Passes", "Certified Local Experience Guide"],
            exclusions: Array.isArray(p.place_exclusions) && p.place_exclusions.length > 0
              ? p.place_exclusions
              : ["Personal Expenses", "Optional Upgrades"],
          },
        });

        resolvedPlaces.push(newPlace);
        matchedSummary.placesDrafted.push({
          id: newPlace.id,
          name: newPlace.name,
          category: newPlace.category,
          draft: true,
        });
      }
    }

    // E. Restaurants Resolution & Auto-Drafting
    const existingDbRestaurants = await db.masterRestaurant.findMany({ include: { city: true } });
    const rawRestaurants = Array.isArray(masterDataExtracted.restaurants) ? masterDataExtracted.restaurants : [];
    const resolvedRestaurants: any[] = [];

    for (const r of rawRestaurants) {
      const rName = (r.restaurant_club_name || "").trim();
      if (!rName) continue;

      let matchedRest = existingDbRestaurants.find((dbR) => {
        const dbName = dbR.name.toLowerCase().trim();
        const query = rName.toLowerCase().trim();
        return dbName === query || dbName.includes(query) || query.includes(dbName);
      });

      if (matchedRest) {
        resolvedRestaurants.push(matchedRest);
        matchedSummary.restaurantsMatched.push({
          id: matchedRest.id,
          name: matchedRest.name,
          cuisineType: matchedRest.cuisineType,
        });
      } else {
        const cuisine = Array.isArray(r.cuisine_specialties) && r.cuisine_specialties.length > 0
          ? r.cuisine_specialties.join(", ")
          : "Local & Multi-Cuisine";

        const newRest = await db.masterRestaurant.create({
          data: {
            name: rName,
            cityId: cityId,
            cuisineType: cuisine,
            categoryType: Array.isArray(r.category_types) && r.category_types.length > 0 ? r.category_types[0] : "Restaurant",
            starRating: Number(r.star_rating) || 4.6,
            reviewsCount: Number(r.reviews_count) || 120,
            offersPureVegJain: Boolean(r.veg_jain_option),
          },
        });

        resolvedRestaurants.push(newRest);
        matchedSummary.restaurantsDrafted.push({
          id: newRest.id,
          name: newRest.name,
          cuisineType: newRest.cuisineType,
          draft: true,
        });
      }
    }

    // F. Transportation Resolution
    const existingDbRoutes = await db.masterFlightRoute.findMany();
    const rawTransports = Array.isArray(masterDataExtracted.transportation) ? masterDataExtracted.transportation : [];

    for (const t of rawTransports) {
      const sector = (t.route_sector || "").trim();
      if (!sector) continue;

      let matchedRoute = existingDbRoutes.find((r) => {
        const rSector = r.sector.toLowerCase();
        const qSector = sector.toLowerCase();
        return rSector.includes(qSector) || qSector.includes(rSector);
      });

      if (matchedRoute) {
        matchedSummary.flightsMatched = {
          sector: matchedRoute.sector,
          airline: matchedRoute.airline,
        };
      } else if (t.action === "new") {
        try {
          await db.masterFlightRoute.create({
            data: {
              sector: sector,
              airline: t.carrier_provider_name || "Premium Carrier",
              flightCodeDefault: t.route_vehicle_code || "",
              type: t.transportation_type || "Flight",
              travelTime: t.preferred_travel_time || "3h 00m",
              typicalStops: Number(t.number_of_stops) || 0,
              cabinBaggageKg: Number(t.cabin_baggage_kg) || 7,
              checkInBaggageKg: Number(t.checkin_baggage_kg) || 15,
              cancellationPolicy: t.cancellation_advisory_policy || "Partially refundable per airline policy.",
              flightNotes: t.route_notes_advisory || t.transit_details || "Seats together requested.",
            },
          });
        } catch (routeErr) {
          console.warn("Could not save new flight route to master data:", routeErr);
        }
      }
    }

    // G. Banner Image Generation / Resolution
    const tab1 = blueprintExtracted.tab1_core_trip_consultant || {};
    let bannerImageUrl = tab1.main_tour_planner_image || "";

    if (!bannerImageUrl) {
      const existingCityBanner = cityId
        ? await db.masterBannerImage.findFirst({ where: { destinationCityId: cityId } })
        : null;

      bannerImageUrl = existingCityBanner?.imageUrl ||
        (await generateAITripBanner(
          cleanCityName,
          [tab1.itinerary_title || "Scenic Holiday"],
          resolvedPlaces.map((p) => p.name),
          "curated luxury vacation"
        ));

      if (cityId && !existingCityBanner) {
        try {
          await db.masterBannerImage.create({
            data: {
              label: `${cleanCityName} Banner`,
              imageUrl: bannerImageUrl,
              destinationCityId: cityId,
            },
          });
        } catch (bannerSaveErr) {
          console.warn("Auto-saving banner to Master Data Hub:", bannerSaveErr);
        }
      }
    }

    // 8. Transform into Full 9-Tab Prefill Trip Blueprint
    const durationDays = Math.max(1, Number(tab1.duration_days) || (Array.isArray(blueprintExtracted.tab3_day_by_day_itinerary) ? blueprintExtracted.tab3_day_by_day_itinerary.length : 4));
    const durationNights = tab1.duration_nights !== undefined ? Math.max(0, Number(tab1.duration_nights)) : Math.max(0, durationDays - 1);
    const numTravellers = Math.max(1, Number(tab1.number_of_travellers) || 2);

    let startDateStr = tab1.start_date || "";
    let endDateStr = tab1.end_date || "";

    if (!startDateStr || !endDateStr) {
      const today = new Date();
      const startObj = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const endObj = new Date(startObj.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000);
      startDateStr = startObj.toISOString().split("T")[0];
      endDateStr = endObj.toISOString().split("T")[0];
    }

    // Map Tab 2 & Tab 3 into Itinerary Days
    const tab2Planning = Array.isArray(blueprintExtracted.tab2_day_wise_planning) ? blueprintExtracted.tab2_day_wise_planning : [];
    const tab3Itinerary = Array.isArray(blueprintExtracted.tab3_day_by_day_itinerary) ? blueprintExtracted.tab3_day_by_day_itinerary : [];
    const primaryHotel = resolvedHotels[0] || null;

    const itineraryDays = [];
    for (let i = 0; i < durationDays; i++) {
      const dayNum = i + 1;
      const t2 = tab2Planning.find((d: any) => d.day_number === dayNum) || {};
      const t3 = tab3Itinerary.find((d: any) => d.day_number === dayNum) || {};

      const dayCity = t2.city || cleanCityName;
      const dayHotelName = t2.hotel_ref || t3.hotel_shown || primaryHotel?.name || "Curated Boutique Hotel";
      const matchedH = resolvedHotels.find((h) => h.name.toLowerCase().includes(dayHotelName.toLowerCase())) || primaryHotel;

      const dayPlaces = Array.isArray(t3.places_included) && t3.places_included.length > 0
        ? t3.places_included
        : Array.isArray(t2.places_selected) && t2.places_selected.length > 0
        ? t2.places_selected
        : resolvedPlaces.slice(i * 2, i * 2 + 2).map((p) => p.name);

      const dayTitle = t3.day_theme_title || `Day ${dayNum} - ${dayCity} Exploration`;
      const dayDesc = t3.day_description || `Enjoy curated sightseeing across ${dayPlaces.join(" and ") || dayCity} with authentic local culture and leisure.`;

      itineraryDays.push({
        dayNumber: dayNum,
        cityOrStay: dayCity,
        title: dayTitle,
        durationHours: t3.duration || (i === 0 || i === durationDays - 1 ? "Half Day (4-5 hrs)" : "Full Day (8-9 hrs)"),
        description: dayDesc,
        places: dayPlaces,
        hotelId: matchedH?.id || null,
        hotelName: matchedH?.name || dayHotelName,
        hotelPricePerNight: matchedH?.pricePerNight || null,
        hotelPricePerPerson: matchedH?.pricePerPerson || null,
        inclusions: placeDefaultsRes.data?.defaultInclusions || [
          "Private Chauffeur-driven AC Vehicle for All Transfers",
          "Dedicated Experience Coordinator & Guide Assistance",
          "All Tolls, Parking, Inter-State Taxes & Driver Allowances",
        ],
        exclusions: placeDefaultsRes.data?.defaultExclusions || [
          "Personal Shopping & Laundry Expenses",
          "Tips, Gratuities & Porterage",
          "Optional Adventure Upgrades / Camera Fees",
        ],
        customerLovedTips: [
          "Carry a light jacket for breezy evenings.",
          "Early morning visits offer the best photography lighting.",
        ],
        customerWatchOutTips: [
          "Keep local cash handy for artisanal boutique purchases.",
        ],
        sortOrder: dayNum,
      });
    }

    // Map Tab 4: Stays & Accommodations
    const tab4Stays = Array.isArray(blueprintExtracted.tab4_stays_accommodations) ? blueprintExtracted.tab4_stays_accommodations : [];
    const accommodations = (tab4Stays.length > 0 ? tab4Stays : resolvedHotels).map((hItem: any, idx: number) => {
      const hName = hItem.hotel_name || hItem.name || "Curated Hotel";
      const matchedH = resolvedHotels.find((h) => h.name.toLowerCase().includes(hName.toLowerCase())) || resolvedHotels[0] || {};

      return {
        dayNumber: hItem.day_number || idx + 1,
        hotelName: matchedH.name || hName,
        location: hItem.location_city || `${cleanCityName}, ${cityRecord?.country || "India"}`,
        checkInDate: hItem.date || startDateStr,
        checkOutDate: endDateStr,
        starRating: hItem.rating || matchedH.starRating || 4,
        roomType: matchedH.roomTypes?.[0] || "Deluxe Panoramic Suite",
        mealPlan: matchedH.mealPlans?.[0] || "Daily Buffet Breakfast (CP)",
        ratingScore: matchedH.guestScore || 4.7,
        ratingLabel: matchedH.guestScoreLabel || "Very Good",
        facilities: matchedH.facilities || ["Wi-Fi", "Swimming Pool", "Restaurant", "Room Service"],
        nearbyAttractions: matchedH.nearbyAttractions || [],
        nearbyRestaurants: matchedH.nearbyRestaurants || [],
        photos: matchedH.photos && matchedH.photos.length > 0 ? matchedH.photos : HOTEL_FALLBACK_IMAGES,
        pricePerNight: hItem.price_per_night || matchedH.pricePerNight || 7500,
        pricePerPerson: matchedH.pricePerPerson || Math.round((hItem.price_per_night || 7500) / 2),
      };
    });

    // Map Tab 5: Transportation
    const tab5 = blueprintExtracted.tab5_transportation || {};
    const transportEntries = Array.isArray(tab5.transportation_entries) ? tab5.transportation_entries : [];
    const flightDetails = transportEntries.map((te: any) => ({
      sector: te.sector_route || `${tab1.departure_city || "Origin"} - ${cleanCityName}`,
      airline: te.carrier_airline || "IndiGo / Vistara Premium",
      departureDateTime: te.estimated_departure || `${startDateStr}T08:30:00.000Z`,
      arrivalDateTime: te.estimated_arrival || `${startDateStr}T11:45:00.000Z`,
      durationText: te.preferred_travel_time || "3h 15m",
      stops: 0,
      layoverInfo: null,
      carryOnBaggageKg: 7,
      checkInBaggageKg: 15,
      cancellationPolicy: "Partially refundable up to 48 hours prior to departure.",
      flightNotes: te.transit_notes_instructions || "Assistance provided for web check-in.",
      type: te.transit_type || "Flight",
      travelTime: te.preferred_travel_time || "3h 15m",
      isStartingTransfer: true,
      isPackageIncluded: true,
    }));

    // Map Tab 6: Add-ons
    const tab6 = Array.isArray(blueprintExtracted.tab6_addons) ? blueprintExtracted.tab6_addons : [];
    const addOns = tab6.map((a: any) => {
      const aName = a.package_item_name || a.name || "Curated Addon";
      const matchedA = dbAddOns.find((dbA) => dbA.name.toLowerCase().includes(aName.toLowerCase()));
      return {
        name: matchedA?.name || aName,
        detailsJson: { coverage: "All Travellers", type: matchedA?.type || "Visa" },
        price: matchedA?.defaultPrice || 950,
        priceType: "per person",
      };
    });

    // Map Tab 7: Restaurants
    const tab7 = Array.isArray(blueprintExtracted.tab7_restaurants) ? blueprintExtracted.tab7_restaurants : [];
    const restaurantSuggestions = (tab7.length > 0 ? tab7 : resolvedRestaurants).map((rItem: any) => {
      const rName = rItem.restaurant_name || rItem.name || "Curated Dining";
      const matchedR = resolvedRestaurants.find((r) => r.name.toLowerCase().includes(rName.toLowerCase()));
      return {
        location: cleanCityName,
        cuisineType: matchedR?.cuisineType || "Local & Multi-Cuisine",
        name: matchedR?.name || rName,
        rating: matchedR?.starRating || 4.6,
        reviewCount: matchedR?.reviewsCount || 150,
        isVeg: matchedR ? Boolean(matchedR.offersPureVegJain) : true,
        category: matchedR?.categoryType || "Restaurant",
      };
    });

    // Map Tab 8: Master Policies
    const tripTerms = {
      paymentPolicy: dbPolicyTemplate?.paymentPolicy || "30% advance on confirmation. 70% balance 15 days prior to departure.",
      cancellationPolicy: dbPolicyTemplate?.cancellationPolicy || "Free cancellation up to 30 days prior. 50% between 15-30 days. Non-refundable within 14 days.",
      visaRules: dbPolicyTemplate?.visaRules || "Valid government photo ID required for domestic travel. Passport with 6+ months validity for international.",
      generalNotes: dbPolicyTemplate?.generalNotes || "Standard hotel check-in is 14:00 hrs and check-out is 11:00 hrs.",
    };

    // Map Tab 9: Price Quotes & Financials
    const tab9 = blueprintExtracted.tab9_price_quotes || {};
    const rawLineItems = Array.isArray(tab9.line_items) ? tab9.line_items : [];
    
    let priceQuoteItems = rawLineItems.map((item: any, idx: number) => ({
      label: item.item_name || `Curated Itinerary Package (Per Person)`,
      amount: Number(item.price) || 12000,
      sortOrder: idx + 1,
    }));

    if (priceQuoteItems.length === 0) {
      const baseHotelCost = (primaryHotel?.pricePerNight || 7000) * durationNights;
      const baseActivityCost = resolvedPlaces.length * 1200;
      const baseTransportCost = durationDays * 3500;
      const perPersonEstimate = Math.round((baseHotelCost + baseActivityCost + baseTransportCost) / numTravellers);

      priceQuoteItems = [
        {
          label: `${durationDays}D/${durationNights}N Land Package & Stays (Per Person)`,
          amount: perPersonEstimate,
          sortOrder: 1,
        },
      ];
    }

    const tcsPercentage = activeTaxPercentage;
    const subtotal = priceQuoteItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0) * numTravellers;
    const tcsAmount = Math.round(subtotal * (tcsPercentage / 100));
    const totalWithTcs = subtotal + tcsAmount;

    const autoTitle =
      tab1.itinerary_title ||
      `${tab1.departure_city || "Ex-Hub"} to ${cleanCityName} ${durationDays}D/${durationNights}N Experience`;

    const finalPrefillTripData = {
      title: autoTitle,
      pricingPlanTitle: "Luxury Standard Plan",
      destination: destinationTitle,
      departureCity: tab1.departure_city || "Mumbai",
      coverImage: bannerImageUrl,
      startDate: startDateStr,
      endDate: endDateStr,
      durationDays: durationDays,
      durationNights: durationNights,
      numTravellers: numTravellers,
      consultantName: matchedSummary.consultantMatched?.name || "Senior Travel Consultant",
      consultantPhone: matchedSummary.consultantMatched?.phone || "+91 98765 43210",
      transportationArrangement: tab5.mode === "own" ? "Own" : "Planner",
      startingTransferDetails: tab5.starting_point_hub_transfer || `Private transfer arranged for ${cleanCityName}`,
      packageTransportationDetails: tab5.package_level_included_transportation || "Dedicated AC Vehicle for all transfers and sightseeing tours as per itinerary.",
      priceQuoteItems: priceQuoteItems,
      tripFinancials: {
        tcsPercentage: tcsPercentage,
        tcsAmount: tcsAmount,
        totalWithTcs: totalWithTcs,
        notes: `Includes ${tcsPercentage}% TCS as per Master Tax Setting.`,
      },
      itineraryDays: itineraryDays,
      accommodations: accommodations,
      flightDetails: flightDetails,
      addOns: addOns,
      restaurantSuggestions: restaurantSuggestions,
      tripTerms: tripTerms,
    };

    const hasReviewRequirement = Boolean(
      needsAdminReview ||
      (validationExtracted.needs_admin_review && validationExtracted.needs_admin_review.length > 0)
    );

    const finalPrefillTripDataWithReview = {
      ...finalPrefillTripData,
      needsAdminReview: hasReviewRequirement,
      generatedBy: providerUsed,
    };

    return NextResponse.json({
      status: "success",
      modeUsed: selectedMode,
      generated_by: providerUsed,
      isFallback: isFallback,
      needsAdminReview: hasReviewRequirement,
      modelUsed: modelName,
      tripBlueprint: finalPrefillTripDataWithReview,
      rawStructuredJson: aiResponse,
      matchedSummary: matchedSummary,
      validation: validationExtracted,
      highlights: [
        `${durationDays} Days / ${durationNights} Nights curated package for ${numTravellers} travellers to ${cleanCityName}`,
        `Accommodations: ${resolvedHotels.map((h) => h.name).slice(0, 2).join(", ") || "Selected Boutique Stays"}`,
        `Includes ${resolvedPlaces.length} matched places & activities with dedicated transfers`,
      ],
      remaining: rateLimit.remaining,
    });
  } catch (err: any) {
    console.error("API /api/generate-trip error:", err);
    return NextResponse.json(
      {
        status: "error",
        error: err.message || "An unexpected error occurred during trip generation.",
      },
      { status: 500 }
    );
  }
}
