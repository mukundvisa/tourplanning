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
    // 1. Fetch trip and customer-facing relations
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

    // Resolve cover image to reliable base64 Data URI
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

    // Summary glance table rows
    const glanceRows = trip.itineraryDays
      .map(
        (d: any) => `
      <tr class="border-b border-zinc-200 break-avoid">
        <td class="py-2 font-bold text-[#B8944F] pr-2 whitespace-nowrap text-xs">Day ${d.dayNumber}</td>
        <td class="py-2 text-zinc-700 font-semibold pr-2 text-xs">${d.cityOrStay}</td>
        <td class="py-2 text-zinc-900 font-bold text-xs">${d.title}</td>
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
      <div class="flex justify-between border-b border-zinc-100 py-1.5 text-xs">
        <span class="text-zinc-600 font-medium">${item.label}</span>
        <span class="font-bold text-[#14213D]">₹${item.amount.toLocaleString("en-IN")}</span>
      </div>
    `
      )
      .join("");

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

    // Detailed Days HTML (Clean white cards, break-inside: avoid)
    const detailedDaysHtml = trip.itineraryDays
      .map((day: any) => {
        const inclusionsList = (day.inclusions || [])
          .map(
            (inc: string) => `
          <li class="flex items-start text-xs text-zinc-700 mb-0.5">
            <span class="text-emerald-600 mr-1.5 font-bold">&bull;</span> ${inc}
          </li>
        `
          )
          .join("");

        const exclusionsList = (day.exclusions || [])
          .map(
            (exc: string) => `
          <li class="flex items-start text-xs text-zinc-600 mb-0.5">
            <span class="text-rose-500 mr-1.5 font-bold">&bull;</span> ${exc}
          </li>
        `
          )
          .join("");

        const lovedTips = (day.customerLovedTips || [])
          .map(
            (tip: string) => `
          <li class="flex items-start text-xs text-zinc-800">
            <span class="text-[#B8944F] mr-1.5 font-bold">&bull;</span> ${tip}
          </li>
        `
          )
          .join("");

        const watchOutTips = (day.customerWatchOutTips || [])
          .map(
            (tip: string) => `
          <li class="flex items-start text-xs text-amber-900">
            <span class="text-amber-600 mr-1.5 font-bold">&bull;</span> ${tip}
          </li>
        `
          )
          .join("");

        return `
        <div class="pdf-section break-avoid bg-white border border-zinc-200 rounded-xl p-4 mb-4 shadow-2xs">
          <div class="flex justify-between items-center text-[9px] uppercase tracking-wider text-zinc-400 border-b border-zinc-150 pb-1.5 mb-2.5">
            <span class="font-bold text-[#14213D]">${trip.title}</span>
            <span>Day ${day.dayNumber} Itinerary</span>
          </div>

          <div class="flex justify-between items-start border-b border-[#B8944F]/30 pb-2 mb-2.5">
            <div class="flex items-center space-x-2.5">
              <span class="h-7 w-7 bg-[#B8944F] text-white rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                ${day.dayNumber}
              </span>
              <div>
                <h3 class="text-sm font-bold text-[#14213D]">${day.title}</h3>
                <p class="text-[11px] text-[#B8944F] font-bold">Stay / Region: ${day.cityOrStay}</p>
              </div>
            </div>
            ${
              day.durationHours
                ? `<span class="text-[10px] px-2 py-0.5 bg-zinc-50 rounded font-bold border border-zinc-200 shrink-0 text-zinc-700">${
                    String(day.durationHours).toLowerCase().includes("hour") || String(day.durationHours).toLowerCase().includes("day")
                      ? day.durationHours
                      : `Duration: ${day.durationHours}h`
                  }</span>`
                : ""
            }
          </div>

          <div class="text-xs leading-relaxed text-zinc-700 font-normal mb-3 whitespace-pre-line">
            ${day.description || "Scheduled activities as per itinerary program."}
          </div>

          <div class="grid grid-cols-2 gap-3 pt-2.5 border-t border-zinc-150">
            <div>
              <p class="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Day Inclusions</p>
              <ul class="list-none space-y-0.5">
                ${inclusionsList || '<li class="text-zinc-400 italic text-xs">Standard package inclusions apply</li>'}
              </ul>
            </div>
            <div>
              <p class="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Day Exclusions</p>
              <ul class="list-none space-y-0.5">
                ${exclusionsList || '<li class="text-zinc-400 italic text-xs">Personal expenses & optional activities</li>'}
              </ul>
            </div>
          </div>

          ${
            lovedTips || watchOutTips
              ? `
            <div class="grid grid-cols-2 gap-3 pt-2.5 mt-2 border-t border-zinc-100">
              ${
                lovedTips
                  ? `
                <div class="bg-amber-50/40 border border-amber-200/80 p-2.5 rounded-lg">
                  <h5 class="text-[10px] font-bold text-[#B8944F] mb-1 uppercase tracking-wide">★ What Travelers Love</h5>
                  <ul class="space-y-0.5">${lovedTips}</ul>
                </div>
              `
                  : ""
              }
              ${
                watchOutTips
                  ? `
                <div class="bg-amber-50/60 border border-amber-200 p-2.5 rounded-lg">
                  <h5 class="text-[10px] font-bold text-amber-800 mb-1 uppercase tracking-wide">⚠️ Advisory Guidelines</h5>
                  <ul class="space-y-0.5">${watchOutTips}</ul>
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
          <div class="h-20 bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200">
            <img src="${pUrl}" class="h-full w-full object-cover" />
          </div>
        `
          )
          .join("");

        const facilitiesTags = (acc.facilities || [])
          .map(
            (fac: string) => `
          <span class="text-[9px] px-2 py-0.5 bg-zinc-50 border border-zinc-200 text-zinc-700 rounded font-semibold">${fac}</span>
        `
          )
          .join("");

        return `
        <div class="pdf-section break-avoid bg-white border border-zinc-200 rounded-xl p-4 mb-4 shadow-2xs">
          <div class="flex justify-between items-start border-b border-[#B8944F]/30 pb-2 mb-3">
            <div>
              <span class="text-[9px] font-bold text-[#A6572E] uppercase tracking-wider">${acc.location} Stay</span>
              <h3 class="text-sm font-bold text-[#14213D] mt-0.5">${acc.hotelName}</h3>
              <div class="flex items-center space-x-2 mt-0.5">
                <div class="flex space-x-0.5">${starRow}</div>
                ${
                  acc.ratingScore
                    ? `<span class="text-[9px] bg-[#B8944F]/10 border border-[#B8944F]/20 text-[#B8944F] px-1.5 py-0.2 rounded font-bold">${acc.ratingScore}★ (${acc.ratingLabel || "Guest rating"})</span>`
                    : ""
                }
              </div>
            </div>
            <div class="text-right text-xs">
              <span class="text-[9px] text-zinc-400 font-bold uppercase block">Stay Dates</span>
              <span class="font-bold text-[#14213D]">${new Date(acc.checkInDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(acc.checkOutDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-2">
              <div class="text-xs">
                <p class="text-[9px] text-zinc-400 font-bold uppercase">Room & Meal Plan</p>
                <p class="font-bold text-[#14213D] mt-0.5">${acc.roomType || "Standard Room"} (${acc.mealPlan || "CP"})</p>
              </div>

              ${
                facilitiesTags
                  ? `
                <div>
                  <p class="text-[9px] text-zinc-400 font-bold uppercase mb-1">Amenities</p>
                  <div class="flex flex-wrap gap-1">${facilitiesTags}</div>
                </div>
              `
                  : ""
              }
            </div>

            <div class="grid grid-cols-3 gap-1.5 content-start">
              ${photoGrid || '<div class="col-span-3 py-4 bg-zinc-50 border border-dashed border-zinc-200 text-center text-[10px] text-zinc-400 rounded-lg">Hotel Photo Gallery</div>'}
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Transportation Rows
    const flightsRows = trip.flightDetails
      .map(
        (f: any) => {
          const typeLabel = f.type ? f.type.toUpperCase() : "TRANSIT";
          const startingBadge = f.isStartingTransfer ? `<span style="background-color: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 3px; margin-left: 4px;">Starting Transfer</span>` : "";
          const packageBadge = f.isPackageIncluded ? `<span style="background-color: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 3px; margin-left: 4px;">Package Included</span>` : "";
          
          const depTime = f.departureDateTime ? formatDateTime(f.departureDateTime) : `Preferred: ${f.travelTime || "Anytime"}`;
          const arrTime = f.arrivalDateTime ? formatDateTime(f.arrivalDateTime) : "N/A";
          
          let durationOrStops = f.stops === 0 ? "Direct" : `${f.stops} Stop(s)`;
          if (f.type !== "Flight") {
            durationOrStops = f.durationText || "Direct";
          }

          return `
            <tr class="border-b border-zinc-200 text-xs break-avoid">
              <td class="p-2 font-bold text-[#14213D] align-top">
                <div class="flex items-center flex-wrap gap-1">
                  <span class="bg-[#B8944F]/15 text-[#B8944F] text-[9px] font-bold px-1.5 py-0.5 rounded mr-1">${typeLabel}</span>
                  <span>${f.sector}</span>
                  ${startingBadge}
                  ${packageBadge}
                </div>
                ${f.flightNotes ? `<div class="text-[9px] text-zinc-500 mt-0.5 italic">${f.flightNotes}</div>` : ""}
              </td>
              <td class="p-2 align-top font-semibold text-[#14213D]">
                ${f.airline}
                ${f.flightCodeDefault ? `<div class="text-[9px] text-zinc-400 font-mono mt-0.5">${f.flightCodeDefault}</div>` : ""}
              </td>
              <td class="p-2 align-top font-mono text-[11px]">${depTime}</td>
              <td class="p-2 align-top font-mono text-[11px]">${arrTime}</td>
              <td class="p-2 align-top">
                <p class="font-bold text-xs">${durationOrStops}</p>
                ${f.layoverInfo ? `<p class="text-[9px] text-zinc-400">${f.layoverInfo}</p>` : ""}
              </td>
              <td class="p-2 text-right align-top font-mono text-[11px]">
                ${f.type === "Flight" ? `${f.carryOnBaggageKg || 7}kg / ${f.checkInBaggageKg || 20}kg` : "N/A"}
              </td>
            </tr>
          `;
        }
      )
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
          <td class="p-2 font-bold text-[#14213D]">${addon.name}</td>
          <td class="p-2 text-zinc-600">
            ${desc?.visaType ? `<p><span class="font-bold">Visa Type:</span> ${desc.visaType}</p>` : ""}
            ${desc?.length ? `<p><span class="font-bold">Length:</span> ${desc.length}</p>` : ""}
            ${desc?.details ? `<p class="italic text-zinc-500 mt-0.5">${desc.details}</p>` : ""}
          </td>
          <td class="p-2 text-right font-bold text-[#14213D] font-mono">₹${addon.price.toLocaleString("en-IN")} ${addon.priceType}</td>
        </tr>
      `;
      })
      .join("");

    // Dining
    const diningCards = trip.restaurantSuggestions
      .map(
        (rest: any) => `
      <div class="bg-white border border-zinc-200 p-2.5 rounded-lg break-avoid shadow-2xs">
        <h4 class="font-bold text-[#14213D] text-xs">${rest.name}</h4>
        <p class="text-[10px] text-zinc-500 mt-0.5">📍 ${rest.location} &bull; ${rest.category} (${rest.cuisineType})</p>
        <div class="flex items-center justify-between mt-1">
          ${rest.rating ? `<span class="text-[9px] text-amber-600 font-bold">★ ${rest.rating} (${rest.reviewCount || 100}+ reviews)</span>` : "<span></span>"}
          ${rest.isVeg ? `<span class="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">Veg Options</span>` : ""}
        </div>
      </div>
    `
      )
      .join("");

    const terms = trip.tripTerms;

    // Compile continuous, natural-flow HTML layout with pure white background & 5-10px side margins
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${trip.title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;900&family=Inter:wght@400;500;600;700;800&display=swap');
          
          /* Clean white background & ~5-10px side margins */
          @page {
            size: A4;
            margin: 6mm 2.5mm;
          }
          
          * {
            box-sizing: border-box;
          }

          body {
            font-family: 'Inter', sans-serif;
            background-color: #FFFFFF;
            color: #14213D;
            margin: 0;
            padding: 0 4px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
            word-break: break-word;
          }

          .font-fraunces {
            font-family: 'Fraunces', Georgia, serif;
          }

          /* Prevent splitting inside individual atomic table rows or small badges */
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .prose ul {
            list-style-type: disc !important;
            padding-left: 1.25rem !important;
            margin-top: 0.2rem !important;
            margin-bottom: 0.2rem !important;
          }
          .prose ol {
            list-style-type: decimal !important;
            padding-left: 1.25rem !important;
            margin-top: 0.2rem !important;
            margin-bottom: 0.2rem !important;
          }
          .prose li {
            margin-bottom: 0.1rem !important;
          }
          .prose strong {
            font-weight: 700 !important;
            color: #14213D !important;
          }
          .prose p {
            margin-bottom: 0.3rem !important;
          }
        </style>
      </head>
      <body class="bg-white space-y-3">
        
        <!-- COMPACT COVER & HERO BANNER (Continuous flow - No artificial page break) -->
        <div class="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs mb-3">
          <div class="h-[75mm] w-full relative">
            <img src="${coverImageDataUri}" class="h-full w-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-[#14213D] via-[#14213D]/45 to-transparent"></div>
            
            <div class="absolute top-4 left-5 right-5 flex justify-between items-center">
              <span class="text-xl font-black text-white tracking-tight font-fraunces">TripCraft</span>
              <span class="text-[9px] font-bold px-2.5 py-1 bg-[#B8944F] text-white rounded-full uppercase tracking-wider shadow-xs">
                Custom Itinerary Proposal
              </span>
            </div>
            
            <div class="absolute bottom-4 left-5 right-5">
              <span class="text-[9px] font-bold text-white bg-[#B8944F]/90 px-2 py-0.5 rounded uppercase tracking-wider">Verified Blueprint</span>
              <h1 class="text-2xl font-black text-white tracking-tight leading-tight mt-1 font-fraunces">
                ${trip.title}
              </h1>
              <p class="text-[11px] text-zinc-200 font-semibold mt-0.5">Destination: ${trip.destination} (Ex-${trip.departureCity})</p>
            </div>
          </div>

          <div class="p-4 bg-white">
            <div class="grid grid-cols-2 gap-4 border-b border-zinc-150 pb-3">
              <div>
                <p class="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Travel Dates</p>
                <p class="font-bold text-[#14213D] text-xs mt-0.5">
                  ${new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} to 
                  ${new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p class="text-zinc-600 font-medium text-[11px] mt-0.5">
                  ${trip.durationDays} Days / ${trip.durationNights} Nights &bull; ${trip.numTravellers} Travellers
                </p>
              </div>
              <div>
                <p class="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Travel Consultant</p>
                <p class="font-bold text-[#14213D] text-xs mt-0.5">${trip.consultantName}</p>
                <p class="text-zinc-600 font-medium text-[11px] mt-0.5">Phone: ${trip.consultantPhone || "Agency Travel Desk"}</p>
              </div>
            </div>

            <div class="flex justify-between items-center text-[9px] text-zinc-400 font-medium pt-2">
              <p>&copy; TripCraft. All rights reserved.</p>
              <p>Proposal Date: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>
        </div>

        <!-- PRICING & AT A GLANCE SUMMARY (Starts immediately after hero banner) -->
        <div class="bg-white border border-zinc-200 rounded-xl p-4 mb-3 shadow-2xs">
          <div class="flex justify-between items-center text-[9px] uppercase tracking-wider text-zinc-400 border-b border-zinc-150 pb-1 mb-2.5">
            <span class="font-bold text-[#14213D]">${trip.title}</span>
            <span>Summary & Price Quotation</span>
          </div>

          <h2 class="text-base font-bold text-[#14213D] mb-2.5 font-fraunces">
            Summary & Price Quotation
          </h2>

          <div class="grid grid-cols-2 gap-3.5 items-start">
            <div class="bg-white border border-zinc-200 p-3.5 rounded-lg space-y-2">
              <h3 class="text-[11px] font-bold text-[#B8944F] uppercase tracking-wider">Plan Cost Breakdown</h3>
              <div class="space-y-0.5">${priceLines}</div>
              
              <div class="pt-2 border-t border-zinc-200 space-y-1 text-xs">
                <div class="flex justify-between font-semibold text-zinc-500 text-[11px]">
                  <span>Per-Person Subtotal</span>
                  <span class="font-mono">₹${priceQuoteSubtotal.toLocaleString("en-IN")}</span>
                </div>
                <div class="flex justify-between font-semibold text-zinc-500 text-[11px]">
                  <span>Number of Travellers</span>
                  <span class="font-mono">${trip.numTravellers || 1}</span>
                </div>
                <div class="flex justify-between font-semibold text-zinc-500 text-[11px]">
                  <span>Total Base Price</span>
                  <span class="font-mono">₹${(priceQuoteSubtotal * (trip.numTravellers || 1)).toLocaleString("en-IN")}</span>
                </div>
                <div class="flex justify-between font-semibold text-zinc-500 text-[11px]">
                  <span>Total TCS (${trip.tripFinancials?.tcsPercentage || 5}%)</span>
                  <span class="font-mono">₹${(trip.tripFinancials?.tcsAmount || 0).toLocaleString("en-IN")}</span>
                </div>
                <div class="flex justify-between bg-[#B8944F]/10 p-1.5 rounded border border-[#B8944F]/20 font-bold text-xs text-[#14213D]">
                  <span>Total Amount (with TCS)</span>
                  <span class="font-mono">₹${(trip.tripFinancials?.totalWithTcs || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              ${
                trip.tripFinancials?.notes
                  ? `
                <div class="p-2 bg-zinc-50 rounded border border-zinc-200 text-[10px] text-zinc-600 leading-relaxed">
                  <span class="font-bold text-zinc-800 block mb-0.5">Notes:</span>
                  ${trip.tripFinancials.notes}
                </div>
              `
                  : ""
              }
            </div>

            <div class="bg-white border border-zinc-200 p-3.5 rounded-lg">
              <h3 class="text-[11px] font-bold text-[#B8944F] uppercase tracking-wider mb-1.5">Itinerary Glance</h3>
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-zinc-300 text-zinc-400 font-bold uppercase text-[9px]">
                    <th class="pb-1">Day</th>
                    <th class="pb-1">Stay</th>
                    <th class="pb-1">Day Highlight</th>
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
        <div class="mb-3 space-y-2.5">
          <h2 class="text-base font-bold text-[#14213D] mb-2 font-fraunces">
            Day-by-Day Detailed Itinerary
          </h2>
          ${detailedDaysHtml}
        </div>

        <!-- ACCOMMODATIONS -->
        ${
          accommodationsHtml
            ? `
          <div class="mb-3 space-y-2.5">
            <h2 class="text-base font-bold text-[#14213D] mb-2 font-fraunces">
              Stays & Accommodations
            </h2>
            ${accommodationsHtml}
          </div>
        `
            : ""
        }

        <!-- TRANSPORTATION & ADD-ONS -->
        ${
          flightsRows || addonsRows
            ? `
          <div class="bg-white border border-zinc-200 rounded-xl p-4 mb-3 shadow-2xs">
            ${
              flightsRows
                ? `
              <div class="space-y-2">
                <h3 class="text-xs font-bold text-[#14213D] font-fraunces flex items-center">
                  🚗 Transportation & Transit Schedule
                </h3>

                ${trip.transportationArrangement === "Own" ? `
                  <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; color: #475569; font-size: 10px; padding: 6px; border-radius: 6px; margin-bottom: 6px; line-height: 1.4;">
                    ℹ️ <strong>Own Transportation:</strong> Traveller has opted to arrange their own transit for this trip. The schedule below is for reference.
                  </div>
                ` : ""}

                ${trip.startingTransferDetails ? `
                  <div style="background-color: #EFF6FF; border: 1px solid #DBEAFE; color: #1E40AF; font-size: 10px; padding: 6px; border-radius: 6px; margin-bottom: 6px; line-height: 1.4;">
                    🗺️ <strong>Starting Hub Transfer Details:</strong> ${trip.startingTransferDetails}
                  </div>
                ` : ""}

                ${trip.packageTransportationDetails ? `
                  <div style="background-color: #ECFDF5; border: 1px solid #D1FAE5; color: #065F46; font-size: 10px; padding: 6px; border-radius: 6px; margin-bottom: 6px; line-height: 1.4;">
                    🎁 <strong>Package Included Transit:</strong> ${trip.packageTransportationDetails}
                  </div>
                ` : ""}

                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 text-[10px]">
                    <tr>
                      <th class="p-1.5">Route / Sector</th>
                      <th class="p-1.5">Carrier / Provider</th>
                      <th class="p-1.5">Departure / Time</th>
                      <th class="p-1.5">Arrival</th>
                      <th class="p-1.5">Stops / Duration</th>
                      <th class="p-1.5 text-right">Baggage Allowance</th>
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
              <div class="space-y-2 pt-3 ${flightsRows ? "border-t border-zinc-200" : ""}">
                <h3 class="text-xs font-bold text-[#14213D] font-fraunces">
                  ➕ Included Add-ons & Visa Packages
                </h3>
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 text-[10px]">
                    <tr>
                      <th class="p-1.5">Package Name</th>
                      <th class="p-1.5">Validity Details</th>
                      <th class="p-1.5 text-right">Cost</th>
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
          <div class="bg-white border border-zinc-200 rounded-xl p-4 mb-3 shadow-2xs">
            <h3 class="text-xs font-bold text-[#14213D] mb-2 font-fraunces">
              🍴 Recommended Dining & Hotspots
            </h3>
            <div class="grid grid-cols-2 gap-2">
              ${diningCards}
            </div>
          </div>
        `
            : ""
        }

        <!-- MASTER POLICIES & TERMS (Starts immediately in flow - No forced page break) -->
        ${
          terms
            ? `
          <div class="bg-white border border-zinc-200 rounded-xl p-4 shadow-2xs mb-3">
            <div class="flex justify-between items-center text-[9px] uppercase tracking-wider text-zinc-400 border-b border-zinc-200 pb-1 mb-2.5">
              <span class="font-bold text-[#14213D]">${trip.title}</span>
              <span>Terms & Advisory Guidelines</span>
            </div>

            <h2 class="text-base font-bold text-[#14213D] mb-2.5 font-fraunces">
              Master Policies & Guidelines
            </h2>
            
            <div class="space-y-2.5 text-xs text-zinc-700 font-normal prose max-w-none">
              <div class="bg-white p-3 border border-zinc-200 rounded-lg">
                <h4 class="font-bold text-[#14213D] text-xs mb-0.5">1. Payment Policy</h4>
                <div>${terms.paymentPolicy || "Standard booking deposit and payment schedule apply."}</div>
              </div>
              
              <div class="bg-white p-3 border border-zinc-200 rounded-lg">
                <h4 class="font-bold text-[#14213D] text-xs mb-0.5">2. Cancellation Policy</h4>
                <div>${terms.cancellationPolicy || "Strict operator cancellation policy applies."}</div>
              </div>

              <div class="bg-white p-3 border border-zinc-200 rounded-lg">
                <h4 class="font-bold text-[#14213D] text-xs mb-0.5">3. Visa Rules & Entry Requirements</h4>
                <div>${terms.visaRules || "Minimum 6 months passport validity required."}</div>
              </div>

              <div class="bg-white p-3 border border-zinc-200 rounded-lg">
                <h4 class="font-bold text-[#14213D] text-xs mb-0.5">4. General Notes & Advisory</h4>
                <div>${terms.generalNotes || "Standard travel advisories and conditions apply."}</div>
              </div>
            </div>

            <div class="border-t border-zinc-200 pt-2 mt-4 flex justify-between items-center text-[9px] text-zinc-400 font-medium">
              <span>&copy; TripCraft Workspace. All rights reserved.</span>
              <span>Official Travel Quotation</span>
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

    // Export A4 PDF with ~5-10px side margins (2.5mm on left and right)
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "6mm",
        bottom: "6mm",
        left: "2.5mm", // ~9.5px margin
        right: "2.5mm", // ~9.5px margin
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
