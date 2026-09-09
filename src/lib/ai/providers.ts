import { GoogleGenerativeAI } from "@google/generative-ai";
import { withExponentialBackoff } from "./retry";

export type AIProvider = "groq" | "gemini" | "openrouter" | "openrouter-fallback" | "groq-fallback";

export interface AIProviderResult {
  rawText: string;
  providerUsed: AIProvider;
  isFallback: boolean;
  needsAdminReview: boolean;
  modelName: string;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Common JSON output schema definition shared across all providers
export const COMMON_SCHEMA_DEFINITION = `
OUTPUT JSON SCHEMA:
{
  "master_data": {
    "city": { "action": "existing|new", "city_id": "", "city_name": "", "state_name": "", "country_name": "" },
    "banner": { "action": "existing|new", "city": "", "badge_text": "", "image_url_or_prompt": "" },
    "consultant": { "action": "existing|new", "consultant_name": "", "assigned_departure_city": "", "direct_phone": "", "email_address": "" },
    "places": [
      { "action": "existing|new", "city": "", "place_name": "", "category": "", "description_historical_significance": "", "place_inclusions": [], "place_exclusions": [], "needs_admin_review": false, "review_notes": "" }
    ],
    "global_inclusions_exclusions": { "inclusions": [], "exclusions": [] },
    "hotels": [
      { "action": "existing|new", "hotel_name": "", "destination_city": "", "star_rating": 0, "price_per_night": 0, "price_per_person": 0, "guest_score": 0.0, "guest_score_label": "", "room_types": [], "meal_plans": [], "amenities": [], "photo_urls": [], "needs_admin_review": false, "review_notes": "" }
    ],
    "transportation": [
      { "action": "existing|new", "transportation_type": "", "preferred_travel_time": "", "route_sector": "", "carrier_provider_name": "", "route_vehicle_code": "", "number_of_stops": 0, "transit_details": "", "cabin_baggage_kg": 0, "checkin_baggage_kg": 0, "cancellation_advisory_policy": "", "route_notes_advisory": "" }
    ],
    "addons": [
      { "action": "existing|new", "package_item_name": "", "category_type": "", "default_price": 0, "visa_service_subtype": "", "stay_validity_window_expiry": "", "description_features": "", "city": "" }
    ],
    "restaurants": [
      { "action": "existing|new", "restaurant_club_name": "", "destination_city": "", "category_types": [], "cuisine_specialties": [], "star_rating": 0, "reviews_count": 0, "veg_jain_option": true, "needs_admin_review": false, "review_notes": "" }
    ]
  },
  "trip_blueprint": {
    "tab1_core_trip_consultant": { "itinerary_title": "", "main_tour_planner_image": "", "destination_country_city": "", "departure_city": "", "start_date": "", "end_date": "", "duration_days": 0, "duration_nights": 0, "number_of_travellers": 0, "consultant_name": "", "consultant_phone": "" },
    "tab2_day_wise_planning": [ { "day_number": 1, "date": "", "city": "", "hotel_ref": "", "places_selected": [] } ],
    "tab3_day_by_day_itinerary": [ { "day_number": 1, "day_theme_title": "", "duration": "", "places_included": [], "hotel_shown": "", "day_description": "" } ],
    "tab4_stays_accommodations": [ { "day_number": 1, "date": "", "location_city": "", "hotel_name": "", "price_per_night": 0, "rating": 0 } ],
    "tab5_transportation": { "mode": "own|trip_planner", "starting_point_hub_transfer": "", "package_level_included_transportation": "", "transportation_entries": [ { "transit_type": "", "sector_route": "", "carrier_airline": "", "preferred_travel_time": "", "estimated_departure": "", "estimated_arrival": "", "transit_notes_instructions": "" } ] },
    "tab6_addons": [ { "ref_or_new": "", "package_item_name": "" } ],
    "tab7_restaurants": [ { "ref_or_new": "", "restaurant_name": "" } ],
    "tab8_master_policies": { "note": "always reference the single default Policy Template + Tax Setting from master_data — never generate a new one" },
    "tab9_price_quotes": { "line_items": [ { "item_name": "", "price": 0 } ], "tax_percentage_from_master": 0, "total_auto_calculated": 0 }
  },
  "validation": { "missing_fields": [], "assumptions_made": [], "needs_admin_review": [] }
}`;

// Mode 1: Full Detail Structuring Prompt
export const SYSTEM_PROMPT_MODE1 = `SYSTEM PROMPT — MODE 1 (Full Detail Ingestion)

You are the data-structuring engine for a Trip Planner Dashboard. You will receive:
1. A raw trip description written by a travel consultant (unstructured text).
2. A JSON dump of CURRENT MASTER DATA (existing cities, hotels, consultants, places,
   restaurants, add-ons, transportation, the single policy template, and the tax setting).

YOUR JOB
- Parse the raw trip description completely. Do not skip or summarize away any detail —
  every hotel, place, meal plan, price, date, and policy note mentioned must land in a field.
- For every entity you extract (city, hotel, consultant, place, restaurant, add-on,
  transportation route), FIRST check it against CURRENT MASTER DATA using
  case-insensitive fuzzy matching on name + city.
    - If a close match exists, set "action": "existing" and reuse its ID/name exactly
      as stored — do NOT create a duplicate row even if wording differs slightly
      (e.g. "Taj Palace" vs "The Taj Palace Hotel" = same hotel).
    - If no match exists, set "action": "new" and populate every field you can find
      evidence for in the raw text. Never invent data that wasn't stated or clearly implied.
- Auto-calculate: duration_days, duration_nights (from start_date/end_date), and
  tab9 total (sum of line items + tax_percentage_from_master, where the tax percentage
  is ALWAYS pulled from master_data.tax_setting, never invented).
- tab8_master_policies and the tax percentage are NEVER generated fresh — always
  reference the single existing Policy Template and Tax Setting from master data.
- Populate ALL 9 Trip Blueprint tabs. If a tab has no information in the raw text,
  leave its fields empty and list the gap in validation.missing_fields — never guess.
- consultant_name/consultant_phone in tab1 must be auto-selected from master_data
  based on the destination city's assigned consultant — not asked of the user again.
- Output ONLY valid JSON matching the schema below. No prose, no markdown fences.

${COMMON_SCHEMA_DEFINITION}`;

// Mode 2 Primary: Destination-Only Research with Live Grounding (Gemini)
export const SYSTEM_PROMPT_MODE2_PRIMARY = `SYSTEM PROMPT — MODE 2 (Destination-Only Auto-Research with Live Grounding)

You are the trip-research and data-structuring engine for a Trip Planner Dashboard.
You have access to Google Search live grounding. You will receive:
1. A minimal brief: destination (city/country), number of travellers, and optionally
   dates, budget level, or trip length.
2. A JSON dump of CURRENT MASTER DATA (same as Mode 1).

YOUR JOB
- Use live search to find REAL, currently-operating options for the destination:
  - 4-6 real hotels across a spread of star ratings, with genuine star rating,
    an approximate current nightly price, and real amenities/room types where available.
  - 6-10 real places/attractions with accurate category and a short factual
    description or historical note — verify names exist, don't fabricate landmarks.
  - 4-6 real restaurants, tagging veg/Jain-friendly options only when you have
    actual evidence (menu, reviews) — never assume.
  - Realistic transportation options for reaching/moving within the destination
    (typical carriers, routes, baggage allowances for that market).
- Cross-check every found entity against CURRENT MASTER DATA first (same fuzzy
  matching rule as Mode 1): reuse existing entries via "action": "existing",
  only create "action": "new" entries for things genuinely not yet stored.
- Build a sensible default day-by-day plan sized to the traveller count and any
  stated trip length (default to a reasonable 4-6 day itinerary if no length given),
  distributing the researched places and one hotel per stay logically by proximity.
- Where you cannot verify a fact via search (e.g. exact current price), mark it in
  validation.assumptions_made with your best estimate AND flag it in
  validation.needs_admin_review — never present an unverified figure as certain.
- tab8_master_policies and tax percentage: always reference the existing single
  Policy Template + Tax Setting from master data, never generate new ones.
- Populate ALL 9 Trip Blueprint tabs fully, using the researched + matched data.
- Output ONLY valid JSON matching the schema below. No prose, no markdown fences.

${COMMON_SCHEMA_DEFINITION}`;

// Mode 2 Fallback: Destination-Only Research WITHOUT Grounding (Groq/OpenRouter)
export const SYSTEM_PROMPT_MODE2_FALLBACK = `SYSTEM PROMPT — MODE 2 FALLBACK (Destination-Only Research - UNGROUNDED / NO LIVE SEARCH)

CRITICAL INSTRUCTION:
You are operating in fallback mode WITHOUT live web search grounding.
Because you cannot perform live Google search verification:
1. Generate realistic, plausible, and high-quality suggestions for hotels, attractions, restaurants, and day-wise plans for the destination.
2. In the output JSON:
   - For EVERY hotel in master_data.hotels: set "needs_admin_review": true and "review_notes": "generated without live verification — confirm before publishing".
   - For EVERY place in master_data.places: set "needs_admin_review": true and "review_notes": "generated without live verification — confirm before publishing".
   - For EVERY restaurant in master_data.restaurants: set "needs_admin_review": true and "review_notes": "generated without live verification — confirm before publishing".
   - In "validation.needs_admin_review": include "Some details were generated without live verification — confirm before publishing".
3. Check entities against CURRENT MASTER DATA (fuzzy matching): reuse existing entries with "action": "existing" where matching.
4. Auto-calculate durations and tab9 totals using master_data.tax_setting.
5. Populate all 9 Trip Blueprint tabs completely.
6. Output ONLY valid JSON matching the schema below. No prose, no markdown fences.

${COMMON_SCHEMA_DEFINITION}`;

/**
 * 1. Groq Provider (OpenAI-Compatible REST API)
 */
export async function callGroq(options: {
  apiKey: string;
  model?: string;
  systemInstruction: string;
  userPrompt: string;
  chatHistory?: ChatHistoryMessage[];
  temperature?: number;
}): Promise<{ text: string; model: string }> {
  const {
    apiKey,
    model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    systemInstruction,
    userPrompt,
    chatHistory = [],
    temperature = 0.2,
  } = options;

  return await withExponentialBackoff(
    async () => {
      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemInstruction },
      ];

      for (const msg of chatHistory) {
        messages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        });
      }

      messages.push({ role: "user", content: userPrompt });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      let res: Response;
      try {
        res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: temperature,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "");
        let parsedErr: any = null;
        try {
          parsedErr = JSON.parse(errorBody);
        } catch {}

        const errMessage = parsedErr?.error?.message || errorBody || `HTTP ${res.status} ${res.statusText}`;
        const err: any = new Error(`Groq API error (${res.status}): ${errMessage}`);
        err.status = res.status;
        err.statusCode = res.status;
        throw err;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      if (!text) {
        throw new Error("Groq API returned an empty completion response.");
      }

      return { text, model };
    },
    {
      providerName: `Groq (${model})`,
      maxAttempts: 3,
      delaysMs: [1000, 2000, 4000],
    }
  );
}

