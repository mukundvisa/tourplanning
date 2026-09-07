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
} from "lucide-react";

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
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: "manali",
    tag: "Family Adventure",
    title: "Manali Mountain Getaway",
    duration: "5D / 4N",
    prompt: "5-day family trip to Manali, budget hotels, adventure activities, ex-Delhi",
  },
  {
    id: "dubai",
    tag: "Luxury & Romance",
    title: "Dubai Skyline & Safari",
    duration: "7D / 6N",
    prompt: "7-day luxury romantic getaway to Dubai with desert safari and Burj Khalifa dining",
  },
  {
    id: "jaipur",
    tag: "Heritage & Culture",
    title: "Royal Jaipur Exploration",
    duration: "4D / 3N",
    prompt: "4-day cultural exploration in Jaipur with heritage stays and authentic Rajasthani cuisine",
  },
  {
    id: "goa",
    tag: "Coastal & Leisure",
    title: "Goa Beach & Nightlife",
    duration: "6D / 5N",
    prompt: "6-day tropical escape to Goa with beach resorts, water sports, and sunset cruises",
  },
  {
    id: "kashmir",
    tag: "Scenic Paradise",
    title: "Kashmir Valley & Houseboat",
    duration: "6D / 5N",
    prompt: "6-day scenic family vacation in Kashmir with Dal Lake houseboat stay, Gulmarg gondola, and Pahalgam valley tours",
  },
  {
    id: "kerala",
    tag: "Wellness & Nature",
    title: "Kerala Backwaters & Hills",
    duration: "5D / 4N",
    prompt: "5-day relaxed holiday in Kerala covering Munnar tea plantations, Alleppey backwater houseboat, and heritage Kochi",
  },
];

