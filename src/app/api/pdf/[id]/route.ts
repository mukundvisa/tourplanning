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

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Fetch trip and its customer-facing entities (Never fetch internal costing)
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

    const coverImage =
      trip.coverImage ||
      trip.accommodations[0]?.photos[0] ||
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80";

    // Summary glance table rows
    const glanceRows = trip.itineraryDays
      .map(
        (d: any) => `
      <tr class="border-b border-stone-200 break-avoid">
        <td class="py-2.5 font-bold text-[#B8944F] pr-2 whitespace-nowrap">Day ${d.dayNumber}</td>
        <td class="py-2.5 text-stone-600 font-semibold pr-2">${d.cityOrStay}</td>
        <td class="py-2.5 text-stone-800 font-bold">${d.title}</td>
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
      <div class="flex justify-between border-b border-stone-150 py-2 text-xs">
        <span class="text-stone-600 font-medium">${item.label}</span>
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

    // Detailed Days HTML (Self-contained blocks with break-inside: avoid)
    const detailedDaysHtml = trip.itineraryDays
      .map((day: any) => {
        const inclusionsList = (day.inclusions || [])
          .map(
            (inc: string) => `
          <li class="flex items-start text-xs text-stone-600 mb-1">
            <span class="text-emerald-600 mr-2 font-bold">&bull;</span> ${inc}
          </li>
        `
          )
          .join("");

        const exclusionsList = (day.exclusions || [])
          .map(
            (exc: string) => `
          <li class="flex items-start text-xs text-stone-600 mb-1">
            <span class="text-rose-500 mr-2 font-bold">&bull;</span> ${exc}
          </li>
        `
          )
          .join("");

        const lovedTips = (day.customerLovedTips || [])
          .map(
            (tip: string) => `
          <li class="flex items-start text-xs text-stone-700">
            <span class="text-pink-600 mr-1.5 font-bold">&bull;</span> ${tip}
          </li>
        `
          )
          .join("");

        const watchOutTips = (day.customerWatchOutTips || [])
          .map(
            (tip: string) => `
          <li class="flex items-start text-xs text-stone-700">
            <span class="text-amber-600 mr-1.5 font-bold">&bull;</span> ${tip}
          </li>
        `
          )
          .join("");

        return `
        <div class="pdf-section break-avoid bg-white border border-stone-200 rounded-xl p-6 mb-6 shadow-xs">
          <div class="flex justify-between items-center text-[9px] uppercase tracking-wider text-stone-400 border-b border-stone-150 pb-2 mb-4">
            <span class="font-bold text-[#14213D]">${trip.title}</span>
            <span>Day ${day.dayNumber} Itinerary</span>
          </div>

          <div class="flex justify-between items-start border-b border-[#B8944F]/30 pb-3 mb-4">
            <div class="flex items-center space-x-3">
              <span class="h-8 w-8 bg-[#B8944F] text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                ${day.dayNumber}
              </span>
              <div>
                <h3 class="text-lg font-black text-[#14213D]">${day.title}</h3>
                <p class="text-xs text-[#B8944F] font-bold">Stay / Region: ${day.cityOrStay}</p>
              </div>
            </div>
            ${
              day.durationHours
                ? `<span class="text-xs px-2.5 py-1 bg-stone-100 rounded-full font-bold border border-stone-200 shrink-0">Duration: ${day.durationHours}h</span>`
                : ""
            }
          </div>

          <div class="text-xs leading-relaxed text-stone-700 font-medium mb-4 whitespace-pre-line">
            ${day.description}
          </div>

          <div class="grid grid-cols-2 gap-4 pt-3 border-t border-stone-150">
            <div>
              <p class="text-[9px] text-stone-400 font-bold uppercase tracking-wider mb-1.5">Day Inclusions</p>
              <ul class="list-none space-y-0.5">
                ${inclusionsList || '<li class="text-stone-400 italic text-xs">Standard plan inclusions apply</li>'}
              </ul>
            </div>
            <div>
              <p class="text-[9px] text-stone-400 font-bold uppercase tracking-wider mb-1.5">Day Exclusions</p>
              <ul class="list-none space-y-0.5">
                ${exclusionsList || '<li class="text-stone-400 italic text-xs">Standard plan exclusions apply</li>'}
              </ul>
            </div>
          </div>

          ${
            lovedTips || watchOutTips
              ? `
            <div class="grid grid-cols-2 gap-4 pt-4 mt-2 border-t border-stone-100">
              ${
                lovedTips
                  ? `
                <div class="bg-pink-50/60 border border-pink-200 p-3.5 rounded-lg">
                  <h5 class="text-[11px] font-bold text-pink-700 mb-1.5 uppercase tracking-wide">❤️ What Travelers Love</h5>
                  <ul class="space-y-1">${lovedTips}</ul>
                </div>
              `
                  : ""
              }
              ${
                watchOutTips
                  ? `
                <div class="bg-amber-50/60 border border-amber-200 p-3.5 rounded-lg">
                  <h5 class="text-[11px] font-bold text-amber-800 mb-1.5 uppercase tracking-wide">⚠️ Advisory Guidelines</h5>
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
    const accommodationsHtml = trip.accommodations
      .map((acc: any) => {
        const starRow = Array.from({ length: acc.starRating || 4 })
          .map(
            () =>
              `<svg class="h-3.5 w-3.5 fill-amber-500 text-amber-500 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
          )
          .join("");

        const photoGrid = (acc.photos || [])
          .slice(0, 3)
          .map(
            (pUrl: string) => `
          <div class="aspect-video bg-stone-100 rounded-lg overflow-hidden border border-stone-200">
            <img src="${pUrl}" class="h-full w-full object-cover" />
          </div>
        `
          )
          .join("");

        const facilitiesTags = (acc.facilities || [])
          .map(
            (fac: string) => `
          <span class="text-[9px] px-2 py-0.5 bg-stone-50 border border-stone-200 text-stone-600 rounded-full font-bold">${fac}</span>
        `
          )
          .join("");

        return `
        <div class="pdf-section break-avoid bg-white border border-stone-200 rounded-xl p-5 mb-5 shadow-xs">
          <div class="flex justify-between items-start border-b border-[#B8944F]/30 pb-3 mb-4">
            <div>
              <span class="text-[9px] font-bold text-[#A6572E] uppercase tracking-wider">${acc.location} Stay</span>
              <h3 class="text-base font-black text-[#14213D] mt-0.5">${acc.hotelName}</h3>
              <div class="flex items-center space-x-2 mt-1">
                <div class="flex space-x-0.5">${starRow}</div>
                ${
                  acc.ratingScore
                    ? `<span class="text-[10px] bg-[#B8944F]/10 border border-[#B8944F]/20 text-[#B8944F] px-2 py-0.5 rounded font-bold">${acc.ratingScore}★ (${acc.ratingLabel || "Guest rating"})</span>`
                    : ""
                }
              </div>
            </div>
            <div class="text-right text-xs">
              <span class="text-[9px] text-stone-400 font-bold uppercase block">Stay Dates</span>
              <span class="font-bold text-[#14213D]">${new Date(acc.checkInDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(acc.checkOutDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-3">
              <div class="text-xs">
                <p class="text-[9px] text-stone-400 font-bold uppercase">Room & Plan</p>
                <p class="font-bold text-[#14213D] mt-0.5">${acc.roomType} (${acc.mealPlan})</p>
              </div>

              ${
                facilitiesTags
                  ? `
                <div>
                  <p class="text-[9px] text-stone-400 font-bold uppercase mb-1">Amenities</p>
                  <div class="flex flex-wrap gap-1">${facilitiesTags}</div>
                </div>
              `
                  : ""
              }
            </div>

            <div class="grid grid-cols-2 gap-2 content-start">
              ${photoGrid || '<div class="col-span-2 py-6 bg-stone-50 border border-dashed text-center text-xs text-stone-400 rounded-lg">No photos uploaded</div>'}
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Flights
    const flightsRows = trip.flightDetails
      .map(
        (f: any) => `
      <tr class="border-b border-stone-200 text-xs break-avoid">
        <td class="p-2.5 font-bold text-[#14213D] align-top">
          ${f.sector}
          ${f.flightNotes ? `<div class="text-[9px] text-stone-500 mt-0.5 italic">${f.flightNotes}</div>` : ""}
        </td>
        <td class="p-2.5 align-top">${f.airline}</td>
        <td class="p-2.5 align-top font-mono text-[11px]">${formatDateTime(f.departureDateTime)}</td>
        <td class="p-2.5 align-top font-mono text-[11px]">${formatDateTime(f.arrivalDateTime)}</td>
        <td class="p-2.5 align-top">
          <p class="font-bold">${f.stops === 0 ? "Non-stop" : `${f.stops} Stop(s)`}</p>
          ${f.layoverInfo ? `<p class="text-[9px] text-stone-400">${f.layoverInfo}</p>` : ""}
        </td>
        <td class="p-2.5 text-right align-top font-mono text-[11px]">
          ${f.carryOnBaggageKg || 7}kg / ${f.checkInBaggageKg || 20}kg
        </td>
      </tr>
    `
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
        <tr class="border-b border-stone-200 text-xs break-avoid">
          <td class="p-2.5 font-bold text-[#14213D]">${addon.name}</td>
          <td class="p-2.5">
            ${desc?.visaType ? `<p><span class="font-bold">Visa Type:</span> ${desc.visaType}</p>` : ""}
            ${desc?.length ? `<p><span class="font-bold">Length:</span> ${desc.length}</p>` : ""}
            ${desc?.details ? `<p class="italic text-stone-500 mt-0.5">${desc.details}</p>` : ""}
          </td>
          <td class="p-2.5 text-right font-bold text-[#14213D] font-mono">₹${addon.price.toLocaleString("en-IN")} ${addon.priceType}</td>
        </tr>
      `;
      })
      .join("");

    // Dining
    const diningCards = trip.restaurantSuggestions
      .map(
        (rest: any) => `
      <div class="bg-stone-50 border border-stone-200 p-3 rounded-xl break-avoid">
        <h4 class="font-bold text-[#14213D] text-xs">${rest.name}</h4>
        <p class="text-[10px] text-stone-500 mt-0.5">📍 ${rest.location} &bull; ${rest.category} (${rest.cuisineType})</p>
        <div class="flex items-center justify-between mt-1.5">
          ${rest.rating ? `<span class="text-[9px] text-amber-600 font-bold">★ ${rest.rating} (${rest.reviewCount || 100}+ reviews)</span>` : "<span></span>"}
          ${rest.isVeg ? `<span class="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">Veg Options</span>` : ""}
        </div>
      </div>
    `
      )
      .join("");

    const terms = trip.tripTerms;

    // Compile dynamic, content-sized HTML layout
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${trip.title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;900&family=Inter:wght@400;500;600;700;800&display=swap');
          
          /* Explicit print page margins (Part D Specification) */
          @page {
            size: A4;
            margin: 12mm 15mm;
          }
          
          body {
            font-family: 'Inter', sans-serif;
            background-color: #FAF8F5;
            color: #14213D;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .font-fraunces {
            font-family: 'Fraunces', Georgia, serif;
          }

          /* Prevent content cut off inside cards & table rows (Part D) */
          .break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Page break strictly after cover page and before terms (Part D) */
          .page-break-after {
            page-break-after: always;
            break-after: page;
          }

          .page-break-before {
            page-break-before: always;
            break-before: page;
          }

          .prose ul {
            list-style-type: disc !important;
            padding-left: 1.25rem !important;
            margin-top: 0.35rem !important;
            margin-bottom: 0.35rem !important;
          }
          .prose ol {
            list-style-type: decimal !important;
            padding-left: 1.25rem !important;
            margin-top: 0.35rem !important;
            margin-bottom: 0.35rem !important;
          }
          .prose li {
            margin-bottom: 0.2rem !important;
          }
          .prose strong {
            font-weight: 700 !important;
            color: #14213D !important;
          }
          .prose p {
            margin-bottom: 0.5rem !important;
          }
        </style>
      </head>
      <body>
        
        <!-- COVER PAGE (Page Break After) -->
        <div class="page-break-after flex flex-col justify-between min-h-[250mm] bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
          <div class="h-[140mm] w-full relative">
            <img src="${coverImage}" class="h-full w-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-[#14213D] via-[#14213D]/40 to-transparent"></div>
            
            <div class="absolute top-6 left-8 right-8 flex justify-between items-center">
              <span class="text-2xl font-black text-white tracking-tight font-fraunces">TripCraft</span>
              <span class="text-[10px] font-bold px-3 py-1.5 bg-[#B8944F] text-white rounded-full uppercase tracking-wider">
                Custom Itinerary Proposal
              </span>
            </div>
            
            <div class="absolute bottom-6 left-8 right-8">
              <span class="text-[10px] font-bold text-[#FAF8F5] bg-[#B8944F]/80 px-2.5 py-0.5 rounded uppercase tracking-wider">Verified Blueprint</span>
              <h1 class="text-3xl font-black text-white tracking-tight leading-tight mt-2 font-fraunces">
                ${trip.title}
              </h1>
              <p class="text-xs text-stone-200 font-semibold mt-1">Destination: ${trip.destination} (Ex-${trip.departureCity})</p>
            </div>
          </div>

          <div class="p-8 flex flex-col justify-between flex-1">
            <div class="grid grid-cols-2 gap-6 border-b border-stone-200 pb-6">
              <div>
                <p class="text-stone-400 font-bold uppercase text-[9px] tracking-wider">Travel Dates</p>
                <p class="font-bold text-[#14213D] text-sm mt-0.5">
                  ${new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} to 
                  ${new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p class="text-stone-500 font-medium text-xs mt-1">
                  ${trip.durationDays} Days / ${trip.durationNights} Nights &bull; ${trip.numTravellers} Travellers
                </p>
              </div>
              <div>
                <p class="text-stone-400 font-bold uppercase text-[9px] tracking-wider">Travel Consultant</p>
                <p class="font-bold text-[#14213D] text-sm mt-0.5">${trip.consultantName}</p>
                <p class="text-stone-500 font-medium text-xs mt-1">Phone: ${trip.consultantPhone}</p>
              </div>
            </div>

            <div class="flex justify-between items-center text-[9px] text-stone-400 font-medium pt-4">
              <p>&copy; TripCraft. All rights reserved.</p>
              <p>Proposal Date: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <!-- PRICING & AT A GLANCE SUMMARY -->
        <div class="break-avoid bg-white border border-stone-200 rounded-2xl p-6 mb-6 mt-6 shadow-xs">
          <div class="flex justify-between items-center text-[9px] uppercase tracking-wider text-stone-400 border-b border-stone-200 pb-2 mb-4">
            <span class="font-bold text-[#14213D]">${trip.title}</span>
            <span>Summary & Price Quotation</span>
          </div>

          <h2 class="text-xl font-bold text-[#14213D] mb-4 font-fraunces">
            Summary & Price Quotation
          </h2>

          <div class="grid grid-cols-2 gap-6 items-start">
            <div class="bg-[#FAF8F5] border border-stone-200 p-5 rounded-xl space-y-3">
              <h3 class="text-xs font-bold text-[#B8944F] uppercase tracking-wider">Plan Cost Breakdown</h3>
              <div class="space-y-1">${priceLines}</div>
              
              <div class="pt-3 border-t border-stone-200 space-y-1.5 text-xs">
                <div class="flex justify-between font-semibold text-stone-500">
                  <span>Subtotal Cost</span>
                  <span class="font-mono">₹${priceQuoteSubtotal.toLocaleString("en-IN")}</span>
                </div>
                <div class="flex justify-between font-semibold text-stone-500">
                  <span>TCS Gov Tax (${trip.tripFinancials?.tcsPercentage || 5}%)</span>
                  <span class="font-mono">₹${trip.tripFinancials?.tcsAmount.toLocaleString("en-IN")}</span>
                </div>
                <div class="flex justify-between bg-[#B8944F]/10 p-2.5 rounded border border-[#B8944F]/20 font-bold text-sm text-[#14213D]">
                  <span>Total Amount (with TCS)</span>
                  <span class="font-mono">₹${trip.tripFinancials?.totalWithTcs.toLocaleString("en-IN")}</span>
                </div>
              </div>

              ${
                trip.tripFinancials?.notes
                  ? `
                <div class="p-2.5 bg-white rounded border border-stone-200 text-[10px] text-stone-500 leading-relaxed">
                  <span class="font-bold text-stone-700 block mb-0.5">Notes:</span>
                  ${trip.tripFinancials.notes}
                </div>
              `
                  : ""
              }
            </div>

            <div class="bg-[#FAF8F5] border border-stone-200 p-5 rounded-xl">
              <h3 class="text-xs font-bold text-[#B8944F] uppercase tracking-wider mb-2">Itinerary Glance</h3>
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-stone-300 text-stone-400 font-bold uppercase text-[9px]">
                    <th class="pb-1.5">Day</th>
                    <th class="pb-1.5">Stay</th>
                    <th class="pb-1.5">Day Highlight</th>
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
        <div class="mb-6">
          <h2 class="text-xl font-bold text-[#14213D] mb-4 font-fraunces">
            Day-by-Day Detailed Itinerary
          </h2>
          ${detailedDaysHtml}
        </div>

        <!-- ACCOMMODATIONS & FLIGHTS -->
        ${
          accommodationsHtml
            ? `
          <div class="mb-6">
            <h2 class="text-xl font-bold text-[#14213D] mb-4 font-fraunces">
              Stays & Accommodations
            </h2>
            ${accommodationsHtml}
          </div>
        `
            : ""
        }

        ${
          flightsRows || addonsRows
            ? `
          <div class="break-avoid bg-white border border-stone-200 rounded-2xl p-6 mb-6 shadow-xs">
            ${
              flightsRows
                ? `
              <div class="space-y-3">
                <h3 class="text-base font-bold text-[#14213D] font-fraunces">
                  ✈️ Flights & Transit Schedule
                </h3>
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-stone-50 text-stone-500 font-bold border-b border-stone-200">
                    <tr>
                      <th class="p-2">Sector</th>
                      <th class="p-2">Airline</th>
                      <th class="p-2">Departure</th>
                      <th class="p-2">Arrival</th>
                      <th class="p-2">Stops</th>
                      <th class="p-2 text-right">Baggage</th>
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
              <div class="space-y-3 pt-6 ${flightsRows ? "border-t border-stone-200" : ""}">
                <h3 class="text-base font-bold text-[#14213D] font-fraunces">
                  ➕ Included Add-ons & Visa Packages
                </h3>
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-stone-50 text-stone-500 font-bold border-b border-stone-200">
                    <tr>
                      <th class="p-2">Package Name</th>
                      <th class="p-2">Validity Details</th>
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
          <div class="break-avoid bg-white border border-stone-200 rounded-2xl p-6 mb-6 shadow-xs">
            <h3 class="text-base font-bold text-[#14213D] mb-3 font-fraunces">
              🍴 Recommended Dining & Hotspots
            </h3>
            <div class="grid grid-cols-2 gap-3">
              ${diningCards}
            </div>
          </div>
        `
            : ""
        }

        <!-- MASTER POLICIES & TERMS (Page Break Before) -->
        ${
          terms
            ? `
          <div class="page-break-before bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
            <div class="flex justify-between items-center text-[9px] uppercase tracking-wider text-stone-400 border-b border-stone-200 pb-2 mb-4">
              <span class="font-bold text-[#14213D]">${trip.title}</span>
              <span>Terms & Advisory Guidelines</span>
            </div>

            <h2 class="text-xl font-bold text-[#14213D] mb-4 font-fraunces">
              Master Policies & Guidelines
            </h2>
            
            <div class="space-y-3.5 text-xs text-stone-700 font-medium prose max-w-none">
              <div class="bg-stone-50 p-4 border border-stone-200 rounded-xl break-avoid">
                <h4 class="font-bold text-[#14213D] text-xs mb-1">1. Payment Policy</h4>
                <div>${terms.paymentPolicy}</div>
              </div>
              
              <div class="bg-stone-50 p-4 border border-stone-200 rounded-xl break-avoid">
                <h4 class="font-bold text-[#14213D] text-xs mb-1">2. Cancellation Policy</h4>
                <div>${terms.cancellationPolicy}</div>
              </div>

              <div class="bg-stone-50 p-4 border border-stone-200 rounded-xl break-avoid">
                <h4 class="font-bold text-[#14213D] text-xs mb-1">3. Visa Rules & Entry Requirements</h4>
                <div>${terms.visaRules}</div>
              </div>

              <div class="bg-stone-50 p-4 border border-stone-200 rounded-xl break-avoid">
                <h4 class="font-bold text-[#14213D] text-xs mb-1">4. General Notes & Advisory</h4>
                <div>${terms.generalNotes}</div>
              </div>
            </div>

            <div class="border-t border-stone-200 pt-3 mt-6 flex justify-between items-center text-[9px] text-stone-400 font-medium">
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

    // Export A4 PDF with explicit print margins (Part D)
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        bottom: "12mm",
        left: "15mm",
        right: "15mm",
      },
    });

    await browser.close();

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Itinerary-${trip.destination.replace(/[^a-zA-Z0-9]/g, "-")}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return new Response(`PDF Generation Error: ${error.message || error}`, {
      status: 500,
    });
  }
}