/**
 * 2. OpenRouter Provider (OpenAI-Compatible REST API)
 */
export async function callOpenRouter(options: {
  apiKey: string;
  model?: string;
  systemInstruction: string;
  userPrompt: string;
  chatHistory?: ChatHistoryMessage[];
  temperature?: number;
}): Promise<{ text: string; model: string }> {
  const {
    apiKey,
    model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
    systemInstruction,
    userPrompt,
    chatHistory = [],
    temperature = 0.2,
  } = options;

  return await withExponentialBackoff(
    async () => {
      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemInstruction },
      ];

      for (const msg of chatHistory) {
        messages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        });
      }

      messages.push({ role: "user", content: userPrompt });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      let res: Response;
      try {
        res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
            "HTTP-Referer": "https://trip-planner.local",
            "X-Title": "Trip Planner Dashboard",
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: temperature,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "");
        let parsedErr: any = null;
        try {
          parsedErr = JSON.parse(errorBody);
        } catch {}

        const errMessage = parsedErr?.error?.message || errorBody || `HTTP ${res.status} ${res.statusText}`;
        const err: any = new Error(`OpenRouter API error (${res.status}): ${errMessage}`);
        err.status = res.status;
        err.statusCode = res.status;
        throw err;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      if (!text) {
        throw new Error("OpenRouter API returned an empty completion response.");
      }

      return { text, model };
    },
    {
      providerName: `OpenRouter (${model})`,
      maxAttempts: 3,
      delaysMs: [1000, 2000, 4000],
    }
  );
}