export function AITripGenerator({ onReviewAndEdit }: AITripGeneratorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-greeting",
      role: "assistant",
      content:
        "Hello! I am your AI Trip Blueprint Architect. Describe any client trip requirement in plain language, and I will automatically extract the parameters, match or draft items from your Master Data Hub catalogs (hotels, activities, restaurants, flights, policies), and build a complete 8-step itinerary blueprint ready for review.",
      timestamp: "Ready",
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState("");
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

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, loadingStep]);

  // Loading indicator animation step progression
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
    "Analyzing natural-language requirements & destination parameters...",
    "Querying Master Data Hub catalogs for matching hotels & activities...",
    "Drafting uncataloged records and resolving master data references...",
    "Synthesizing complete 8-step blueprint & day-wise schedule...",
  ];

  const handleSendPrompt = async (textToSend?: string) => {
    const promptText = (textToSend || inputPrompt).trim();
    if (!promptText || isLoading) return;

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
      // Build history payload for OpenAI
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
          chatHistory: historyPayload.slice(0, -1), // previous history excluding current
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
        // AI needs clarification on specific fields
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
          content: `Trip blueprint successfully generated for **${data.tripBlueprint.destination}** (${data.tripBlueprint.durationDays} Days / ${data.tripBlueprint.durationNights} Nights for ${data.tripBlueprint.numTravellers} travellers). All Master Data items have been cross-referenced and resolved.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
        content: `Error connecting to AI Trip generator: ${err.message || "Network error"}. Please check your connection or Gemini API configuration.`,
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
    if (confirm("Reset the current AI Trip conversation history?")) {
      setMessages([
        {
          id: "initial-greeting",
          role: "assistant",
          content:
            "Hello! I am your AI Trip Blueprint Architect. Describe any client trip requirement in plain language, and I will automatically extract the parameters, match or draft items from your Master Data Hub catalogs (hotels, activities, restaurants, flights, policies), and build a complete 8-step itinerary blueprint ready for review.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setInputPrompt("");
    }
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
                AI Trip Blueprint Generator
              </h2>
              <span className="px-2 py-0.5 bg-[#B8944F]/15 text-[#B8944F] text-[10px] font-bold rounded-full uppercase tracking-wider">
                Gemini 3.6 Flash
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Natural-language synthesis with server-side Master Data matching, auto-drafting & 8-step wizard prefill.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {remainingQuota !== null && (
            <div className="text-[11px] bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded-lg text-zinc-600 font-medium">
              <span className="text-[#B8944F] font-bold">{remainingQuota}</span>/20 gens left this hr
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
              <div className="flex items-center space-x-2 mb-1 px-1">
                <span className="text-[11px] font-bold text-zinc-600">
                  {msg.role === "user" ? "You (Admin)" : "AI Trip Architect"}
                </span>
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
                {/* Standard Message Text */}
                <p className="whitespace-pre-wrap">{msg.content}</p>

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

                {/* Rich Trip Blueprint Summary Card */}
                {msg.blueprintResult && (
                  <div className="mt-4 pt-4 border-t border-zinc-200/90 w-full space-y-4">
                    <div className="bg-white border border-[#B8944F]/40 rounded-xl overflow-hidden shadow-xs">
                      {/* Optional Destination Banner Cover Image */}
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
                                Generated Blueprint
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
                                {msg.blueprintResult.matchedSummary.hotelsMatched.map((h: any) => (
                                  <div key={h.id} className="flex items-center justify-between text-[11px] gap-1.5">
                                    <div className="flex items-center space-x-1.5 truncate">
                                      {h.photo && (
                                        <img
                                          src={h.photo}
                                          alt={h.name}
                                          className="h-5 w-5 rounded object-cover shrink-0"
                                        />
                                      )}
                                      <span className="truncate text-zinc-800 font-medium">{h.name}</span>
                                    </div>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded shrink-0">
                                      Matched
                                    </span>
                                  </div>
                                ))}
                                {msg.blueprintResult.matchedSummary.hotelsDrafted.map((h: any) => (
                                  <div key={h.id} className="flex items-center justify-between text-[11px] gap-1.5">
                                    <div className="flex items-center space-x-1.5 truncate">
                                      {h.photo && (
                                        <img
                                          src={h.photo}
                                          alt={h.name}
                                          className="h-5 w-5 rounded object-cover shrink-0"
                                        />
                                      )}
                                      <span className="truncate text-zinc-800 font-medium">{h.name}</span>
                                    </div>
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
                              {msg.blueprintResult.matchedSummary.placesMatched.map((p: any) => (
                                <div key={p.id} className="flex items-center justify-between text-[11px]">
                                  <span className="truncate text-zinc-800">{p.name}</span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded shrink-0 ml-1">
                                    Matched
                                  </span>
                                </div>
                              ))}
                              {msg.blueprintResult.matchedSummary.placesDrafted.map((p: any) => (
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
                              {msg.blueprintResult.matchedSummary.restaurantsMatched.map((r: any) => (
                                <div key={r.id} className="flex items-center justify-between text-[11px]">
                                  <span className="truncate text-zinc-800">{r.name}</span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded shrink-0 ml-1">
                                    Matched
                                  </span>
                                </div>
                              ))}
                              {msg.blueprintResult.matchedSummary.restaurantsDrafted.map((r: any) => (
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
                            Key Itinerary Highlights
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

                      {/* PRIMARY ACTION BUTTON: REVIEW & EDIT IN CREATE TRIP */}
                      <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-[11px] text-zinc-500">
                          <span className="font-semibold text-zinc-700">8 steps configured:</span> Stays, transfers, itinerary schedule, policy templates & pricing.
                        </div>

                        <button
                          onClick={() => {
                            if (msg.blueprintResult?.tripBlueprint) {
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
                  Generating trip draft...
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

      {/* Starter Quick Suggestions with Slider and Grid view (Never cropped) */}
      {messages.length <= 2 && !isLoading && (
        <div className="py-2.5 shrink-0 space-y-2">
          {/* Header Strip with Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                <Sparkle className="h-3.5 w-3.5 text-[#B8944F]" />
                <span>Try Quick Prompts</span>
              </div>
              <span className="px-1.5 py-0.2 bg-[#B8944F]/10 text-[#B8944F] rounded text-[10px] font-bold">
                {STARTER_PROMPTS.length} Ideas
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Slider Arrow Controls */}
              {promptViewMode === "slider" && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => scrollSlider("left")}
                    className="p-1 rounded-md border border-zinc-200 hover:border-[#B8944F] bg-white text-zinc-600 hover:text-[#14213D] shadow-2xs transition-colors cursor-pointer"
                    title="Previous Prompts"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => scrollSlider("right")}
                    className="p-1 rounded-md border border-zinc-200 hover:border-[#B8944F] bg-white text-zinc-600 hover:text-[#14213D] shadow-2xs transition-colors cursor-pointer"
                    title="Next Prompts"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* View Mode Toggle: Slider vs Grid */}
              <button
                onClick={() => setPromptViewMode(promptViewMode === "slider" ? "grid" : "slider")}
                className="inline-flex items-center space-x-1 px-2 py-1 rounded-md border border-zinc-200 hover:border-[#B8944F] bg-white text-zinc-600 hover:text-[#14213D] text-[11px] font-medium shadow-2xs transition-colors cursor-pointer"
                title={promptViewMode === "slider" ? "Switch to Grid View" : "Switch to Carousel Slider"}
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

          {/* SLIDER VIEW */}
          {promptViewMode === "slider" && (
            <div
              ref={sliderRef}
              className="flex items-stretch space-x-3 overflow-x-auto scroll-smooth pb-1 px-0.5 no-scrollbar"
            >
              {STARTER_PROMPTS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSendPrompt(item.prompt)}
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
                    <span>Click to generate</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GRID / LIST VIEW (All items fully visible) */}
          {promptViewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-0.5">
              {STARTER_PROMPTS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSendPrompt(item.prompt)}
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
                    <span>Click to generate</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Chat Input Form */}
      <div className="pt-3 shrink-0">
        <div className="bg-white border border-zinc-200/90 focus-within:border-[#B8944F] focus-within:ring-1 focus-within:ring-[#B8944F] rounded-xl p-2.5 shadow-2xs transition-all flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your trip request (e.g. '5-day family trip to Manali, budget hotels, adventure activities, ex-Delhi')..."
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
        <p className="text-[10px] text-zinc-400 text-center mt-1.5">
          Press Enter to generate or Shift+Enter for new line. All master data items will be automatically linked or created as pending drafts.
        </p>
      </div>
    </div>
  );
}
