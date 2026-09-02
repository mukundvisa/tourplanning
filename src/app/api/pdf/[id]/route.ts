/**
 * ==============================================================================
 * CONFIDENTIALITY & INTEGRITY WARNING:
 * ------------------------------------------------------------------------------
 * This PDF generation route is strictly for customer-facing travel proposals.
 * UNDER NO CIRCUMSTANCES should Admin Cost Calculation models (e.g. MasterCostRate,
 * TripCostCalculation, wholesale B2B internal costs, net profit, or margin percentages)
 * ever be queried, included, or referenced in this document generator.
 * ==============================================================================
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getGeneralSettings } from "@/actions/settings";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Converts local paths, relative upload URLs, or remote image URLs into base64 Data URIs
 * so Puppeteer renders them 100% reliably without network failure or missing relative path errors.
 */
async function resolveImageToDataUri(src: string | null | undefined): Promise<string> {
  if (!src) return "";
  if (src.startsWith("data:image/")) return src;

  // 1. Local relative URL (e.g. /uploads/12345-image.jpg or /banner.png)
  if (src.startsWith("/")) {
    try {
      const publicPath = join(process.cwd(), "public", src.replace(/^\//, ""));
      if (existsSync(publicPath)) {
        const fileBuffer = await readFile(publicPath);
        const ext = extname(publicPath).toLowerCase().replace(".", "");
        const mimeType =
          ext === "svg"
            ? "image/svg+xml"
            : ext === "png"
            ? "image/png"
            : ext === "webp"
            ? "image/webp"
            : "image/jpeg";
        return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
      }
    } catch (e) {
      console.warn("Failed to read local uploaded image:", src, e);
    }
  }

  // 2. Remote URL (http:// or https://)
  if (src.startsWith("http://") || src.startsWith("https://")) {
    try {
      const res = await fetch(src, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = res.headers.get("content-type") || "image/jpeg";
        return `data:${contentType};base64,${buffer.toString("base64")}`;
      }
    } catch (e) {
      console.warn("Failed to fetch remote image:", src, e);
      return src;
    }
  }

  return src;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Fetch General Settings for Branding & Watermark
    const settingsRes = await getGeneralSettings();
    const generalSettings = settingsRes.data || {
      companyName: "TripCraft",
      companyLogo: null,
      companyTagline: "Curated Luxury Journeys & Travel Design",
      contactEmail: "concierge@tripcraft.com",
      contactPhone: "+91 98765 43210",
      websiteUrl: "https://tripcraft.com",
      address: "Level 4, Horizon Travel Tower, Financial District",
      watermarkOpacity: 0.06,
    };

    // 2. Fetch trip and customer-facing relations
    const trip = await db.trip.findUnique({
      where: { id },
      include: {
        priceQuoteItems: {
          orderBy: { sortOrder: "asc" },
        },
        tripFinancials: true,
        itineraryDays: {
          orderBy: { sortOrder: "asc" },
        },
        accommodations: {
          orderBy: { checkInDate: "asc" },
        },
        flightDetails: {
          orderBy: { departureDateTime: "asc" },
        },
        addOns: true,
        restaurantSuggestions: true,
        tripTerms: true,
      },
    });

    if (!trip) {
      return new Response("Trip Not Found", { status: 404 });
    }

    // Resolve company logo and cover image to reliable base64 Data URIs
    const logoDataUri = generalSettings.companyLogo
      ? await resolveImageToDataUri(generalSettings.companyLogo)
      : "";

    const rawCoverImage =
      trip.coverImage ||
      trip.accommodations[0]?.photos[0] ||
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80";
    const coverImageDataUri = await resolveImageToDataUri(rawCoverImage);

    // Resolve accommodation photos in parallel
    const resolvedAccommodations = await Promise.all(
      trip.accommodations.map(async (acc) => {
        const resolvedPhotos = await Promise.all(
          (acc.photos || []).slice(0, 3).map((p: string) => resolveImageToDataUri(p))
        );
        return {
          ...acc,
          resolvedPhotos,
        };
      })
    );

    // Helper for formatting date-time
    const formatDateTime = (dateStr: any) => {
      try {
        return new Date(dateStr).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch (e) {
        return dateStr;
      }
    };

    // Summary glance table rows
    const glanceRows = trip.itineraryDays
      .map(
        (d: any) => `
      <tr class="border-b border-zinc-150 break-avoid">
        <td class="py-2.5 font-bold text-[#B8944F] pr-2 whitespace-nowrap text-xs">Day ${d.dayNumber}</td>
        <td class="py-2.5 text-zinc-700 font-semibold pr-2 text-xs">${d.cityOrStay || "Stay Region"}</td>
        <td class="py-2.5 text-zinc-900 font-bold text-xs">${d.title}</td>
      </tr>
    `
      )
      .join("");

    // Price lines
    const priceQuoteSubtotal = trip.priceQuoteItems.reduce(
      (acc: number, item: any) => acc + item.amount,
      0
    );
    const priceLines = trip.priceQuoteItems
      .map(
        (item: any) => `
      <div class="flex justify-between items-center border-b border-zinc-100 py-2 text-xs">
        <span class="text-zinc-600 font-medium">${item.label}</span>
        <span class="font-bold text-[#14213D] font-mono">₹${item.amount.toLocaleString("en-IN")}</span>
      </div>
    `
      )
      .join("");

    // Detailed Days HTML (Cards with avoid-break protection)
    const detailedDaysHtml = trip.itineraryDays
      .map((day: any) => {
        const inclusionsList = (day.inclusions || [])
          .map(
            (inc: string) => `
          <li class="flex items-start text-xs text-zinc-700 mb-1">
            <span class="text-emerald-600 mr-2 font-bold leading-none">&bull;</span>
            <span class="leading-relaxed">${inc}</span>
          </li>
        `
          )
          .join("");

        const exclusionsList = (day.exclusions || [])
          .map(
            (exc: string) => `
          <li class="flex items-start text-xs text-zinc-600 mb-1">
            <span class="text-rose-500 mr-2 font-bold leading-none">&bull;</span>
            <span class="leading-relaxed">${exc}</span>
          </li>
        `
          )
          .join("");

        const lovedTips = (day.customerLovedTips || [])
          .map(
            (tip: string) => `
          <li class="flex items-start text-xs text-zinc-800 mb-1">
            <span class="text-[#B8944F] mr-2 font-bold leading-none">&bull;</span>
            <span class="leading-relaxed">${tip}</span>
          </li>
        `
          )
          .join("");

        const watchOutTips = (day.customerWatchOutTips || [])
          .map(
            (tip: string) => `
          <li class="flex items-start text-xs text-amber-900 mb-1">
            <span class="text-amber-600 mr-2 font-bold leading-none">&bull;</span>
            <span class="leading-relaxed">${tip}</span>
          </li>
        `
          )
          .join("");

        return `
        <div class="pdf-section break-avoid bg-white border border-zinc-200/90 rounded-2xl p-5 mb-5 shadow-2xs">
          <!-- Top Day Header Bar -->
          <div class="flex justify-between items-center text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-150 pb-2 mb-3">
            <span class="font-bold text-[#14213D]">${trip.title}</span>
            <span class="font-semibold text-[#B8944F]">Day ${day.dayNumber} Daily Itinerary</span>
          </div>

          <div class="flex justify-between items-start border-b border-[#B8944F]/25 pb-3 mb-3">
            <div class="flex items-center space-x-3">
              <span class="h-8 w-8 bg-[#B8944F] text-white rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                ${day.dayNumber}
              </span>
              <div>
                <h3 class="text-sm font-bold text-[#14213D] leading-snug">${day.title}</h3>
                <p class="text-[11px] text-[#B8944F] font-bold mt-0.5">Stay / Region: ${day.cityOrStay || "Day Itinerary"}</p>
              </div>
            </div>
            ${
              day.durationHours
                ? `<span class="text-[10px] px-2.5 py-1 bg-zinc-50 rounded-lg font-bold border border-zinc-200 shrink-0 text-zinc-700 shadow-2xs">${
                    String(day.durationHours).toLowerCase().includes("hour") || String(day.durationHours).toLowerCase().includes("day")
                      ? day.durationHours
                      : `Duration: ${day.durationHours}h`
                  }</span>`
                : ""
            }
          </div>

          <!-- Description -->
          <div class="text-xs leading-relaxed text-zinc-700 font-normal mb-4 whitespace-pre-line">
            ${day.description || "Scheduled sightseeing and curated local activities as per the travel itinerary program."}
          </div>

          <!-- Inclusions & Exclusions Grid -->
          <div class="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-150">
            <div class="bg-emerald-50/40 border border-emerald-100 p-3 rounded-xl">
              <p class="text-[10px] text-emerald-800 font-bold uppercase tracking-wider mb-2">Day Inclusions</p>
              <ul class="list-none space-y-1">
                ${inclusionsList || '<li class="text-zinc-400 italic text-xs">Standard itinerary inclusions apply</li>'}
              </ul>
            </div>
            <div class="bg-rose-50/40 border border-rose-100 p-3 rounded-xl">
              <p class="text-[10px] text-rose-800 font-bold uppercase tracking-wider mb-2">Day Exclusions</p>
              <ul class="list-none space-y-1">
                ${exclusionsList || '<li class="text-zinc-400 italic text-xs">Personal expenses & optional activities</li>'}
              </ul>
            </div>
          </div>

          <!-- Traveler Insights & Advisory Guidelines -->
          ${
            lovedTips || watchOutTips
              ? `
            <div class="grid grid-cols-2 gap-4 pt-3 mt-3 border-t border-zinc-100">
              ${
                lovedTips
                  ? `
                <div class="bg-amber-50/40 border border-amber-200/80 p-3 rounded-xl">
                  <h5 class="text-[10px] font-bold text-[#B8944F] mb-1.5 uppercase tracking-wider flex items-center gap-1">
                    <span>★</span> What Travelers Love
                  </h5>
                  <ul class="space-y-1">${lovedTips}</ul>
                </div>
              `
                  : ""
              }
              ${
                watchOutTips
                  ? `
                <div class="bg-amber-50/60 border border-amber-200 p-3 rounded-xl">
                  <h5 class="text-[10px] font-bold text-amber-900 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                    <span>⚠️</span> Advisory Guidelines
                  </h5>
                  <ul class="space-y-1">${watchOutTips}</ul>
                </div>
              `
                  : ""
              }
            </div>
          `
              : ""
          }
        </div>
      `;
      })
      .join("");

    // Accommodations
    const accommodationsHtml = resolvedAccommodations
      .map((acc: any) => {
        const starRow = Array.from({ length: acc.starRating || 4 })
          .map(
            () =>
              `<svg class="h-3 w-3 fill-amber-400 text-amber-400 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
          )
          .join("");

        const photoGrid = (acc.resolvedPhotos || [])
          .map(
            (pUrl: string) => `
          <div class="h-20 bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200/90 shadow-2xs">
            <img src="${pUrl}" class="h-full w-full object-cover" />
          </div>
        `
          )
          .join("");

        const facilitiesTags = (acc.facilities || [])
          .map(
            (fac: string) => `
          <span class="text-[9px] px-2 py-0.5 bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-md font-semibold">${fac}</span>
        `
          )
          .join("");

        return `
        <div class="pdf-section break-avoid bg-white border border-zinc-200/90 rounded-2xl p-5 mb-5 shadow-2xs">
          <div class="flex justify-between items-start border-b border-[#B8944F]/25 pb-3 mb-3">
            <div>
              <span class="text-[10px] font-bold text-[#B8944F] uppercase tracking-wider">${acc.location} Stay</span>
              <h3 class="text-sm font-bold text-[#14213D] mt-0.5">${acc.hotelName}</h3>
              <div class="flex items-center space-x-2 mt-1">
                <div class="flex space-x-0.5">${starRow}</div>
                ${
                  acc.ratingScore
                    ? `<span class="text-[9px] bg-[#B8944F]/10 border border-[#B8944F]/20 text-[#B8944F] px-2 py-0.5 rounded-full font-bold">${acc.ratingScore}★ (${acc.ratingLabel || "Guest rating"})</span>`
                    : ""
                }
              </div>
            </div>
            <div class="text-right text-xs">
              <span class="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">Stay Schedule</span>
              <span class="font-bold text-[#14213D]">${new Date(acc.checkInDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(acc.checkOutDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
          </div>

          <div class="grid grid-cols-12 gap-4">
            <div class="col-span-7 space-y-3">
              <div class="text-xs">
                <p class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Room Category & Meal Plan</p>
                <p class="font-bold text-[#14213D] mt-0.5">${acc.roomType || "Standard Luxury Room"} (${acc.mealPlan || "CP"})</p>
              </div>

              ${
                facilitiesTags
                  ? `
                <div>
                  <p class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1.5">Amenities & Highlights</p>
                  <div class="flex flex-wrap gap-1.5">${facilitiesTags}</div>
                </div>
              `
                  : ""
              }
            </div>

            <div class="col-span-5 grid grid-cols-3 gap-2 content-start">
              ${photoGrid || '<div class="col-span-3 py-6 bg-zinc-50 border border-dashed border-zinc-200 text-center text-[10px] text-zinc-400 rounded-xl">Verified Property Photos</div>'}
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Transportation Rows
    const flightsRows = trip.flightDetails
      .map((f: any) => {
        const typeLabel = f.type ? f.type.toUpperCase() : "TRANSIT";
        const startingBadge = f.isStartingTransfer
          ? `<span style="background-color: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; font-size: 8px; font-weight: bold; padding: 2px 5px; border-radius: 4px; margin-left: 4px;">Starting Transfer</span>`
          : "";
        const packageBadge = f.isPackageIncluded
          ? `<span style="background-color: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; font-size: 8px; font-weight: bold; padding: 2px 5px; border-radius: 4px; margin-left: 4px;">Package Included</span>`
          : "";

        const depTime = f.departureDateTime
          ? formatDateTime(f.departureDateTime)
          : `Preferred: ${f.travelTime || "Anytime"}`;
        const arrTime = f.arrivalDateTime ? formatDateTime(f.arrivalDateTime) : "As scheduled";

        let durationOrStops = f.stops === 0 ? "Direct" : `${f.stops} Stop(s)`;
        if (f.type !== "Flight") {
          durationOrStops = f.durationText || "Direct";
        }

        return `
          <tr class="border-b border-zinc-200 text-xs break-avoid">
            <td class="p-3 font-bold text-[#14213D] align-top">
              <div class="flex items-center flex-wrap gap-1">
                <span class="bg-[#B8944F]/15 text-[#B8944F] text-[9px] font-bold px-2 py-0.5 rounded mr-1">${typeLabel}</span>
                <span>${f.sector}</span>
                ${startingBadge}
                ${packageBadge}
              </div>
              ${f.flightNotes ? `<div class="text-[10px] text-zinc-500 mt-1 italic">${f.flightNotes}</div>` : ""}
            </td>
            <td class="p-3 align-top font-semibold text-[#14213D]">
              ${f.airline}
              ${f.flightCodeDefault ? `<div class="text-[9px] text-zinc-400 font-mono mt-0.5">${f.flightCodeDefault}</div>` : ""}
            </td>
            <td class="p-3 align-top font-mono text-[11px]">${depTime}</td>
            <td class="p-3 align-top font-mono text-[11px]">${arrTime}</td>
            <td class="p-3 align-top">
              <p class="font-bold text-xs">${durationOrStops}</p>
              ${f.layoverInfo ? `<p class="text-[9px] text-zinc-400 mt-0.5">${f.layoverInfo}</p>` : ""}
            </td>
            <td class="p-3 text-right align-top font-mono text-[11px]">
              ${f.type === "Flight" ? `${f.carryOnBaggageKg || 7}kg / ${f.checkInBaggageKg || 20}kg` : "N/A"}
            </td>
          </tr>
        `;
      })
      .join("");

    // Addons
    const addonsRows = trip.addOns
      .map((addon: any) => {
        let desc: any = {};
        try {
          desc = typeof addon.detailsJson === "string" ? JSON.parse(addon.detailsJson) : addon.detailsJson;
        } catch (e) {}
        return `
        <tr class="border-b border-zinc-200 text-xs break-avoid">
          <td class="p-3 font-bold text-[#14213D]">${addon.name}</td>
          <td class="p-3 text-zinc-600">
            ${desc?.visaType ? `<p><span class="font-bold">Visa Type:</span> ${desc.visaType}</p>` : ""}
            ${desc?.length ? `<p><span class="font-bold">Validity:</span> ${desc.length}</p>` : ""}
            ${desc?.details ? `<p class="italic text-zinc-500 mt-0.5">${desc.details}</p>` : ""}
          </td>
          <td class="p-3 text-right font-bold text-[#14213D] font-mono">₹${addon.price.toLocaleString("en-IN")} ${addon.priceType}</td>
        </tr>
      `;
      })
      .join("");

    // Dining suggestions
    const diningCards = trip.restaurantSuggestions
      .map(
        (rest: any) => `
      <div class="bg-white border border-zinc-200/90 p-3.5 rounded-xl break-avoid shadow-2xs">
        <h4 class="font-bold text-[#14213D] text-xs">${rest.name}</h4>
        <p class="text-[10px] text-zinc-500 mt-1">📍 ${rest.location} &bull; ${rest.category} (${rest.cuisineType})</p>
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100">
          ${rest.rating ? `<span class="text-[10px] text-amber-600 font-bold">★ ${rest.rating} (${rest.reviewCount || 100}+ reviews)</span>` : "<span></span>"}
          ${rest.isVeg ? `<span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Pure Veg / Jain</span>` : ""}
        </div>
      </div>
    `
      )
      .join("");

    const terms = trip.tripTerms;

    // Compile continuous, natural-flow HTML layout with elegant typography and non-intrusive watermark
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${trip.title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap');
          
          /* Clean A4 Page Margins with zero clipping */
          @page {
            size: A4;
            margin: 12mm 10mm 12mm 10mm;
          }
          
          * {
            box-sizing: border-box;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #FFFFFF;
            color: #14213D;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
            word-break: break-word;
            position: relative;
          }

          .font-fraunces {
            font-family: 'Fraunces', Georgia, serif;
          }

          /* WATERMARK: Placed in fixed background repeating behind content on every printed page */
          .pdf-watermark-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            z-index: -10;
            opacity: ${generalSettings.watermarkOpacity || 0.06};
          }

          .pdf-watermark-logo {
            max-width: 55%;
            max-height: 35%;
            object-fit: contain;
            filter: grayscale(100%);
          }

          .pdf-watermark-text {
            font-family: 'Fraunces', Georgia, serif;
            font-size: 4.5rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #14213D;
            transform: rotate(-25deg);
          }

          /* PREVENT CROPPING & SECTION SPLITTING: */
          /* Atomic blocks and cards automatically move to next page if they don't fit */
          .pdf-section, 
          .break-avoid,
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .prose ul {
            list-style-type: disc !important;
            padding-left: 1.25rem !important;
            margin-top: 0.25rem !important;
            margin-bottom: 0.25rem !important;
          }
          .prose ol {
            list-style-type: decimal !important;
            padding-left: 1.25rem !important;
            margin-top: 0.25rem !important;
            margin-bottom: 0.25rem !important;
          }
          .prose li {
            margin-bottom: 0.15rem !important;
          }
          .prose strong {
            font-weight: 700 !important;
            color: #14213D !important;
          }
          .prose p {
            margin-bottom: 0.35rem !important;
          }
        </style>
      </head>
      <body class="bg-white space-y-4">
        
        <!-- Watermark Behind Content -->
        <div class="pdf-watermark-container">
          ${
            logoDataUri
              ? `<img src="${logoDataUri}" alt="Watermark" class="pdf-watermark-logo" />`
              : `<span class="pdf-watermark-text">${generalSettings.companyName || "TripCraft"}</span>`
          }
        </div>

        <!-- COMPACT COVER & HERO BANNER (Continuous flow - No artificial page break) -->
        <div class="pdf-section break-avoid bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-2xs mb-4">
          <div class="h-[80mm] w-full relative">
            <img src="${coverImageDataUri}" class="h-full w-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-[#14213D] via-[#14213D]/50 to-transparent"></div>
            
            <!-- Top Bar: Logo & Proposal Badge -->
            <div class="absolute top-4 left-5 right-5 flex justify-between items-center">
              <div class="flex items-center space-x-2.5">
                ${
                  logoDataUri
                    ? `<div class="h-9 px-3 bg-white/95 backdrop-blur-md rounded-xl flex items-center justify-center shadow-xs border border-white/40">
                         <img src="${logoDataUri}" class="max-h-6 max-w-[120px] object-contain" />
                       </div>`
                    : `<span class="text-xl font-black text-white tracking-tight font-fraunces drop-shadow-sm">${generalSettings.companyName || "TripCraft"}</span>`
                }
              </div>
              <span class="text-[9px] font-bold px-3 py-1.5 bg-[#B8944F] text-white rounded-full uppercase tracking-wider shadow-sm">
                Bespoke Travel Proposal
              </span>
            </div>
            
            <!-- Bottom Hero Content -->
            <div class="absolute bottom-5 left-5 right-5">
              <span class="text-[9px] font-bold text-white bg-[#B8944F]/90 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Official Itinerary Blueprint
              </span>
              <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mt-1.5 font-fraunces drop-shadow-sm">
                ${trip.title}
              </h1>
              <p class="text-xs text-zinc-200 font-semibold mt-1">
                Destination: ${trip.destination} &bull; Ex-${trip.departureCity}
              </p>
            </div>
          </div>

          <!-- Hero Metadata Bar -->
          <div class="p-5 bg-white">
            <div class="grid grid-cols-2 gap-4 border-b border-zinc-150 pb-4">
              <div>
                <p class="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Travel Schedule & Group</p>
                <p class="font-bold text-[#14213D] text-xs mt-1">
                  ${new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} to 
                  ${new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p class="text-zinc-600 font-medium text-[11px] mt-0.5">
                  ${trip.durationDays} Days / ${trip.durationNights} Nights &bull; ${trip.numTravellers} Travellers
                </p>
              </div>
              <div>
                <p class="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Dedicated Travel Consultant</p>
                <p class="font-bold text-[#14213D] text-xs mt-1">${trip.consultantName}</p>
                <p class="text-zinc-600 font-medium text-[11px] mt-0.5">Phone: ${trip.consultantPhone || "Agency Concierge"}</p>
              </div>
            </div>

            <div class="flex justify-between items-center text-[10px] text-zinc-400 font-medium pt-3">
              <p>&copy; TripCraft &bull; Curated Luxury Journeys</p>
              <p>Generated: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>
        </div>

        <!-- PRICING & AT A GLANCE SUMMARY -->
        <div class="pdf-section break-avoid bg-white border border-zinc-200/90 rounded-2xl p-5 mb-4 shadow-2xs">
          <div class="flex justify-between items-center text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-150 pb-1.5 mb-3">
            <span class="font-bold text-[#14213D]">${trip.title}</span>
            <span class="font-semibold text-[#B8944F]">Proposal Summary & Price Quotation</span>
          </div>

          <h2 class="text-base font-bold text-[#14213D] mb-3 font-fraunces">
            Summary & Price Quotation
          </h2>

          <div class="grid grid-cols-2 gap-4 items-start">
            <!-- Cost Breakdown -->
            <div class="bg-white border border-zinc-200/90 p-4 rounded-xl space-y-2.5">
              <h3 class="text-[11px] font-bold text-[#B8944F] uppercase tracking-wider">Pricing Plan Breakdown</h3>
              <div class="space-y-0.5">${priceLines}</div>
              
              <div class="pt-2.5 border-t border-zinc-200 space-y-1.5 text-xs">
                <div class="flex justify-between font-semibold text-zinc-500 text-[11px]">
                  <span>Per-Person Subtotal</span>
                  <span class="font-mono">₹${priceQuoteSubtotal.toLocaleString("en-IN")}</span>
                </div>
                <div class="flex justify-between font-semibold text-zinc-500 text-[11px]">
                  <span>Number of Travellers</span>
                  <span class="font-mono">${trip.numTravellers || 1}</span>
                </div>
                <div class="flex justify-between font-semibold text-zinc-500 text-[11px]">
                  <span>Total Base Package</span>
                  <span class="font-mono">₹${(priceQuoteSubtotal * (trip.numTravellers || 1)).toLocaleString("en-IN")}</span>
                </div>
                <div class="flex justify-between font-semibold text-zinc-500 text-[11px]">
                  <span>Total TCS (${trip.tripFinancials?.tcsPercentage || 5}%)</span>
                  <span class="font-mono">₹${(trip.tripFinancials?.tcsAmount || 0).toLocaleString("en-IN")}</span>
                </div>
                <div class="flex justify-between bg-[#B8944F]/10 p-2 rounded-lg border border-[#B8944F]/25 font-bold text-xs text-[#14213D]">
                  <span>Total Payable (with TCS)</span>
                  <span class="font-mono text-sm">₹${(trip.tripFinancials?.totalWithTcs || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              ${
                trip.tripFinancials?.notes
                  ? `
                <div class="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 text-[10px] text-zinc-600 leading-relaxed">
                  <span class="font-bold text-zinc-800 block mb-0.5">Commercial Notes:</span>
                  ${trip.tripFinancials.notes}
                </div>
              `
                  : ""
              }
            </div>

            <!-- Glance Table -->
            <div class="bg-white border border-zinc-200/90 p-4 rounded-xl">
              <h3 class="text-[11px] font-bold text-[#B8944F] uppercase tracking-wider mb-2">Trip Highlights At A Glance</h3>
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-zinc-300 text-zinc-400 font-bold uppercase text-[9px]">
                    <th class="pb-1.5">Day</th>
                    <th class="pb-1.5">Region</th>
                    <th class="pb-1.5">Highlight</th>
                  </tr>
                </thead>
                <tbody>
                  ${glanceRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- DAY-BY-DAY DETAILED ITINERARY -->
        <div class="mb-4 space-y-3">
          <div class="flex items-center justify-between pb-1">
            <h2 class="text-base font-bold text-[#14213D] font-fraunces">
              Day-by-Day Detailed Itinerary
            </h2>
            <span class="text-[10px] font-bold text-[#B8944F] uppercase tracking-wider">
              ${trip.itineraryDays.length} Days Itinerary
            </span>
          </div>
          ${detailedDaysHtml}
        </div>

        <!-- ACCOMMODATIONS -->
        ${
          accommodationsHtml
            ? `
          <div class="mb-4 space-y-3">
            <div class="flex items-center justify-between pb-1">
              <h2 class="text-base font-bold text-[#14213D] font-fraunces">
                Stays & Accommodations
              </h2>
              <span class="text-[10px] font-bold text-[#B8944F] uppercase tracking-wider">
                ${trip.accommodations.length} Properties Confirmed
              </span>
            </div>
            ${accommodationsHtml}
          </div>
        `
            : ""
        }

        <!-- TRANSPORTATION & ADD-ONS -->
        ${
          flightsRows || addonsRows
            ? `
          <div class="pdf-section break-avoid bg-white border border-zinc-200/90 rounded-2xl p-5 mb-4 shadow-2xs">
            ${
              flightsRows
                ? `
              <div class="space-y-3">
                <div class="flex items-center justify-between border-b border-zinc-150 pb-2">
                  <h3 class="text-sm font-bold text-[#14213D] font-fraunces flex items-center gap-1.5">
                    🚗 Transportation & Transit Schedule
                  </h3>
                  <span class="text-[10px] font-bold text-[#B8944F] uppercase tracking-wider">
                    Arrangement: ${trip.transportationArrangement}
                  </span>
                </div>

                ${
                  trip.transportationArrangement === "Own"
                    ? `
                  <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; color: #475569; font-size: 10px; padding: 8px; border-radius: 8px; line-height: 1.4;">
                    ℹ️ <strong>Own Transportation:</strong> Traveller has opted to arrange their own transit for this journey. The schedule below is provided for itinerary reference.
                  </div>
                `
                    : ""
                }

                ${
                  trip.startingTransferDetails
                    ? `
                  <div style="background-color: #EFF6FF; border: 1px solid #DBEAFE; color: #1E40AF; font-size: 10px; padding: 8px; border-radius: 8px; line-height: 1.4;">
                    🗺️ <strong>Starting Hub Transfer Details:</strong> ${trip.startingTransferDetails}
                  </div>
                `
                    : ""
                }

                ${
                  trip.packageTransportationDetails
                    ? `
                  <div style="background-color: #ECFDF5; border: 1px solid #D1FAE5; color: #065F46; font-size: 10px; padding: 8px; border-radius: 8px; line-height: 1.4;">
                    🎁 <strong>Package Included Transit:</strong> ${trip.packageTransportationDetails}
                  </div>
                `
                    : ""
                }

                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 text-[10px]">
                    <tr>
                      <th class="p-2">Route / Sector</th>
                      <th class="p-2">Carrier</th>
                      <th class="p-2">Departure</th>
                      <th class="p-2">Arrival</th>
                      <th class="p-2">Duration</th>
                      <th class="p-2 text-right">Baggage Allowance</th>
                    </tr>
                  </thead>
                  <tbody>${flightsRows}</tbody>
                </table>
              </div>
            `
                : ""
            }

            ${
              addonsRows
                ? `
              <div class="space-y-3 pt-4 ${flightsRows ? "border-t border-zinc-200 mt-4" : ""}">
                <div class="flex items-center justify-between border-b border-zinc-150 pb-2">
                  <h3 class="text-sm font-bold text-[#14213D] font-fraunces">
                    ➕ Included Add-ons & Visa Packages
                  </h3>
                </div>
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 text-[10px]">
                    <tr>
                      <th class="p-2">Package / Service Name</th>
                      <th class="p-2">Validity & Processing Details</th>
                      <th class="p-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>${addonsRows}</tbody>
                </table>
              </div>
            `
                : ""
            }
          </div>
        `
            : ""
        }

        <!-- DINING SUGGESTIONS -->
        ${
          diningCards
            ? `
          <div class="pdf-section break-avoid bg-white border border-zinc-200/90 rounded-2xl p-5 mb-4 shadow-2xs">
            <div class="flex items-center justify-between border-b border-zinc-150 pb-2 mb-3">
              <h3 class="text-sm font-bold text-[#14213D] font-fraunces flex items-center gap-1.5">
                🍴 Recommended Dining & Hotspots
              </h3>
              <span class="text-[10px] font-bold text-[#B8944F] uppercase tracking-wider">
                Curated Suggestions
              </span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              ${diningCards}
            </div>
          </div>
        `
            : ""
        }

        <!-- MASTER POLICIES & TERMS -->
        ${
          terms
            ? `
          <div class="pdf-section break-avoid bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-2xs mb-4">
            <div class="flex justify-between items-center text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-200 pb-1.5 mb-3">
              <span class="font-bold text-[#14213D]">${trip.title}</span>
              <span class="font-semibold text-[#B8944F]">Policies & Commercial Guidelines</span>
            </div>

            <h2 class="text-base font-bold text-[#14213D] mb-3 font-fraunces">
              Master Policies & Guidelines
            </h2>
            
            <div class="space-y-3 text-xs text-zinc-700 font-normal prose max-w-none">
              <div class="bg-white p-3.5 border border-zinc-200/90 rounded-xl">
                <h4 class="font-bold text-[#14213D] text-xs mb-1">1. Payment Policy</h4>
                <div>${terms.paymentPolicy || "Standard booking deposit and structured payment schedule apply."}</div>
              </div>
              
              <div class="bg-white p-3.5 border border-zinc-200/90 rounded-xl">
                <h4 class="font-bold text-[#14213D] text-xs mb-1">2. Cancellation Policy</h4>
                <div>${terms.cancellationPolicy || "Strict operator cancellation policy and supplier penalties apply."}</div>
              </div>

              <div class="bg-white p-3.5 border border-zinc-200/90 rounded-xl">
                <h4 class="font-bold text-[#14213D] text-xs mb-1">3. Visa Rules & Entry Requirements</h4>
                <div>${terms.visaRules || "Minimum 6 months passport validity required from scheduled date of return."}</div>
              </div>

              <div class="bg-white p-3.5 border border-zinc-200/90 rounded-xl">
                <h4 class="font-bold text-[#14213D] text-xs mb-1">4. General Notes & Advisory</h4>
                <div>${terms.generalNotes || "Standard international travel advisories, health regulations, and insurance conditions apply."}</div>
              </div>
            </div>

            <div class="border-t border-zinc-200 pt-3 mt-4 flex justify-between items-center text-[10px] text-zinc-400 font-medium">
              <span>&copy; TripCraft &bull; Custom Travel Proposal</span>
              <span class="font-bold text-[#14213D]">Official Customer Travel Proposal</span>
            </div>
          </div>
        `
            : ""
        }

      </body>
      </html>
    `;

    // 3. Launch Puppeteer
    let browser;
    try {
      let options = {};
      if (
        process.env.NODE_ENV === "development" ||
        process.env.IS_LOCAL === "true" ||
        process.platform === "win32"
      ) {
        options = {
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
          executablePath:
            process.env.CHROME_PATH ||
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          headless: true,
        };
      } else {
        options = {
          args: [...(chromium as any).args, "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
          defaultViewport: (chromium as any).defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: (chromium as any).headless,
        };
      }
      browser = await puppeteer.launch(options);
    } catch (err: any) {
      console.error("Puppeteer launch error:", err);
      throw new Error(`Puppeteer failed to launch: ${err.message}`);
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(htmlContent, { waitUntil: "networkidle0" as any });

    // Export A4 PDF with clean margins, header/footer, and zero clipping
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 7.5px; color: #9CA3AF; width: 100%; padding: 0 10mm; display: flex; justify-content: space-between; font-family: sans-serif; font-weight: 600;">
          <span style="color: #14213D; font-weight: 700;">TripCraft</span>
          <span>${trip.title}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 7.5px; color: #9CA3AF; width: 100%; padding: 0 10mm; display: flex; justify-content: space-between; font-family: sans-serif;">
          <span>Confidential Travel Itinerary Proposal</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: "12mm",
        bottom: "12mm",
        left: "10mm",
        right: "10mm",
      },
    });

    await browser.close();

    const rawTitle = trip.title || trip.destination || "Itinerary";
    const safeFilename = `Itinerary-${rawTitle.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "-")}.pdf`;
    const encodedFilename = encodeURIComponent(safeFilename);

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "default-src 'self'",
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return new Response(`PDF Generation Error: ${error.message || error}`, {
      status: 500,
    });
  }
}
