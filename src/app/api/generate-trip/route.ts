import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limiter";
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from "@google/generative-ai";

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
 * Uses Gemini API / Imagen 3 / AI Image Generation Model with a descriptive prompt
 * built from the destination, key landmarks, and trip theme/highlights.
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

  // 1. Try Google Imagen 3 API with highest quality tier parameters
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

  // 2. High-fidelity Flux / modern AI image generator endpoint with 1920x1080 resolution
  const aiImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    descriptivePrompt
  )}?width=1920&height=1080&nologo=true&enhance=true&model=flux`;

  return aiImageUrl;
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
 * Categorized Hotel Photos Collector:
 * - front_exterior: string[]
 * - side_view: string[]
 * - interior_lobby: string[]
 * - room_types: { type: string, photos: string[] }[]
 * - bathroom: string[]
 * - facilities: { name: string, photos: string[] }[]
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

  // Room type photos
  const roomTypesData = await Promise.all(
    roomTypes.slice(0, 3).map(async (rType) => ({
      type: rType,
      photos: await fetchPexelsHotelImages(`${hotelName} ${destination} ${rType} hotel bedroom suite`, 2),
    }))
  );

  // Facility photos
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

  // Flatten unique list for photos array
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

  return { categorized, allPhotos };
}

async function discoverRealDestinationVenues(destination: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        destination
      )}&format=json&addressdetails=1&extratags=1&namedetails=1&limit=25`,
      {
        headers: {
          "User-Agent": "TripPlannerWorkspace/1.0",
          Accept: "application/json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const places = await res.json();
    if (!Array.isArray(places) || places.length === 0) return null;

    const hotels: string[] = [];
    const attractions: string[] = [];
    const restaurants: string[] = [];

    for (const p of places) {
      const name = p.name || p.namedetails?.name || p.display_name?.split(",")[0]?.trim();
      const type = (p.type || p.class || "").toLowerCase();
      if (!name || name.length < 3 || name.toLowerCase() === destination.toLowerCase()) continue;

      if (type.includes("hotel") || type.includes("resort") || type.includes("guest_house")) {
        if (!hotels.includes(name)) hotels.push(name);
      } else if (
        type.includes("attraction") ||
        type.includes("monument") ||
        type.includes("museum") ||
        type.includes("viewpoint") ||
        type.includes("temple") ||
        type.includes("place_of_worship")
      ) {
        if (!attractions.includes(name)) attractions.push(name);
      } else if (type.includes("restaurant") || type.includes("cafe") || type.includes("bar")) {
        if (!restaurants.includes(name)) restaurants.push(name);
      }
    }

    return {
      hotels: hotels.slice(0, 4),
      attractions: attractions.slice(0, 6),
      restaurants: restaurants.slice(0, 4),
    };
  } catch (err) {
    return null;
  }
}

interface GenerateTripRequest {
  prompt: string;
  chatHistory?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check (20 requests per hour per IP / Client)
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "admin-user";

    const rateLimit = checkRateLimit(clientIp, 20, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      const waitMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / (60 * 1000));
      return NextResponse.json(
        {
          status: "error",
          error: `Rate limit reached. You can make up to 20 trip generations per hour. Please try again in ${waitMinutes} minutes.`,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const body = (await req.json()) as GenerateTripRequest;
    const { prompt, chatHistory = [] } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { status: "error", error: "Please enter a valid trip description." },
        { status: 400 }
      );
    }