/**
 * 3. Gemini Provider (Google Generative AI SDK)
 */
export async function callGemini(options: {
  apiKey: string;
  systemInstruction: string;
  userPrompt: string;
  chatHistory?: ChatHistoryMessage[];
  candidateModels?: string[];
  temperature?: number;
}): Promise<{ text: string; model: string }> {
  const {
    apiKey,
    systemInstruction,
    userPrompt,
    chatHistory = [],
    candidateModels = [
      process.env.GEMINI_MODEL,
      "gemini-3.6-flash",
      "gemini-3-flash",
      "gemini-2.0-flash-exp",
      "gemini-flash-latest",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ].filter((m): m is string => Boolean(m && m.trim())),
    temperature = 0.2,
  } = options;

  const genAI = new GoogleGenerativeAI(apiKey);

  // Format contents for Gemini SDK
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const msg of chatHistory) {
    if (msg.role === "user") {
      contents.push({ role: "user", parts: [{ text: msg.content }] });
    } else if (msg.role === "assistant") {
      contents.push({ role: "model", parts: [{ text: msg.content }] });
    }
  }
  contents.push({ role: "user", parts: [{ text: userPrompt }] });

  return await withExponentialBackoff(
    async () => {
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemInstruction,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: temperature,
            },
          });

          const result = await model.generateContent({ contents });
          const text = result.response.text();
          if (text) {
            return { text, model: modelName };
          }
        } catch (err: any) {
          lastErr = err;
          // Log model attempt failure
          console.warn(`[Gemini SDK] Model '${modelName}' failed:`, err?.message || err);
          
          // If auth issue (401/403), fail immediately since other models will also fail
          const status = Number(err?.status || err?.statusCode || (err?.message?.includes("401") ? 401 : err?.message?.includes("403") ? 403 : 0));
          if (status === 401 || status === 403) {
            throw err;
          }
          // For 404 (model not found) or 503 on this specific model, continue to try next candidate model
        }
      }

      throw lastErr || new Error("No candidate Gemini model returned a successful response.");
    },
    {
      providerName: "Google Gemini",
      maxAttempts: 3,
      delaysMs: [1000, 2000, 4000],
    }
  );
}

