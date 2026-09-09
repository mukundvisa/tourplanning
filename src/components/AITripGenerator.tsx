"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Compass,
  BedDouble,
  Landmark,
  UtensilsCrossed,
  Plane,
  RotateCcw,
  Calendar,
  Users,
  MapPin,
  Tag,
  ShieldCheck,
  Bot,
  User,
  PlusCircle,
  Clock,
  Sparkle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListFilter,
  FileText,
  Search,
  Sliders,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";

import toast from "react-hot-toast";

export interface AITripGeneratorProps {
  onReviewAndEdit: (prefillData: any) => void;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
  isClarification?: boolean;
  missingFields?: string[];
  modeUsed?: "mode1" | "mode2";
  generated_by?: "groq" | "gemini" | "openrouter" | "openrouter-fallback" | "groq-fallback" | string;
  isFallback?: boolean;
  needsAdminReview?: boolean;
  modelUsed?: string;
  validation?: {
    missing_fields?: string[];
    assumptions_made?: string[];
    needs_admin_review?: string[];
  };
  blueprintResult?: {
    tripBlueprint: any;
    matchedSummary: any;
    highlights?: string[];
  };
  error?: string;
}

interface StarterPrompt {
  id: string;
  tag: string;
  title: string;
  duration: string;
  prompt: string;
  suggestedMode: "mode1" | "mode2";
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: "manali",
    tag: "Family Adventure",
    title: "Manali Mountain Getaway",
    duration: "5D / 4N",
    prompt: "5-day family trip to Manali for 4 pax, budget hotels, adventure activities, ex-Delhi with private taxi transfers",
    suggestedMode: "mode2",
  },
  {
    id: "dubai-detailed",
    tag: "Mode 1 • Consultant Brief",
    title: "Dubai Luxury Full Itinerary",
    duration: "6D / 5N",
    prompt: `Trip: 6D/5N Luxury Dubai for 2 Pax. Departure: Mumbai on 2026-10-15 to 2026-10-20.
Hotel: Atlantis The Palm (Deluxe Ocean Room, Breakfast Included, Rs 28000/night).
Day 1: Arrive Dubai, private airport transfer, evening Marina Dhow Dinner Cruise.
Day 2: Morning Dubai Frame & Old Dubai Heritage tour, Afternoon Burj Khalifa 124th floor at sunset.
Day 3: Premium 4x4 Red Dune Desert Safari with BBQ dinner and Tanoura dance.
Day 4: Full Day Atlantis Aquaventure Waterpark & Lost Chambers Aquarium passes.
Day 5: Luxury Yacht Tour from Dubai Harbour, evening Dubai Mall Fountain Show & dinner at Armani Ristorante.
Day 6: Breakfast at hotel, souk shopping, private transfer to DXB airport for return flight to BOM.
Flights: Emirates BOM-DXB return, 30kg checkin baggage included.
Pricing: Rs 1,45,000 per person + 5% TCS. Consultant: Senior Travel Consultant.`,
    suggestedMode: "mode1",
  },
  {
    id: "jaipur",
    tag: "Heritage & Culture",
    title: "Royal Jaipur Exploration",
    duration: "4D / 3N",
    prompt: "4-day cultural exploration in Jaipur with heritage stays, Amber Fort elephant ride, and authentic Rajasthani cuisine for 2 travellers",
    suggestedMode: "mode2",
  },
  {
    id: "kerala-detailed",
    tag: "Mode 1 • Multi-City Text",
    title: "Kerala Backwaters & Munnar",
    duration: "5D / 4N",
    prompt: `5-Day Kerala Itinerary for 2 travellers. Start: 2026-11-10 to 2026-11-14. Ex-Bangalore.
Stays: Blanket Hotel Munnar (2 nights, Rs 8500/nt, MAP) & Punnamada Resort Alleppey (2 nights, Rs 9500/nt, CP).
Day 1: Arrive Kochi, scenic drive to Munnar, visit Cheeyappara waterfalls.
Day 2: Munnar Tea Museum, Eravikulam National Park, Mattupetty Dam boating.
Day 3: Transfer to Alleppey, check in to backwater resort, sunset motorboat cruise.
Day 4: Village kayak tour in Kuttanad canals, Marari beach evening visit.
Day 5: Breakfast, transfer back to Kochi airport for return departure.
Includes: Private AC Sedan for all transfers, tolls, driver charges. Total package: Rs 38,000 per person + 5% TCS.`,
    suggestedMode: "mode1",
  },
  {
    id: "goa",
    tag: "Coastal & Leisure",
    title: "Goa Beach & Nightlife",
    duration: "6D / 5N",
    prompt: "6-day tropical escape to Goa with beach resorts, water sports, and sunset cruises for 2 adults",
    suggestedMode: "mode2",
  },
  {
    id: "kashmir",
    tag: "Scenic Paradise",
    title: "Kashmir Valley & Houseboat",
    duration: "6D / 5N",
    prompt: "6-day scenic family vacation in Kashmir with Dal Lake luxury houseboat stay, Gulmarg gondola Phase 2, and Pahalgam Betaab valley tours for 4 travellers",
    suggestedMode: "mode2",
  },
];