    // 2. Google Gemini API Key Check
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          status: "error",
          error:
            "Google Gemini API key is missing. Please configure GEMINI_API_KEY in your environment (.env.local file) to use the AI Trip Generator.",
        },
        { status: 500 }
      );
    }

    // 3. System Prompt for Gemini Extraction
    const systemInstruction = `You are an expert travel operations architect for TripCraft / TripPlanner Workspace.
Your task is to analyze natural language trip requirements from travel administrators and extract a structured JSON object.

Extract a JSON object matching strictly this schema:
{
  "destination": string,                // Destination city or region (e.g., "Manali", "Dubai", "Goa", "Bali")
  "origin_city": string,                // Departure / origin city (e.g., "Delhi", "Mumbai", "Bangalore", "London")
  "duration_days": number,              // Total days count (integer >= 1)
  "duration_nights": number,            // Total nights count (normally duration_days - 1, integer >= 0)
  "travellers": number,                 // Number of travellers (integer >= 1)
  "budget_level": "budget" | "mid" | "luxury", // Inferred or stated budget tier
  "travel_dates": string | null,        // Approximate or stated date range (e.g. "2026-10-15 to 2026-10-20" or "October 2026"), or null
  "hotel_preferences": string[],        // List of specific hotels or hotel categories/names (e.g. ["The Himalayan Resort", "Apple Country Resort"])
  "activities": string[],               // List of sightseeing activities/attractions (e.g. ["Solang Valley Adventure", "Hadimba Temple Visit", "Rohtang Pass Tour"])
  "restaurants": string[],              // List of dining / restaurant suggestions (e.g. ["Johnson's Cafe", "Chopsticks Restaurant", "Cafe 1947"])
  "flights_needed": boolean,            // Whether transportation / flights from origin city are requested or implied
  "trip_highlights": string[],          // 3-5 short bullet points describing the key highlights of this proposal
  "missing_fields": string[],           // Array of required fields that are COMPLETELY missing from the conversation. Required fields to check: "destination", "travellers", "duration_days". If any of these cannot be determined from prompt or history, list them here (e.g. ["travellers"]).
  "clarification_message": string | null // If missing_fields is non-empty, provide a warm, professional, concise question asking the admin for the missing information. Otherwise null.
}

Guidelines:
1. If the admin mentions "family trip" or "couple trip" without specifying exact number of people, look for cues. If not stated at all, flag "travellers" in missing_fields.
2. If destination or duration is missing, flag them in missing_fields.
3. If origin_city is not mentioned, you can default origin_city to "Delhi" or "Mumbai" (or infer based on context), but do NOT flag it as missing unless destination itself is missing.
4. For hotel_preferences, activities, and restaurants: produce realistic, high-quality, authentic recommendations appropriate for the destination and budget tier if not explicitly named by the admin.
5. Provide a minimum of 2-4 authentic activities and 2-3 authentic restaurants for the destination.
6. Always return guaranteed valid JSON.`;

    // 4. Initialize Google Generative AI with structured JSON schema
    const genAI = new GoogleGenerativeAI(apiKey);

    const CANDIDATE_MODELS = Array.from(
      new Set(
        [
          process.env.GEMINI_MODEL,
          "gemini-3.5-flash",
          "gemini-3.7-flash",
          "gemini-3.6-flash",
          "gemini-3.5-flash-lite",
          "gemini-flash-lite-latest",
          "gemini-flash-latest",
          "gemini-pro-latest",
        ].filter((m): m is string => Boolean(m && m.trim()))
      )
    );

    const generationSchema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        destination: { type: SchemaType.STRING },
        origin_city: { type: SchemaType.STRING },
        duration_days: { type: SchemaType.INTEGER },
        duration_nights: { type: SchemaType.INTEGER },
        travellers: { type: SchemaType.INTEGER },
        budget_level: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["budget", "mid", "luxury"],
        },
        travel_dates: { type: SchemaType.STRING, nullable: true },
        hotel_preferences: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        activities: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        restaurants: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        flights_needed: { type: SchemaType.BOOLEAN },
        trip_highlights: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        missing_fields: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        clarification_message: { type: SchemaType.STRING, nullable: true },
      },
      required: [
        "destination",
        "origin_city",
        "duration_days",
        "duration_nights",
        "travellers",
        "budget_level",
        "hotel_preferences",
        "activities",
        "restaurants",
        "flights_needed",
        "missing_fields",
      ],
    };

    // Format chat history into Gemini contents format
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    for (const msg of chatHistory) {
      if (msg.role === "user") {
        contents.push({
          role: "user",
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === "assistant") {
        contents.push({
          role: "model",
          parts: [{ text: msg.content }],
        });
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    // 5. Call Gemini API with Multi-Model Fallback & Transient Error Retries
    let aiContent = "";
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: generationSchema,
            temperature: 0.3,
          },
        });

        // Up to 2 attempts per model for transient spikes (503 / 429)
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const result = await model.generateContent({ contents });
            aiContent = result.response.text();
            if (aiContent) break;
          } catch (err: any) {
            lastError = err;
            console.warn(
              `Gemini attempt ${attempt} on ${modelName} failed:`,
              err?.message || err
            );
            const isTransient =
              err?.status === 503 ||
              err?.message?.includes("503") ||
              err?.message?.includes("high demand") ||
              err?.status === 429;

            if (attempt < 2 && isTransient) {
              await new Promise((res) => setTimeout(res, 1200));
            } else {
              break;
            }
          }
        }

        if (aiContent) {
          break; // Successfully generated content!
        }
      } catch (initErr: any) {
        lastError = initErr;
        console.warn(`Failed to initialize or invoke ${modelName}:`, initErr?.message || initErr);
      }
    }

    if (!aiContent) {
      const is503 =
        lastError?.status === 503 ||
        lastError?.message?.includes("503") ||
        lastError?.message?.includes("high demand");

      const errorMsg = is503
        ? "The AI service is experiencing temporary peak demand from Google. Please click 'Generate' again in a few moments."
        : lastError?.message || "No response received from Google Gemini API.";

      return NextResponse.json(
        { status: "error", error: errorMsg },
        { status: is503 ? 503 : 500 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(aiContent);
    } catch (parseErr: any) {
      console.error("JSON parse error from Gemini response:", parseErr, aiContent);
      return NextResponse.json(
        { status: "error", error: "Failed to parse AI output. Please try again." },
        { status: 500 }
      );
    }

    // 6. Check if clarification is required
    const missingFields: string[] = Array.isArray(parsed.missing_fields)
      ? parsed.missing_fields.filter((f: string) => Boolean(f))
      : [];

    if (missingFields.length > 0) {
      const clarificationMsg =
        parsed.clarification_message ||
        `Could you please clarify the following details to complete the blueprint: ${missingFields.join(
          ", "
        )}?`;

      return NextResponse.json({
        status: "needs_clarification",
        missing_fields: missingFields,
        message: clarificationMsg,
        partial_data: parsed,
        remaining: rateLimit.remaining,
      });
    }

    // Ensure baseline sanitized values
    const rawDestination = (parsed.destination || "Scenic Destination").trim();
    const originCityName = (parsed.origin_city || "Delhi").trim();
    const durationDays = Math.max(1, Number(parsed.duration_days) || 3);
    const durationNights =
      parsed.duration_nights !== undefined
        ? Math.max(0, Number(parsed.duration_nights))
        : Math.max(0, durationDays - 1);
    const numTravellers = Math.max(1, Number(parsed.travellers) || 2);
    const budgetLevel = parsed.budget_level || "mid";
    const flightsNeeded = Boolean(parsed.flights_needed);

    // 1. EXTRACT INDIVIDUAL CITY NAMES (Never treat a multi-city phrase as one combined city string)
    const cleanCityToken = (s: string) =>
      s
        .replace(/\b(trip|tour|package|vacation|holiday|itinerary|days?|nights?|budget|luxury|family)\b/gi, "")
        .trim();

    let individualCityNames: string[] = rawDestination
      .split(/[,;&+/|]+|\band\b|\bto\b/i)
      .map((s: string) => cleanCityToken(s))
      .filter((s: string) => s.length > 1 && s.toLowerCase() !== originCityName.toLowerCase());

    if (individualCityNames.length <= 1) {
      const matchAfterTo = (prompt || "").match(/\bto\s+([^.\n]+)/i);
      const promptTarget = matchAfterTo && matchAfterTo[1] ? matchAfterTo[1] : prompt;
      const promptCities = promptTarget
        .split(/[,;&+/|]+|\band\b|\bto\b/i)
        .map((s: string) => cleanCityToken(s))
        .filter(
          (s: string) =>
            s.length > 2 &&
            s.toLowerCase() !== originCityName.toLowerCase() &&
            !s.toLowerCase().includes("hotel") &&
            !s.toLowerCase().includes("resort")
        );

      if (promptCities.length > 1) {
        individualCityNames = promptCities;
      }
    }

    if (individualCityNames.length === 0) {
      individualCityNames = [cleanCityToken(rawDestination) || "Scenic Destination"];
    }

    // Deduplicate preserving sequence order
    individualCityNames = Array.from(new Set(individualCityNames));
    const destinationName = individualCityNames.join(", ");

    // 7. AUTO-DISCOVERY & MASTER DATA MATCHING ENGINE
    const matchedSummary = {
      city: { name: destinationName, matched: false, isNewDraft: false, cities: [] as any[] },
      hotelsMatched: [] as any[],
      hotelsDrafted: [] as any[],
      placesMatched: [] as any[],
      placesDrafted: [] as any[],
      restaurantsMatched: [] as any[],
      restaurantsDrafted: [] as any[],
      consultantMatched: null as any,
      flightsMatched: null as any,
    };

    // A. City Matching or Auto-Drafting for EACH INDIVIDUAL CITY
    const resolvedCities: Array<{ id: string; name: string; state: string; country: string; isNewDraft: boolean }> = [];

    for (const singleCity of individualCityNames) {
      let cityRecord = await db.masterCity.findFirst({
        where: {
          name: {
            equals: singleCity,
            mode: "insensitive",
          },
        },
      });

      if (!cityRecord) {
        cityRecord = await db.masterCity.findFirst({
          where: {
            name: {
              contains: singleCity,
              mode: "insensitive",
            },
          },
        });
      }

      if (!cityRecord) {
        // Create new individual MasterCity (never a combined string)
        cityRecord = await db.masterCity.create({
          data: {
            name: singleCity,
            state: singleCity,
            country: "India",
          },
        });
        resolvedCities.push({ ...cityRecord, isNewDraft: true });
      } else {
        resolvedCities.push({ ...cityRecord, isNewDraft: false });
      }
    }

    const primaryCity = resolvedCities[0];
    const cityId = primaryCity.id;

    matchedSummary.city = {
      name: destinationName,
      matched: resolvedCities.every((c) => !c.isNewDraft),
      isNewDraft: resolvedCities.some((c) => c.isNewDraft),
      cities: resolvedCities.map((c) => ({
        id: c.id,
        name: c.name,
        country: c.country,
        state: c.state,
        isNewDraft: c.isNewDraft,
      })),
    };

    // B. Auto-Discovery for Minimal Prompts (Real places & POIs via live discovery)
    const isMinimalPrompt =
      !parsed.hotel_preferences ||
      parsed.hotel_preferences.length === 0 ||
      parsed.hotel_preferences.every(
        (h: string) =>
          h.toLowerCase().includes("hotel") ||
          h.toLowerCase().includes("resort") ||
          h.toLowerCase().includes("budget") ||
          h.toLowerCase().includes("luxury")
      );

    let discoveredVenues: {
      hotels: string[];
      attractions: string[];
      restaurants: string[];
    } | null = null;

    if (isMinimalPrompt) {
      discoveredVenues = await discoverRealDestinationVenues(destinationName);
    }

    // C. Consultant Matching (by departure city or default)
    const consultants = await db.masterConsultant.findMany();
    let matchedConsultant = consultants.find((c) => {
      const departure = (c.departureCity || "").toLowerCase();
      return (
        departure.includes(originCityName.toLowerCase()) ||
        originCityName.toLowerCase().includes(departure)
      );
    });

    if (!matchedConsultant && consultants.length > 0) {
      matchedConsultant = consultants[0];
    }

    matchedSummary.consultantMatched = matchedConsultant
      ? { name: matchedConsultant.name, phone: matchedConsultant.phone }
      : { name: "Senior Travel Consultant", phone: "+91 98765 43210" };

    // D. Hotel Matching, Deduplication & Auto-Drafting
    const rawAiHotels: string[] = Array.isArray(parsed.hotel_preferences)
      ? parsed.hotel_preferences
      : [];

    const mergedHotelNames = Array.from(
      new Set(
        [
          ...rawAiHotels,
          ...(discoveredVenues?.hotels || []),
          `Grand ${destinationName} Luxury Resort & Spa`,
          `${destinationName} Boutique Heritage Retreat`,
        ].filter((h): h is string => Boolean(h && h.trim().length > 2))
      )
    ).slice(0, 3);

    const existingHotels = await db.masterHotel.findMany({
      include: { city: true },
    });

    const resolvedHotels: any[] = [];
    const processedHotelIds = new Set<string>();

    for (const rawHotelName of mergedHotelNames) {
      const cleanHotelName = rawHotelName.trim();
      if (!cleanHotelName) continue;

      // Deduplication search against Master Data Hub (case-insensitive name + city)
      const matched = existingHotels.find((h) => {
        const hName = h.name.toLowerCase().trim();
        const query = cleanHotelName.toLowerCase().trim();
        const nameMatches = hName === query || hName.includes(query) || query.includes(hName);
        if (!nameMatches) return false;
        if (h.cityId && (h.cityId === cityId || (h.city && h.city.name.toLowerCase().includes(destinationName.toLowerCase())))) {
          return true;
        }
        return nameMatches;
      });

      if (matched) {
        if (!processedHotelIds.has(matched.id)) {
          processedHotelIds.add(matched.id);
          resolvedHotels.push(matched);
          matchedSummary.hotelsMatched.push({
            id: matched.id,
            name: matched.name,
            starRating: matched.starRating,
            photos: matched.photos && matched.photos.length > 0 ? matched.photos : HOTEL_FALLBACK_IMAGES,
            photo: matched.photos?.[0] || HOTEL_FALLBACK_IMG,
          });
        }
      } else {
        // Collect categorized authentic web photos for new draft hotel
        const defaultRooms = ["Deluxe Heritage Room", "Executive Panoramic Suite"];
        const defaultFacilities = ["Swimming Pool", "Spa & Wellness Center", "Multi-Cuisine Restaurant", "24/7 Room Service", "Free High-Speed Wi-Fi"];
        
        const { categorized: hotelCategorized, allPhotos: hotelPhotoUrls } =
          await fetchCategorizedHotelPhotos(
            cleanHotelName,
            destinationName,
            defaultRooms,
            defaultFacilities
          );

        // Create new draft Hotel in Master Data
        const starRating = budgetLevel === "luxury" ? 5 : budgetLevel === "budget" ? 3 : 4;
        const defaultRate = budgetLevel === "luxury" ? 14500 : budgetLevel === "budget" ? 4500 : 8500;

        const newDraftHotel = await db.masterHotel.create({
          data: {
            name: cleanHotelName,
            cityId: cityId,
            starRating: starRating,
            roomTypes: defaultRooms,
            mealPlans: ["Daily Buffet Breakfast (CP)", "Breakfast & Dinner (MAP)"],
            guestScore: 4.8,
            guestScoreLabel: "Superb Choice",
            facilities: defaultFacilities,
            photos: hotelPhotoUrls.length > 0 ? hotelPhotoUrls : HOTEL_FALLBACK_IMAGES,
            pricePerNight: defaultRate,
            pricePerPerson: Math.round(defaultRate / 2),
          },
        });

        processedHotelIds.add(newDraftHotel.id);
        resolvedHotels.push(newDraftHotel);
        matchedSummary.hotelsDrafted.push({
          id: newDraftHotel.id,
          name: newDraftHotel.name,
          starRating: newDraftHotel.starRating,
          photos: hotelPhotoUrls.length > 0 ? hotelPhotoUrls : HOTEL_FALLBACK_IMAGES,
          photo: hotelPhotoUrls[0] || HOTEL_FALLBACK_IMG,
          categorized: hotelCategorized,
          draft: true,
        });
      }
    }

    // E. Places & Activities Matching, Deduplication & Auto-Drafting
    const rawAiActivities: string[] = Array.isArray(parsed.activities)
      ? parsed.activities
      : [];

    const mergedPlaceNames = Array.from(
      new Set(
        [
          ...rawAiActivities,
          ...(discoveredVenues?.attractions || []),
          `${destinationName} Iconic Heritage & Cultural Trail`,
          `${destinationName} Scenic Nature Panorama & Sunset Point`,
        ].filter((p): p is string => Boolean(p && p.trim().length > 2))
      )
    ).slice(0, 6);

    const existingPlaces = await db.masterPlace.findMany({
      include: { city: true },
    });

    const resolvedPlaces: any[] = [];
    const processedPlaceIds = new Set<string>();

    for (const rawActivityName of mergedPlaceNames) {
      const cleanAct = rawActivityName.trim();
      if (!cleanAct) continue;

      const matched = existingPlaces.find((p) => {
        const pName = p.name.toLowerCase().trim();
        const query = cleanAct.toLowerCase().trim();
        return pName === query || pName.includes(query) || query.includes(pName);
      });

      if (matched) {
        if (!processedPlaceIds.has(matched.id)) {
          processedPlaceIds.add(matched.id);
          resolvedPlaces.push(matched);
          matchedSummary.placesMatched.push({
            id: matched.id,
            name: matched.name,
            category: matched.category,
          });
        }
      } else {
        // Create draft MasterPlace
        const newDraftPlace = await db.masterPlace.create({
          data: {
            name: cleanAct,
            cityId: cityId,
            category: "Activity",
            description: `Curated local experience and sightseeing activity in ${destinationName}.`,
            inclusions: ["Entry Tickets & Activity Passes", "Certified Local Experience Guide"],
            exclusions: ["Personal Souvenirs", "Optional Upgrades"],
          },
        });

        processedPlaceIds.add(newDraftPlace.id);
        resolvedPlaces.push(newDraftPlace);
        matchedSummary.placesDrafted.push({
          id: newDraftPlace.id,
          name: newDraftPlace.name,
          category: "Activity",
          draft: true,
        });
      }
    }

    // F. Restaurant Matching, Deduplication & Auto-Drafting
    const rawAiRestaurants: string[] = Array.isArray(parsed.restaurants)
      ? parsed.restaurants
      : [];

    const mergedRestaurantNames = Array.from(
      new Set(
        [
          ...rawAiRestaurants,
          ...(discoveredVenues?.restaurants || []),
          `The ${destinationName} Gourmet Kitchen`,
          `${destinationName} Authentic Local Diner`,
        ].filter((r): r is string => Boolean(r && r.trim().length > 2))
      )
    ).slice(0, 4);

    const existingRestaurants = await db.masterRestaurant.findMany({
      include: { city: true },
    });
    const resolvedRestaurants: any[] = [];
    const processedRestaurantIds = new Set<string>();

    for (const rawRestName of mergedRestaurantNames) {
      const cleanRest = rawRestName.trim();
      if (!cleanRest) continue;

      const matched = existingRestaurants.find((r) => {
        const rName = r.name.toLowerCase().trim();
        const query = cleanRest.toLowerCase().trim();
        return rName === query || rName.includes(query) || query.includes(rName);
      });

      if (matched) {
        if (!processedRestaurantIds.has(matched.id)) {
          processedRestaurantIds.add(matched.id);
          resolvedRestaurants.push(matched);
          matchedSummary.restaurantsMatched.push({
            id: matched.id,
            name: matched.name,
            cuisineType: matched.cuisineType,
          });
        }
      } else {
        // Create draft MasterRestaurant
        const newDraftRest = await db.masterRestaurant.create({
          data: {
            name: cleanRest,
            cityId: cityId,
            cuisineType: "Local & Multi-Cuisine",
            categoryType: "Restaurant",
            starRating: 4.6,
            reviewsCount: 150,
            offersPureVegJain: true,
          },
        });

        processedRestaurantIds.add(newDraftRest.id);
        resolvedRestaurants.push(newDraftRest);
        matchedSummary.restaurantsDrafted.push({
          id: newDraftRest.id,
          name: newDraftRest.name,
          cuisineType: "Local & Multi-Cuisine",
          draft: true,
        });
      }
    }

    // G. Flight Route Matching
    const existingFlightRoutes = await db.masterFlightRoute.findMany();
    let matchedFlightRoute = existingFlightRoutes.find((f) => {
      const sector = f.sector.toLowerCase();
      return (
        sector.includes(originCityName.toLowerCase()) &&
        sector.includes(destinationName.toLowerCase())
      );
    });

    if (matchedFlightRoute) {
      matchedSummary.flightsMatched = {
        sector: matchedFlightRoute.sector,
        airline: matchedFlightRoute.airline,
      };
    }

    // H. Master Policy Template
    const defaultPolicy = await db.masterPolicyTemplate.findFirst({
      orderBy: { createdAt: "desc" },
    });

    // I. AI-Generated Banner Image (or existing MasterBannerImage)
    const existingBanner = cityId
      ? await db.masterBannerImage.findFirst({
          where: { destinationCityId: cityId },
        })
      : null;

    const destinationCoverImage =
      existingBanner?.imageUrl ||
      (await generateAITripBanner(
        destinationName,
        parsed.trip_highlights || [],
        resolvedPlaces.map((p) => p.name),
        budgetLevel === "luxury" ? "luxury boutique travel" : "scenic vacation"
      ));

    // Save newly generated banner image to Master Data Hub's Curated Banner & Cover Library
    const existingSavedBanner = await db.masterBannerImage.findFirst({
      where: { imageUrl: destinationCoverImage },
    });

    if (!existingSavedBanner) {
      try {
        const bannerCityTag = originCityName || destinationName;
        const originCityRecord = await db.masterCity.findFirst({
          where: {
            name: {
              contains: originCityName,
              mode: "insensitive",
            },
          },
        });

        await db.masterBannerImage.create({
          data: {
            label: `${bannerCityTag} Banner`,
            imageUrl: destinationCoverImage,
            destinationCityId: originCityRecord?.id || cityId || null,
          },
        });
      } catch (bannerSaveErr) {
        console.warn("Auto-saving banner image to Master Data Hub:", bannerSaveErr);
      }
    }

    // 8. CONSTRUCT PREFILL TRIP BLUEPRINT OBJECT (matching TripFormWizard state)
    const today = new Date();
    const startDateObj = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead by default
    const endDateObj = new Date(startDateObj.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000);

    const startDateStr = startDateObj.toISOString().split("T")[0];
    const endDateStr = endDateObj.toISOString().split("T")[0];

    const multiCityList = resolvedCities.map((c) => c.name);
    // Departure City for return journey booking is set to whichever city the itinerary ends on for its final day (e.g. "Mumbai")
    const finalDepartureCity = resolvedCities[resolvedCities.length - 1]?.name || destinationName;

    // Distribute places and hotels across itinerary days
    const itineraryDays = [];
    const primaryHotel = resolvedHotels[0] || null;

    for (let i = 0; i < durationDays; i++) {
      const dayNum = i + 1;
      const cityIdx = Math.min(
        Math.floor((i / Math.max(1, durationDays)) * multiCityList.length),
        multiCityList.length - 1
      );
      const currentDayCity = multiCityList[cityIdx] || destinationName;
      const isFirstDay = i === 0;
      const isLastDay = i === durationDays - 1;

      const dayPlaces = resolvedPlaces
        .slice(i * 2, i * 2 + 2)
        .map((p) => p.name);

      if (dayPlaces.length === 0 && resolvedPlaces.length > 0) {
        dayPlaces.push(resolvedPlaces[i % resolvedPlaces.length].name);
      }

      let dayTitle = `Day ${dayNum} - ${currentDayCity} Sightseeing & Discovery`;
      let dayDesc = `Immersive day itinerary in ${currentDayCity}. Visit ${dayPlaces.join(
        " and "
      )}. Experience authentic local heritage, panoramic vistas, and curated cultural spots.`;

      if (isFirstDay) {
        dayTitle = `Arrival in ${currentDayCity} & Scenic Leisure`;
        dayDesc = `Arrive at ${currentDayCity} ex-${originCityName}. Private transfer to your curated stay. Relax, soak in the panoramic vistas, and enjoy local evening exploration.`;
      } else if (isLastDay) {
        dayTitle = `Farewell ${currentDayCity} & Return Departure`;
        dayDesc = `Enjoy a gourmet breakfast at your hotel in ${currentDayCity}. Complete check-out formalities, collect souvenirs, and transfer from ${currentDayCity} for your return journey to ${originCityName}.`;
      } else if (multiCityList.length > 1 && cityIdx > 0 && Math.floor(((i - 1) / Math.max(1, durationDays)) * multiCityList.length) !== cityIdx) {
        const prevCity = multiCityList[cityIdx - 1];
        dayTitle = `Scenic Transfer from ${prevCity} to ${currentDayCity} & Sightseeing`;
        dayDesc = `Scenic transfer journey from ${prevCity} to ${currentDayCity}. Check in to your stay, followed by sightseeing at ${dayPlaces.join(
          " and "
        )} with local photo stops.`;
      }

      itineraryDays.push({
        dayNumber: dayNum,
        cityOrStay: currentDayCity,
        title: dayTitle,
        durationHours: isFirstDay || isLastDay ? "Half Day (4-5 hrs)" : "Full Day (8-9 hrs)",
        description: dayDesc,
        places: dayPlaces,
        hotelId: primaryHotel?.id || null,
        hotelName: primaryHotel?.name || null,
        hotelPricePerNight: primaryHotel?.pricePerNight || null,
        hotelPricePerPerson: primaryHotel?.pricePerPerson || null,
        inclusions: [
          "Private Chauffeur-driven AC Vehicle for All Transfers",
          "Dedicated Experience Coordinator & Guide Assistance",
          "All Tolls, Parking, Inter-State Taxes & Driver Allowances",
        ],
        exclusions: [
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

    // Construct Accommodations list
    const accommodations = resolvedHotels.map((h, idx) => ({
      dayNumber: idx + 1,
      hotelName: h.name,
      location: `${destinationName}, ${primaryCity?.country || "India"}`,
      checkInDate: startDateStr,
      checkOutDate: endDateStr,
      starRating: h.starRating || 4,
      roomType: h.roomTypes?.[0] || "Deluxe Panoramic Suite",
      mealPlan: h.mealPlans?.[0] || "Daily Buffet Breakfast (CP)",
      ratingScore: h.guestScore || 4.8,
      ratingLabel: h.guestScoreLabel || "Very Good",
      facilities: h.facilities || ["Wi-Fi", "Restaurant", "Room Service"],
      nearbyAttractions: h.nearbyAttractions || [],
      nearbyRestaurants: h.nearbyRestaurants || [],
      photos: h.photos && h.photos.length > 0 ? h.photos : HOTEL_FALLBACK_IMAGES,
      pricePerNight: h.pricePerNight || 7500,
      pricePerPerson: h.pricePerPerson || 3750,
    }));

    // Flight details if needed
    const flightDetails = [];
    if (flightsNeeded || matchedFlightRoute) {
      flightDetails.push({
        sector: matchedFlightRoute?.sector || `${originCityName} - ${destinationName}`,
        airline: matchedFlightRoute?.airline || "IndiGo / Vistara Premium",
        departureDateTime: `${startDateStr}T08:30:00.000Z`,
        arrivalDateTime: `${startDateStr}T11:45:00.000Z`,
        durationText: matchedFlightRoute?.travelTime || "3h 15m",
        stops: matchedFlightRoute?.typicalStops || 0,
        layoverInfo: matchedFlightRoute?.typicalLayoverInfo || null,
        carryOnBaggageKg: matchedFlightRoute?.cabinBaggageKg || 7,
        checkInBaggageKg: matchedFlightRoute?.checkInBaggageKg || 15,
        cancellationPolicy:
          matchedFlightRoute?.cancellationPolicy ||
          "Partially refundable up to 48 hours prior to departure.",
        flightNotes: "Seats together pre-selected where available. Web check-in assistance provided.",
        type: matchedFlightRoute?.type || "Flight",
        travelTime: matchedFlightRoute?.travelTime || "3h 15m",
        isStartingTransfer: true,
        isPackageIncluded: true,
      });
    }

    // Restaurant suggestions list
    const restaurantSuggestions = resolvedRestaurants.map((r) => ({
      location: destinationName,
      cuisineType: r.cuisineType || "Local & Multi-Cuisine",
      name: r.name,
      rating: r.starRating || 4.5,
      reviewCount: r.reviewsCount || 120,
      isVeg: Boolean(r.offersPureVegJain),
      category: r.categoryType || "Restaurant",
    }));

    // AddOns list
    const addOns = [
      {
        name: "Comprehensive Travel & Medical Cover",
        detailsJson: { coverage: "All travellers", type: "Comprehensive Travel Shield" },
        price: 950,
        priceType: "per person",
      },
    ];

    // Price Quotes and Financials Calculation
    const baseHotelCost = (primaryHotel?.pricePerNight || 7000) * durationNights;
    const baseActivityCost = resolvedPlaces.length * 1200;
    const baseTransportCost = durationDays * 3500;
    const estimatedPerPerson = Math.round(
      (baseHotelCost + baseActivityCost + baseTransportCost) / numTravellers
    );

    const priceQuoteItems = [
      {
        label: `${durationDays}D/${durationNights}N Complete Land Package & Stays (Per Person)`,
        amount: estimatedPerPerson,
        sortOrder: 1,
      },
    ];

    if (flightsNeeded) {
      priceQuoteItems.push({
        label: `Return Airfare Ex-${originCityName} (Indicative Per Person)`,
        amount: 8500,
        sortOrder: 2,
      });
    }

    const tcsPercentage = 5.0;
    const totalAmountBeforeTcs =
      priceQuoteItems.reduce((sum, item) => sum + item.amount, 0) * numTravellers;
    const tcsAmount = Math.round(totalAmountBeforeTcs * (tcsPercentage / 100));
    const totalWithTcs = totalAmountBeforeTcs + tcsAmount;

    const promptLower = (prompt || "").toLowerCase();
    let tripType = "Getaway";
    if (
      promptLower.includes("adventure") ||
      promptLower.includes("trek") ||
      promptLower.includes("safari") ||
      promptLower.includes("hike")
    ) {
      tripType = "Adventure";
    } else if (promptLower.includes("honeymoon") || promptLower.includes("romantic")) {
      tripType = "Romantic Escape";
    } else if (
      promptLower.includes("heritage") ||
      promptLower.includes("temple") ||
      promptLower.includes("pilgrimage")
    ) {
      tripType = "Heritage Tour";
    } else if (promptLower.includes("family") || promptLower.includes("vacation")) {
      tripType = "Family Vacation";
    } else if (budgetLevel === "luxury") {
      tripType = "Luxury Retreat";
    }

    const firstCityName = resolvedCities[0]?.name || "Destination";
    const autoGeneratedTitle = `${originCityName} to ${firstCityName} ${tripType}`;

    const prefillTripData = {
      title: autoGeneratedTitle,
      pricingPlanTitle:
        budgetLevel === "luxury"
          ? "Luxury Boutique Plan"
          : budgetLevel === "budget"
          ? "Budget Explorer Plan"
          : "Premium Standard Plan",
      destination: `${resolvedCities[0]?.name || "Destination"}, ${resolvedCities[0]?.country || "India"}`,
      departureCity: finalDepartureCity,
      coverImage: destinationCoverImage,
      startDate: startDateStr,
      endDate: endDateStr,
      durationDays: durationDays,
      durationNights: durationNights,
      numTravellers: numTravellers,
      consultantName: matchedSummary.consultantMatched?.name || "Senior Travel Consultant",
      consultantPhone: matchedSummary.consultantMatched?.phone || "+91 98765 43210",
      transportationArrangement: "Planner",
      startingTransferDetails: `Private transfer arranged from ${originCityName} to ${multiCityList[0] || firstCityName}`,
      packageTransportationDetails: "Dedicated AC Vehicle for all local transfers and sightseeing tours as per itinerary.",
      priceQuoteItems: priceQuoteItems,
      tripFinancials: {
        tcsPercentage: tcsPercentage,
        tcsAmount: tcsAmount,
        totalWithTcs: totalWithTcs,
        notes: "Includes 5% TCS as per regulatory travel norms. Refundable/claimable in tax filing.",
      },
      itineraryDays: itineraryDays,
      accommodations: accommodations,
      flightDetails: flightDetails,
      addOns: addOns,
      restaurantSuggestions: restaurantSuggestions,
      tripTerms: {
        paymentPolicy:
          defaultPolicy?.paymentPolicy ||
          "30% advance on booking confirmation. 70% balance 15 days prior to departure date.",
        cancellationPolicy:
          defaultPolicy?.cancellationPolicy ||
          "Free cancellation up to 30 days prior to departure. 50% retention between 15-30 days. Non-refundable within 14 days.",
        visaRules:
          defaultPolicy?.visaRules ||
          "Valid ID proof required for domestic travel. Passport with 6 months validity for international destinations.",
        generalNotes:
          defaultPolicy?.generalNotes ||
          "Standard hotel check-in is 14:00 hrs and check-out is 11:00 hrs. Early check-in subject to room availability.",
      },
    };

    return NextResponse.json({
      status: "success",
      tripBlueprint: prefillTripData,
      matchedSummary: matchedSummary,
      highlights: parsed.trip_highlights || [
        `${durationDays} Days / ${durationNights} Nights curated package to ${destinationName}`,
        `Handpicked accommodation (${primaryHotel?.name || "Boutique Resort"})`,
        `Includes ${resolvedPlaces.length} activities & top local dining spots`,
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