/**
 * 4. Master Orchestrator with Fallback Routing
 */
export async function generateTripWithFallback(params: {
  mode: "mode1" | "mode2";
  prompt: string;
  currentMasterData: any;
  chatHistory?: ChatHistoryMessage[];
}): Promise<AIProviderResult> {
  const { mode, prompt, currentMasterData, chatHistory = [] } = params;

  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();

  const userPromptPayload = `${mode === "mode1" ? "RAW_TRIP_TEXT" : "DESTINATION_BRIEF"}:\n${prompt}\n\nCURRENT_MASTER_DATA:\n${JSON.stringify(
    currentMasterData,
    null,
    2
  )}`;

  // -------------------------------------------------------------
  // MODE 1: Full Detail Structuring
  // Primary: Groq -> Fallback: OpenRouter -> (Emergency: Gemini)
  // -------------------------------------------------------------
  if (mode === "mode1") {
    // 1. Try Primary: Groq
    if (groqApiKey) {
      try {
        console.log("[AI Routing] Mode 1: Attempting Primary Provider -> Groq");
        const res = await callGroq({
          apiKey: groqApiKey,
          systemInstruction: SYSTEM_PROMPT_MODE1,
          userPrompt: userPromptPayload,
          chatHistory: chatHistory,
        });

        return {
          rawText: res.text,
          providerUsed: "groq",
          isFallback: false,
          needsAdminReview: false,
          modelName: res.model,
        };
      } catch (groqErr: any) {
        console.warn("[AI Routing] Primary provider Groq failed after retries:", groqErr?.message || groqErr);
      }
    } else {
      console.warn("[AI Routing] Mode 1: GROQ_API_KEY is not configured, skipping primary to fallback.");
    }

    // 2. Try Fallback: OpenRouter
    if (openRouterApiKey) {
      try {
        console.log("[AI Routing] Mode 1: Attempting Fallback Provider -> OpenRouter");
        const res = await callOpenRouter({
          apiKey: openRouterApiKey,
          systemInstruction: SYSTEM_PROMPT_MODE1,
          userPrompt: userPromptPayload,
          chatHistory: chatHistory,
        });

        return {
          rawText: res.text,
          providerUsed: "openrouter-fallback",
          isFallback: true,
          needsAdminReview: false,
          modelName: res.model,
        };
      } catch (openRouterErr: any) {
        console.warn("[AI Routing] Fallback provider OpenRouter failed after retries:", openRouterErr?.message || openRouterErr);
      }
    }

    // 3. Emergency Backup: Gemini
    if (geminiApiKey) {
      try {
        console.log("[AI Routing] Mode 1: Attempting Emergency Fallback -> Gemini");
        const res = await callGemini({
          apiKey: geminiApiKey,
          systemInstruction: SYSTEM_PROMPT_MODE1,
          userPrompt: userPromptPayload,
          chatHistory: chatHistory,
        });

        return {
          rawText: res.text,
          providerUsed: "gemini",
          isFallback: true,
          needsAdminReview: false,
          modelName: res.model,
        };
      } catch (geminiErr: any) {
        console.error("[AI Routing] Emergency fallback Gemini failed:", geminiErr?.message || geminiErr);
      }
    }

    // If all providers failed
    const err: any = new Error("All AI providers (Groq, OpenRouter, Gemini) failed to generate Mode 1 trip.");
    err.status = 503;
    throw err;
  }

  // -------------------------------------------------------------
  // MODE 2: Destination-Only Research
  // Primary: Gemini (Live Grounding) -> Fallback: Groq (Ungrounded, needs_admin_review: true)
  // -------------------------------------------------------------
  if (mode === "mode2") {
    // 1. Try Primary: Gemini
    if (geminiApiKey) {
      try {
        console.log("[AI Routing] Mode 2: Attempting Primary Provider -> Gemini (with Grounding)");
        const res = await callGemini({
          apiKey: geminiApiKey,
          systemInstruction: SYSTEM_PROMPT_MODE2_PRIMARY,
          userPrompt: userPromptPayload,
          chatHistory: chatHistory,
        });

        return {
          rawText: res.text,
          providerUsed: "gemini",
          isFallback: false,
          needsAdminReview: false,
          modelName: res.model,
        };
      } catch (geminiErr: any) {
        console.warn("[AI Routing] Primary provider Gemini failed after retries:", geminiErr?.message || geminiErr);
      }
    } else {
      console.warn("[AI Routing] Mode 2: GEMINI_API_KEY is not configured, skipping primary to fallback.");
    }

    // 2. Try Fallback: Groq (Ungrounded prompt with review notices)
    if (groqApiKey) {
      try {
        console.log("[AI Routing] Mode 2: Attempting Fallback Provider -> Groq (Ungrounded with Admin Review flags)");
        const res = await callGroq({
          apiKey: groqApiKey,
          systemInstruction: SYSTEM_PROMPT_MODE2_FALLBACK,
          userPrompt: userPromptPayload,
          chatHistory: chatHistory,
        });

        return {
          rawText: res.text,
          providerUsed: "groq-fallback",
          isFallback: true,
          needsAdminReview: true,
          modelName: res.model,
        };
      } catch (groqErr: any) {
        console.warn("[AI Routing] Fallback provider Groq failed after retries:", groqErr?.message || groqErr);
      }
    }

    // 3. Try Emergency Fallback: OpenRouter (Ungrounded prompt with review notices)
    if (openRouterApiKey) {
      try {
        console.log("[AI Routing] Mode 2: Attempting Emergency Fallback -> OpenRouter (Ungrounded with Admin Review flags)");
        const res = await callOpenRouter({
          apiKey: openRouterApiKey,
          systemInstruction: SYSTEM_PROMPT_MODE2_FALLBACK,
          userPrompt: userPromptPayload,
          chatHistory: chatHistory,
        });

        return {
          rawText: res.text,
          providerUsed: "openrouter-fallback",
          isFallback: true,
          needsAdminReview: true,
          modelName: res.model,
        };
      } catch (openRouterErr: any) {
        console.error("[AI Routing] Emergency fallback OpenRouter failed:", openRouterErr?.message || openRouterErr);
      }
    }

    // If all providers failed
    const err: any = new Error("All AI providers (Gemini, Groq, OpenRouter) failed to generate Mode 2 trip.");
    err.status = 503;
    throw err;
  }

  throw new Error(`Unsupported mode: ${mode}`);
}