export function AITripGenerator({ onReviewAndEdit }: AITripGeneratorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-greeting",
      role: "assistant",
      content:
        "Hello! I am your AI Trip Blueprint Architect. You can supply either a **detailed itinerary brief from a consultant (Mode 1)** or a **minimal destination request for live auto-research (Mode 2)**. I will automatically cross-reference existing Master Data Hub records, draft any new items, and populate all 9 Trip Blueprint tabs accurately.",
      timestamp: "Ready",
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState("");
  const [selectedMode, setSelectedMode] = useState<"auto" | "mode1" | "mode2">("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [promptViewMode, setPromptViewMode] = useState<"slider" | "grid">("slider");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollSlider = (direction: "left" | "right") => {
    if (sliderRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, loadingStep]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const loadingMessages = [
    "Injecting Master Data Hub catalogs (hotels, places, tax, consultants)...",
    "Running AI entity extraction & case-insensitive fuzzy matching...",
    "Drafting new catalog entities and computing 9-tab blueprint...",
    "Synthesizing complete day-by-day itinerary & financial quotes...",
  ];

  const handleSendPrompt = async (textToSend?: string, overrideMode?: "auto" | "mode1" | "mode2") => {
    const promptText = (textToSend || inputPrompt).trim();
    if (!promptText || isLoading) return;

    const currentMode = overrideMode || selectedMode;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputPrompt("");
    setIsLoading(true);

    try {
      const historyPayload = newMessages
        .filter((m) => m.id !== "initial-greeting" && !m.error)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/generate-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          mode: currentMode,
          chatHistory: historyPayload.slice(0, -1),
        }),
      });

      const data = await res.json();

      if (data.remaining !== undefined) {
        setRemainingQuota(data.remaining);
      }

      if (!res.ok || data.status === "error") {
        const errorMsg: ChatMessage = {
          id: `ai-err-${Date.now()}`,
          role: "assistant",
          content: data.error || "Failed to generate trip. Please try again or refine your prompt.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          error: data.error || "Generation error",
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      if (data.status === "needs_clarification") {
        const clarificationMsg: ChatMessage = {
          id: `ai-clarify-${Date.now()}`,
          role: "assistant",
          content: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isClarification: true,
          missingFields: data.missing_fields || [],
        };
        setMessages((prev) => [...prev, clarificationMsg]);
        return;
      }

      if (data.status === "success" && data.tripBlueprint) {
        const successMsg: ChatMessage = {
          id: `ai-success-${Date.now()}`,
          role: "assistant",
          content: `Trip blueprint successfully generated for **${data.tripBlueprint.destination}** (${data.tripBlueprint.durationDays} Days / ${data.tripBlueprint.durationNights} Nights for ${data.tripBlueprint.numTravellers} travellers). All Master Data items have been cross-referenced and resolved into the 9 tabs.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          modeUsed: data.modeUsed,
          generated_by: data.generated_by,
          isFallback: data.isFallback,
          needsAdminReview: data.needsAdminReview,
          modelUsed: data.modelUsed,
          validation: data.validation,
          blueprintResult: {
            tripBlueprint: data.tripBlueprint,
            matchedSummary: data.matchedSummary,
            highlights: data.highlights,
          },
        };
        setMessages((prev) => [...prev, successMsg]);
      }
    } catch (err: any) {
      console.error("AI Trip generation error:", err);
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: "assistant",
        content: "AI services are currently experiencing high demand or a network issue. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        error: err.message,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  const handleResetChat = () => {
    const prevMessages = [...messages];
    const prevPrompt = inputPrompt;

    setMessages([
      {
        id: "initial-greeting",
        role: "assistant",
        content:
          "Hello! I am your AI Trip Blueprint Architect. You can supply either a **detailed itinerary brief from a consultant (Mode 1)** or a **minimal destination request for live auto-research (Mode 2)**. I will automatically cross-reference existing Master Data Hub records, draft any new items, and populate all 9 Trip Blueprint tabs accurately.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInputPrompt("");

    toast(
      (t) => (
        <div className="flex items-center justify-between gap-3 text-xs w-full">
          <div className="flex flex-col">
            <span className="font-semibold text-white">Conversation cleared</span>
            <span className="text-[11px] text-zinc-400">Restorable within 5s</span>
          </div>
          <button
            onClick={() => {
              setMessages(prevMessages);
              setInputPrompt(prevPrompt);
              toast.dismiss(t.id);
              toast.success("Chat history restored", {
                duration: 2500,
                style: {
                  background: "#14213D",
                  color: "#fff",
                  border: "1px solid rgba(184, 148, 79, 0.4)",
                  fontSize: "12px",
                },
              });
            }}
            className="px-2.5 py-1 bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold rounded shadow-sm transition-all cursor-pointer shrink-0"
          >
            Undo
          </button>
        </div>
      ),
      {
        duration: 5000,
        style: {
          background: "#14213D",
          color: "#fff",
          border: "1px solid rgba(184, 148, 79, 0.4)",
          borderRadius: "8px",
          padding: "10px 14px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
        },
      }
    );
  };

  const handleCopySummary = (messageId: string, blueprint: any) => {
    const text = `Trip Blueprint: ${blueprint.title}
Destination: ${blueprint.destination}
Duration: ${blueprint.durationDays}D / ${blueprint.durationNights}N
Travellers: ${blueprint.numTravellers}
Departure: ${blueprint.departureCity}
Plan Tier: ${blueprint.pricingPlanTitle}`;
    navigator.clipboard.writeText(text);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Top Header Card */}
      <div className="bg-white border border-[#B8944F]/30 rounded-xl p-4 sm:p-5 shadow-2xs mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#14213D] to-[#253858] text-[#B8944F] flex items-center justify-center shadow-xs shrink-0 border border-[#B8944F]/30">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-[#14213D] font-fraunces">
                AI Trip Blueprint Engine
              </h2>
              <span className="px-2 py-0.5 bg-[#B8944F]/15 text-[#B8944F] text-[10px] font-bold rounded-full uppercase tracking-wider">
                Dual-Mode Ingestion
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Accurate parsing & auto-research with real Master Data Hub matching across all 9 blueprint tabs.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {remainingQuota !== null && (
            <div className="text-[11px] bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded-lg text-zinc-600 font-medium">
              <span className="text-[#B8944F] font-bold">{remainingQuota}</span>/30 gens left
            </div>
          )}
          <button
            onClick={handleResetChat}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 text-zinc-600 hover:text-[#14213D] text-xs font-semibold bg-white transition-colors cursor-pointer"
            title="Reset Chat Session"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Session</span>
          </button>
        </div>
      </div>

      {/* Main Chat Conversation Stream */}
      <div className="flex-1 overflow-y-auto bg-white border border-zinc-200/90 rounded-xl p-4 sm:p-6 shadow-2xs space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* Avatar */}
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.role === "user"
                  ? "bg-[#14213D] text-white"
                  : "bg-[#B8944F]/20 text-[#B8944F] border border-[#B8944F]/40"
              }`}
            >
              {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Bubble Content */}
            <div
              className={`max-w-2xl sm:max-w-3xl flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div className="flex flex-wrap items-center gap-1.5 mb-1 px-1">
                <span className="text-[11px] font-bold text-zinc-600">
                  {msg.role === "user" ? "You (Admin)" : "AI Trip Engine"}
                </span>
                {msg.modeUsed && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-[#B8944F]/10 text-[#B8944F] font-bold rounded">
                    {msg.modeUsed === "mode1" ? "Mode 1 (Full Detail Ingest)" : "Mode 2 (Auto-Research)"}
                  </span>
                )}
                {msg.generated_by && (
                  <span
                    className={`text-[10px] px-2 py-0.5 font-bold rounded-full border flex items-center gap-1 ${
                      msg.generated_by === "groq"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : msg.generated_by === "gemini"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : msg.generated_by === "groq-fallback"
                        ? "bg-amber-100 text-amber-900 border-amber-300 font-extrabold"
                        : msg.generated_by === "openrouter-fallback" || msg.generated_by === "openrouter"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-zinc-100 text-zinc-700 border-zinc-300"
                    }`}
                  >
                    {msg.generated_by === "groq" && "⚡ Groq Fast Engine"}
                    {msg.generated_by === "gemini" && "✨ Gemini (Search Grounded)"}
                    {msg.generated_by === "groq-fallback" && "⚠️ Groq Fallback (Ungrounded)"}
                    {(msg.generated_by === "openrouter-fallback" || msg.generated_by === "openrouter") && "🔀 OpenRouter Fallback"}
                    {!["groq", "gemini", "groq-fallback", "openrouter-fallback", "openrouter"].includes(msg.generated_by) &&
                      `Generated by: ${msg.generated_by}`}
                  </span>
                )}
                <span suppressHydrationWarning className="text-[10px] text-zinc-400">{msg.timestamp}</span>
              </div>

              <div
                className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#14213D] text-white rounded-tr-xs shadow-xs"
                    : msg.error
                    ? "bg-red-50 text-red-800 border border-red-200 rounded-tl-xs"
                    : msg.isClarification
                    ? "bg-amber-50/80 text-amber-900 border border-amber-200/90 rounded-tl-xs"
                    : "bg-[#FAF8F5] text-zinc-800 border border-zinc-200/80 rounded-tl-xs"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Prominent Ungrounded Review Warning Banner */}
                {(msg.needsAdminReview ||
                  msg.blueprintResult?.tripBlueprint?.needsAdminReview ||
                  (msg.validation?.needs_admin_review && msg.validation.needs_admin_review.length > 0)) && (
                  <div className="mt-3 p-3 bg-amber-500/15 border-2 border-amber-400 rounded-xl flex items-start gap-2.5 text-amber-950">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-900">
                        Admin Review Required
                      </p>
                      <p className="text-xs text-amber-900 font-medium leading-relaxed">
                        Some details were generated without live verification — please review before finalizing this trip.
                      </p>
                    </div>
                  </div>
                )}

                {/* Clarification Missing Fields Pills */}
                {msg.isClarification && msg.missingFields && msg.missingFields.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber-200/60 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center mr-1">
                      <AlertCircle className="h-3.5 w-3.5 mr-1 text-amber-600" />
                      Required Details Needed:
                    </span>
                    {msg.missingFields.map((field) => (
                      <span
                        key={field}
                        className="px-2.5 py-0.5 bg-amber-200/60 text-amber-900 font-semibold rounded-full text-[11px]"
                      >
                        {field.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                )}

                {/* Validation & Assumptions Section */}
                {msg.validation && (
                  (msg.validation.needs_admin_review && msg.validation.needs_admin_review.length > 0) ||
                  (msg.validation.assumptions_made && msg.validation.assumptions_made.length > 0)
                ) && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1.5">
                    {msg.validation.needs_admin_review && msg.validation.needs_admin_review.length > 0 && (
                      <div className="flex items-start space-x-1.5 text-amber-900">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Specific Items to Review: </span>
                          <span>{msg.validation.needs_admin_review.join("; ")}</span>
                        </div>
                      </div>
                    )}
                    {msg.validation.assumptions_made && msg.validation.assumptions_made.length > 0 && (
                      <div className="flex items-start space-x-1.5 text-zinc-700 text-[11px]">
                        <InfoIcon className="h-3.5 w-3.5 text-zinc-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Assumptions made: </span>
                          <span>{msg.validation.assumptions_made.join("; ")}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rich Trip Blueprint Summary Card */}
                {msg.blueprintResult && (
                  <div className="mt-4 pt-4 border-t border-zinc-200/90 w-full space-y-4">
                    <div className="bg-white border border-[#B8944F]/40 rounded-xl overflow-hidden shadow-xs">
                      {msg.blueprintResult.tripBlueprint.coverImage && (
                        <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-zinc-100">
                          <img
                            src={msg.blueprintResult.tripBlueprint.coverImage}
                            alt={msg.blueprintResult.tripBlueprint.destination}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                            <div>
                              <span className="text-white/80 text-[10px] uppercase tracking-wider font-bold block">
                                Destination Itinerary
                              </span>
                              <span className="text-white font-fraunces text-base sm:text-lg font-bold drop-shadow-md">
                                {msg.blueprintResult.tripBlueprint.destination}
                              </span>
                            </div>
                            <span className="px-2.5 py-1 bg-black/40 backdrop-blur-xs text-white text-[10px] font-bold rounded-md border border-white/20">
                              {msg.blueprintResult.tripBlueprint.durationDays}D / {msg.blueprintResult.tripBlueprint.durationNights}N
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="p-4 sm:p-5 space-y-4">
                        {/* Top Blueprint Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="px-2 py-0.5 bg-[#B8944F]/15 text-[#B8944F] rounded text-[10px] font-extrabold uppercase tracking-wider">
                                9-Tab Blueprint Ready
                              </span>
                              <span className="px-2 py-0.5 bg-[#6B7A5E]/15 text-[#6B7A5E] rounded text-[10px] font-extrabold uppercase tracking-wider">
                                {msg.blueprintResult.tripBlueprint.pricingPlanTitle}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-[#14213D] font-fraunces">
                              {msg.blueprintResult.tripBlueprint.title}
                            </h3>
                          </div>

                          <button
                            onClick={() =>
                              handleCopySummary(msg.id, msg.blueprintResult?.tripBlueprint)
                            }
                            className="inline-flex items-center space-x-1 text-xs text-zinc-500 hover:text-[#14213D] p-1.5 rounded hover:bg-zinc-100 transition-colors"
                            title="Copy Summary"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-[11px] text-emerald-600 font-bold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span className="text-[11px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Core Specs Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-xs border-b border-zinc-100">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-[#B8944F] shrink-0" />
                            <div>
                              <span className="text-[10px] text-zinc-400 block uppercase">Destination</span>
                              <span className="font-bold text-zinc-800 truncate block">
                                {msg.blueprintResult.tripBlueprint.destination}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-[#B8944F] shrink-0" />
                            <div>
                              <span className="text-[10px] text-zinc-400 block uppercase">Duration</span>
                              <span className="font-bold text-zinc-800">
                                {msg.blueprintResult.tripBlueprint.durationDays}D /{" "}
                                {msg.blueprintResult.tripBlueprint.durationNights}N
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-[#B8944F] shrink-0" />
                            <div>
                              <span className="text-[10px] text-zinc-400 block uppercase">Travellers</span>
                              <span className="font-bold text-zinc-800">
                                {msg.blueprintResult.tripBlueprint.numTravellers} Pax
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Compass className="h-4 w-4 text-[#B8944F] shrink-0" />
                            <div>
                              <span className="text-[10px] text-zinc-400 block uppercase">Departure Hub</span>
                              <span className="font-bold text-zinc-800 truncate block">
                                Ex-{msg.blueprintResult.tripBlueprint.departureCity}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Master Data Matching Breakdown */}
                        <div className="py-3 space-y-2.5">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                            Master Data Hub Auto-Resolution
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {/* Hotels Resolution */}
                            <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-2.5 text-xs">
                              <div className="flex items-center justify-between font-bold text-zinc-700 mb-1.5">
                                <span className="flex items-center">
                                  <BedDouble className="h-3.5 w-3.5 mr-1 text-[#B8944F]" />
                                  Stays & Hotels
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {msg.blueprintResult.matchedSummary.hotelsMatched?.map((h: any) => (
                                  <div key={h.id} className="flex items-center justify-between text-[11px] gap-1.5">
                                    <span className="truncate text-zinc-800 font-medium">{h.name}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded shrink-0">
                                      Matched
                                    </span>
                                  </div>
                                ))}
                                {msg.blueprintResult.matchedSummary.hotelsDrafted?.map((h: any) => (
                                  <div key={h.id} className="flex items-center justify-between text-[11px] gap-1.5">
                                    <span className="truncate text-zinc-800 font-medium">{h.name}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded shrink-0">
                                      New Draft
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Activities Resolution */}
                            <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-2.5 text-xs">
                              <div className="flex items-center justify-between font-bold text-zinc-700 mb-1.5">
                                <span className="flex items-center">
                                  <Landmark className="h-3.5 w-3.5 mr-1 text-[#B8944F]" />
                                  Places & Activities
                                </span>
                              </div>
                              <div className="space-y-1">
                                {msg.blueprintResult.matchedSummary.placesMatched?.map((p: any) => (
                                  <div key={p.id} className="flex items-center justify-between text-[11px]">
                                    <span className="truncate text-zinc-800">{p.name}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded shrink-0 ml-1">
                                      Matched
                                    </span>
                                  </div>
                                ))}
                                {msg.blueprintResult.matchedSummary.placesDrafted?.map((p: any) => (
                                  <div key={p.id} className="flex items-center justify-between text-[11px]">
                                    <span className="truncate text-zinc-800">{p.name}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded shrink-0 ml-1">
                                      New Draft
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Dining Resolution */}
                            <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-2.5 text-xs">
                              <div className="flex items-center justify-between font-bold text-zinc-700 mb-1.5">
                                <span className="flex items-center">
                                  <UtensilsCrossed className="h-3.5 w-3.5 mr-1 text-[#B8944F]" />
                                  Dining & Cafes
                                </span>
                              </div>
                              <div className="space-y-1">
                                {msg.blueprintResult.matchedSummary.restaurantsMatched?.map((r: any) => (
                                  <div key={r.id} className="flex items-center justify-between text-[11px]">
                                    <span className="truncate text-zinc-800">{r.name}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded shrink-0 ml-1">
                                      Matched
                                    </span>
                                  </div>
                                ))}
                                {msg.blueprintResult.matchedSummary.restaurantsDrafted?.map((r: any) => (
                                  <div key={r.id} className="flex items-center justify-between text-[11px]">
                                    <span className="truncate text-zinc-800">{r.name}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded shrink-0 ml-1">
                                      New Draft
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Day-by-Day Highlights List */}
                        {msg.blueprintResult.highlights && msg.blueprintResult.highlights.length > 0 && (
                          <div className="py-2 space-y-1.5 border-t border-zinc-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                              Key Highlights
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-zinc-700">
                              {msg.blueprintResult.highlights.map((hl, i) => (
                                <div key={i} className="flex items-start space-x-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{hl}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Button: Review in 9-Tab Create Wizard */}
                        <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="text-[11px] text-zinc-500">
                            <span className="font-semibold text-zinc-700">All 9 tabs configured:</span> Core info, Day planning, Day-by-day, Stays, Flights, Add-ons, Dining, Policies, & Price quotes.
                          </div>

                          <button
                            onClick={() => {
                              if (msg.blueprintResult?.tripBlueprint) {
                                toast.success("AI Blueprint loaded into 9-Step Trip Wizard!", {
                                  duration: 3500,
                                  icon: "✨",
                                  style: {
                                    background: "#14213D",
                                    color: "#fff",
                                    border: "1px solid rgba(184, 148, 79, 0.4)",
                                    fontSize: "12px",
                                  },
                                });
                                onReviewAndEdit(msg.blueprintResult.tripBlueprint);
                              }
                            }}
                            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-[#B8944F] to-[#8F6F33] hover:from-[#A47F3C] hover:to-[#7E612B] text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
                          >
                            <span>Review & Edit in Create Trip</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Progress State */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-[#B8944F]/20 text-[#B8944F] border border-[#B8944F]/40 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>

            <div className="bg-[#FAF8F5] border border-[#B8944F]/30 rounded-2xl rounded-tl-xs p-4 max-w-lg shadow-2xs space-y-2.5 animate-pulse">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#B8944F]" />
                <span className="text-xs font-bold text-[#14213D]">
                  {selectedMode === "mode1"
                    ? "Ingesting detailed trip brief..."
                    : selectedMode === "mode2"
                    ? "Researching destination & synthesizing blueprint..."
                    : "Analyzing & structuring trip..."}
                </span>
              </div>
              <p className="text-xs text-zinc-600 font-medium">
                {loadingMessages[loadingStep] || loadingMessages[0]}
              </p>
              <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#B8944F] h-full transition-all duration-700 ease-out"
                  style={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Starter Quick Suggestions */}
      {messages.length <= 2 && !isLoading && (
        <div className="py-2.5 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                <Sparkle className="h-3.5 w-3.5 text-[#B8944F]" />
                <span>Try Quick Prompts</span>
              </div>
              <span className="px-1.5 py-0.2 bg-[#B8944F]/10 text-[#B8944F] rounded text-[10px] font-bold">
                {STARTER_PROMPTS.length} Templates
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              {promptViewMode === "slider" && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => scrollSlider("left")}
                    className="p-1 rounded-md border border-zinc-200 hover:border-[#B8944F] bg-white text-zinc-600 hover:text-[#14213D] shadow-2xs transition-colors cursor-pointer"
                    title="Previous"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => scrollSlider("right")}
                    className="p-1 rounded-md border border-zinc-200 hover:border-[#B8944F] bg-white text-zinc-600 hover:text-[#14213D] shadow-2xs transition-colors cursor-pointer"
                    title="Next"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={() => setPromptViewMode(promptViewMode === "slider" ? "grid" : "slider")}
                className="inline-flex items-center space-x-1 px-2 py-1 rounded-md border border-zinc-200 hover:border-[#B8944F] bg-white text-zinc-600 hover:text-[#14213D] text-[11px] font-medium shadow-2xs transition-colors cursor-pointer"
              >
                {promptViewMode === "slider" ? (
                  <>
                    <LayoutGrid className="h-3 w-3 text-[#B8944F]" />
                    <span className="hidden sm:inline">View All</span>
                  </>
                ) : (
                  <>
                    <ListFilter className="h-3 w-3 text-[#B8944F]" />
                    <span className="hidden sm:inline">Slider</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {promptViewMode === "slider" && (
            <div
              ref={sliderRef}
              className="flex items-stretch space-x-3 overflow-x-auto scroll-smooth pb-1 px-0.5 no-scrollbar"
            >
              {STARTER_PROMPTS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedMode(item.suggestedMode);
                    handleSendPrompt(item.prompt, item.suggestedMode);
                  }}
                  className="w-[280px] sm:w-[320px] shrink-0 group flex flex-col justify-between p-3 bg-white hover:bg-[#B8944F]/5 border border-zinc-200/90 hover:border-[#B8944F]/70 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer text-left"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 bg-[#B8944F]/15 text-[#B8944F] text-[10px] font-bold rounded-md uppercase tracking-wider">
                        {item.tag}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400">
                        {item.duration}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#14213D] group-hover:text-[#B8944F] transition-colors mb-1 font-fraunces">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-zinc-600 leading-relaxed line-clamp-2">
                      {item.prompt}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400 group-hover:text-[#B8944F] font-semibold">
                    <span>Click to test</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {promptViewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-0.5">
              {STARTER_PROMPTS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedMode(item.suggestedMode);
                    handleSendPrompt(item.prompt, item.suggestedMode);
                  }}
                  className="group flex flex-col justify-between p-3 bg-white hover:bg-[#B8944F]/5 border border-zinc-200/90 hover:border-[#B8944F]/70 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer text-left"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 bg-[#B8944F]/15 text-[#B8944F] text-[10px] font-bold rounded-md uppercase tracking-wider">
                        {item.tag}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400">
                        {item.duration}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#14213D] group-hover:text-[#B8944F] transition-colors mb-1 font-fraunces">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      {item.prompt}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400 group-hover:text-[#B8944F] font-semibold">
                    <span>Click to test</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Mode Selector & Chat Input Form */}
      <div className="pt-2 shrink-0 space-y-2">
        {/* Mode Selector Segmented Tabs */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-xs">
            <button
              onClick={() => setSelectedMode("auto")}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedMode === "auto"
                  ? "bg-white text-[#14213D] shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Auto-Detect
            </button>
            <button
              onClick={() => setSelectedMode("mode1")}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                selectedMode === "mode1"
                  ? "bg-[#14213D] text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <FileText className="h-3 w-3 text-[#B8944F]" />
              <span>Mode 1: Detail Ingestion</span>
            </button>
            <button
              onClick={() => setSelectedMode("mode2")}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                selectedMode === "mode2"
                  ? "bg-[#14213D] text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Search className="h-3 w-3 text-[#B8944F]" />
              <span>Mode 2: Auto-Research</span>
            </button>
          </div>

          <span className="text-[11px] text-zinc-400 hidden sm:inline">
            {selectedMode === "mode1"
              ? "Paste complete consultant notes & quotes"
              : selectedMode === "mode2"
              ? "Minimal destination + pax search"
              : "Smartly selects Mode 1 or Mode 2"}
          </span>
        </div>

        {/* Text Input Area */}
        <div className="bg-white border border-zinc-200/90 focus-within:border-[#B8944F] focus-within:ring-1 focus-within:ring-[#B8944F] rounded-xl p-2.5 shadow-2xs transition-all flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={selectedMode === "mode1" ? 4 : 2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedMode === "mode1"
                ? "Paste raw consultant trip brief with hotels, meal plans, places, dates, prices, flight details..."
                : "Type destination request (e.g. '5-day family trip to Manali for 4 pax, budget hotels, ex-Delhi')..."
            }
            className="flex-1 text-xs sm:text-sm text-[#14213D] placeholder-zinc-400 bg-transparent resize-none focus:outline-none p-1.5"
            disabled={isLoading}
          />

          <button
            onClick={() => handleSendPrompt()}
            disabled={!inputPrompt.trim() || isLoading}
            className="px-4 py-2.5 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="hidden sm:inline">Generating...</span>
              </>
            ) : (
              <>
                <span>Generate</span>
                <Send className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        <p className="text-[10px] text-zinc-400 text-center">
          Press Enter to generate or Shift+Enter for new line. Ingestion auto-syncs with Master Data Hub and maps all 9 tabs.
        </p>
      </div>
    </div>
  );
}

function InfoIcon(props: any) {
  return <HelpCircle {...props} />;
}
