import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const maxDuration = 60; // 60 seconds Vercel timeout limit
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Fetch trip and all relational entities
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

    // 2. Build the print-optimized template elements
    const coverImage = trip.coverImage || trip.accommodations[0]?.photos[0] || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80";

    // Build days list for Glance
    const glanceRows = trip.itineraryDays.map((d: any) => `
      <tr class="border-b border-stone-200">
        <td class="py-2.5 font-bold text-[#FF176B] pr-2">Day ${d.dayNumber}</td>
        <td class="py-2.5 text-stone-600 font-semibold pr-2">${d.cityOrStay}</td>
        <td class="py-2.5 text-stone-750 font-bold">${d.title}</td>
      </tr>
    `).join("");

    // Build price lines
    const priceQuoteSubtotal = trip.priceQuoteItems.reduce((acc: number, item: any) => acc + item.amount, 0);
    const priceLines = trip.priceQuoteItems.map((item: any) => `
      <div class="flex justify-between border-b border-stone-200 py-2 text-xs">
        <span class="text-stone-500 font-medium">${item.label}</span>
        <span class="font-bold text-[#1E3B39]">₹${item.amount.toLocaleString("en-IN")}</span>
      </div>
    `).join("");

    // Helper for formatting date time
    const formatDateTime = (dateStr: any) => {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    // Build Day Detailed Pages
    const detailedDaysHtml = trip.itineraryDays.map((day: any) => {
      const inclusionsList = (day.inclusions || []).map((inc: string) => `
        <li class="flex items-start text-xs text-stone-600 mb-1">
          <span class="text-emerald-500 mr-2 font-bold">&bull;</span> ${inc}
        </li>
      `).join("");

      const exclusionsList = (day.exclusions || []).map((exc: string) => `
        <li class="flex items-start text-xs text-stone-600 mb-1">
          <span class="text-red-500 mr-2 font-bold">&bull;</span> ${exc}
        </li>
      `).join("");

      const lovedTips = (day.customerLovedTips || []).map((tip: string) => `
        <li class="flex items-start text-xs text-stone-700">
          <span class="text-[#FF176B] mr-2 font-bold">&bull;</span> ${tip}
        </li>
      `).join("");

      const watchOutTips = (day.customerWatchOutTips || []).map((tip: string) => `
        <li class="flex items-start text-xs text-stone-700">
          <span class="text-amber-600 mr-2 font-bold">&bull;</span> ${tip}
        </li>
      `).join("");

      return `
        <div class="pdf-page">
          <div>
            <div class="flex justify-between items-center text-[9px] uppercase tracking-wider text-stone-400 border-b border-stone-200 pb-2 mb-6">
              <span>${trip.title}</span>
              <span>Itinerary Day ${day.dayNumber}</span>
            </div>

            <div class="flex justify-between items-center border-b-2 border-[#0DA590] pb-4 mb-6">
              <div class="flex items-center space-x-3">
                <span class="h-9 w-9 bg-[#0DA590] text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                  ${day.dayNumber}
                </span>
                <div>
                  <h3 class="text-xl font-extrabold text-[#1E3B39]">${day.title}</h3>
                  <p class="text-xs text-[#0DA590] font-bold">Stay: ${day.cityOrStay}</p>
                </div>
              </div>
              ${day.durationHours ? `<span class="text-xs px-3 py-1 bg-stone-100 rounded-full font-bold border border-stone-200">Duration: ${day.durationHours} Hours</span>` : ""}
            </div>

            <div class="text-sm leading-relaxed text-stone-600 font-medium mb-6">
              ${day.description}
            </div>

            <div class="grid grid-cols-2 gap-6 pt-4 border-t border-stone-150">
              <div>
                <p class="text-[10px] text-stone-400 font-bold uppercase mb-2">Day Inclusions</p>
                <ul class="list-none space-y-0.5">
                  ${inclusionsList || '<li class="text-stone-400 italic text-xs">Standard plan inclusions apply</li>'}
                </ul>
              </div>
              <div>
                <p class="text-[10px] text-stone-400 font-bold uppercase mb-2">Day Exclusions</p>
                <ul class="list-none space-y-0.5">
                  ${exclusionsList || '<li class="text-stone-400 italic text-xs">Standard plan exclusions apply</li>'}
                </ul>
              </div>
            </div>

            ${lovedTips || watchOutTips ? `
              <div class="grid grid-cols-2 gap-4 pt-6">
                ${lovedTips ? `
                  <div class="bg-[#FF176B]/5 border border-[#FF176B]/20 p-4 rounded-xl">
                    <h5 class="text-xs font-bold text-[#FF176B] mb-2 uppercase tracking-wide">❤️ What Travelers Love</h5>
                    <ul class="space-y-1">${lovedTips}</ul>
                  </div>
                ` : ""}
                ${watchOutTips ? `
                  <div class="bg-amber-50/50 border border-amber-250 p-4 rounded-xl">
                    <h5 class="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide">⚠️ Watch-out Guidelines</h5>
                    <ul class="space-y-1">${watchOutTips}</ul>
                  </div>
                ` : ""}
              </div>
            ` : ""}
          </div>

          <div class="border-t border-stone-250 pt-2 flex justify-between items-center text-[9px] text-stone-400 font-medium">
            <span>&copy; TripCraft. All rights reserved.</span>
            <span>Confidential Travel Itinerary</span>
          </div>
        </div>
      `;
    }).join("");

    // Accommodations
    const accommodationsHtml = trip.accommodations.map((acc: any) => {
      const starRow = Array.from({ length: acc.starRating }).map(() => `
        <svg class="h-4 w-4 fill-amber-500 text-amber-500 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      `).join("");

      const photoGrid = (acc.photos || []).slice(0, 4).map((pUrl: string) => `
        <div class="aspect-video bg-stone-100 rounded-lg overflow-hidden">
          <img src="${pUrl}" class="h-full w-full object-cover" />
        </div>
      `).join("");

      const facilitiesTags = (acc.facilities || []).map((fac: string) => `
        <span class="text-[10px] px-2.5 py-0.5 bg-stone-50 border border-stone-200 text-stone-600 rounded-full font-bold">${fac}</span>
      `).join("");

      let attractions = [];
      try { attractions = typeof acc.nearbyAttractions === "string" ? JSON.parse(acc.nearbyAttractions) : acc.nearbyAttractions; } catch(e) {}
      const attractionsList = attractions.map((att: any) => `
        <li class="truncate text-xs font-medium text-stone-600">&bull; ${att.name} (${att.distanceKm} km)</li>
      `).join("");

      let restaurants = [];
      try { restaurants = typeof acc.nearbyRestaurants === "string" ? JSON.parse(acc.nearbyRestaurants) : acc.nearbyRestaurants; } catch(e) {}
      const restaurantsList = restaurants.map((rest: any) => `
        <li class="truncate text-xs font-medium text-stone-600">&bull; ${rest.name} (${rest.distance})</li>
      `).join("");

      return `
        <div class="pdf-page">
          <div>
            <div class="flex justify-between items-center text-[9px] uppercase tracking-wider text-stone-400 border-b border-stone-200 pb-2 mb-6">
              <span>${trip.title}</span>
              <span>Accommodation stay</span>
            </div>

            <div class="border-b-2 border-[#0DA590] pb-4 mb-6">
              <span class="text-[10px] font-bold text-[#FF176B] uppercase tracking-wider">${acc.location} Stay</span>
              <h3 class="text-xl font-extrabold text-[#1E3B39] mt-1">${acc.hotelName}</h3>
              <div class="flex items-center space-x-2 mt-1">
                <div class="flex space-x-0.5">${starRow}</div>
                ${acc.ratingScore ? `<span class="text-xs bg-[#0DA590]/10 border border-[#0DA590]/20 text-[#0DA590] px-2 py-0.5 rounded font-bold">${acc.ratingScore}★ (${acc.ratingLabel || "Guest rating"})</span>` : ""}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4 text-xs border-b border-stone-200 pb-3">
                  <div>
                    <p class="text-[10px] text-stone-400 font-bold uppercase">Check-In</p>
                    <p class="font-bold text-[#1E3B39] mt-0.5">${new Date(acc.checkInDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                  <div>
                    <p class="text-[10px] text-stone-400 font-bold uppercase">Check-Out</p>
                    <p class="font-bold text-[#1E3B39] mt-0.5">${new Date(acc.checkOutDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                  <div class="col-span-2">
                    <p class="text-[10px] text-stone-400 font-bold uppercase">Room & Plan</p>
                    <p class="font-bold text-[#1E3B39] mt-0.5">${acc.roomType} (${acc.mealPlan})</p>
                  </div>
                </div>

                ${facilitiesTags ? `
                  <div>
                    <p class="text-[10px] text-stone-400 font-bold uppercase mb-2">Amenities</p>
                    <div class="flex flex-wrap gap-1.5">${facilitiesTags}</div>
                  </div>
                ` : ""}

                <div class="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-stone-150">
                  <div>
                    <p class="text-[10px] text-stone-400 font-bold uppercase mb-1.5">Attractions</p>
                    <ul class="list-none space-y-1">${attractionsList || '<li class="text-stone-400 italic">Not listed</li>'}</ul>
                  </div>
                  <div>
                    <p class="text-[10px] text-stone-400 font-bold uppercase mb-1.5">Nearby Dining</p>
                    <ul class="list-none space-y-1">${restaurantsList || '<li class="text-stone-400 italic">Not listed</li>'}</ul>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 content-start">
                ${photoGrid || '<div class="col-span-2 py-10 bg-stone-50 border border-dashed text-center text-xs text-stone-400 rounded-xl">No photos uploaded</div>'}
              </div>
            </div>
          </div>

          <div class="border-t border-stone-250 pt-2 flex justify-between items-center text-[9px] text-stone-400 font-medium">
            <span>&copy; TripCraft. All rights reserved.</span>
            <span>Confidential Travel Itinerary</span>
          </div>
        </div>
      `;
    }).join("");

    // Flights
    const flightsRows = trip.flightDetails.map((f: any) => `
      <tr class="border-b border-stone-200 text-xs">
        <td class="p-3 font-extrabold text-[#1E3B39] align-top">
          ${f.sector}
          ${f.flightNotes ? `<div class="text-[9px] text-stone-500 mt-1 italic font-medium bg-stone-50 p-1 border border-stone-150 rounded">${f.flightNotes}</div>` : ""}
        </td>
        <td class="p-3 align-top">${f.airline}</td>
        <td class="p-3 align-top">${formatDateTime(f.departureDateTime)}</td>
        <td class="p-3 align-top">${formatDateTime(f.arrivalDateTime)}</td>
        <td class="p-3 align-top">
          <p class="font-bold">${f.durationText}</p>
          <p class="text-[10px] text-stone-400">${f.stops === 0 ? "Non-stop" : `${f.stops} Stop(s)`} ${f.layoverInfo ? `(${f.layoverInfo})` : ""}</p>
        </td>
        <td class="p-3 text-right align-top">
          <p class="font-bold">Cabin: ${f.carryOnBaggageKg || 7}kg</p>
          <p class="text-[10px] text-stone-400">Cargo: ${f.checkInBaggageKg || 20}kg</p>
        </td>
      </tr>
    `).join("");

    // Addons
    const addonsRows = trip.addOns.map((addon: any) => {
      let desc: any = {};
      try { desc = typeof addon.detailsJson === "string" ? JSON.parse(addon.detailsJson) : addon.detailsJson; } catch(e) {}
      return `
        <tr class="border-b border-stone-200 text-xs">
          <td class="p-3 font-extrabold text-[#1E3B39]">${addon.name}</td>
          <td class="p-3">
            ${desc?.visaType ? `<p><span class="font-bold">Visa Type:</span> ${desc.visaType}</p>` : ""}
            ${desc?.length ? `<p><span class="font-bold">Length:</span> ${desc.length}</p>` : ""}
            ${desc?.validity ? `<p><span class="font-bold">Validity:</span> ${desc.validity}</p>` : ""}
            ${desc?.details ? `<p class="italic text-stone-500 mt-1">${desc.details}</p>` : ""}
          </td>
          <td class="p-3 text-right font-bold text-[#0DA590]">₹${addon.price.toLocaleString("en-IN")} ${addon.priceType}</td>
        </tr>
      `;
    }).join("");

    // Dining grouped
    const diningGrouped = trip.restaurantSuggestions.reduce((acc: any, rest: any) => {
      const loc = rest.location;
      if (!acc[loc]) acc[loc] = [];
      acc[loc].push(rest);
      return acc;
    }, {});

    const diningHtml = Object.keys(diningGrouped).map((locName) => {
      const cards = diningGrouped[locName].map((rest: any) => `
        <div class="bg-stone-50 border border-stone-200 p-4 rounded-xl flex justify-between items-center">
          <div>
            <h4 class="font-bold text-[#1E3B39] text-sm">${rest.name}</h4>
            <p class="text-[10px] text-stone-400 font-bold uppercase mt-1">${rest.category} &bull; ${rest.cuisineType}</p>
            ${rest.rating ? `<p class="text-[10px] text-amber-600 font-bold mt-0.5">★ ${rest.rating} (${rest.reviewCount || 100}+ reviews)</p>` : ""}
          </div>
          ${rest.isVeg ? `<span class="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Veg Options</span>` : ""}
        </div>
      `).join("");

      return `
        <div class="space-y-3">
          <h4 class="text-sm font-bold text-[#0DA590] border-b border-stone-150 pb-1.5">📍 Dining in ${locName}</h4>
          <div class="grid grid-cols-2 gap-4">${cards}</div>
        </div>
      `;
    }).join("");

    const terms = trip.tripTerms;

    // Compile entire branded document
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${trip.title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800;900&display=swap');
          @page {
            size: A4;
            margin: 0mm;
          }
          body {
            font-family: 'Outfit', sans-serif;
            background-color: #FAF8F5;
            color: #1E3B39;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .pdf-page {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            box-sizing: border-box;
            padding: 20mm;
            position: relative;
            background-color: #FAF8F5;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
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
            color: #1E3B39 !important;
          }
          .prose p {
            margin-bottom: 0.5rem !important;
          }
        </style>
      </head>
      <body>
        
        <!-- COVER PAGE -->
        <div class="pdf-page bg-white" style="padding: 0;">
          <div class="h-[155mm] w-full relative">
            <img src="${coverImage}" class="h-full w-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-[#1E3B39] via-[#1E3B39]/50 to-transparent"></div>
            <div class="absolute top-[15mm] left-[20mm] right-[20mm] flex justify-between items-center">
              <svg viewBox="0 0 250 85" class="h-14 w-auto filter brightness-0 invert" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 25 L45 35 L28 45 Z" fill="#FFFFFF" opacity="0.9" />
                <path d="M45 35 L32 55 L28 45 Z" fill="#FFFFFF" opacity="0.9" />
                <path d="M15 25 L28 45 L32 55 Z" fill="#FFFFFF" opacity="0.8" />
                <circle cx="45" cy="35" r="2.5" fill="#FFFFFF" />
                <text x="62" y="48" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="26" letter-spacing="-0.5">Trip<tspan fill="#FFFFFF" opacity="0.8">Craft</tspan></text>
              </svg>
              <span class="text-[10px] font-extrabold px-3 py-1.5 bg-[#0DA590] text-white rounded-full uppercase tracking-wider">
                Travel Proposal
              </span>
            </div>
            
            <div class="absolute bottom-[15mm] left-[20mm] right-[20mm]">
              <span class="text-[10px] font-bold text-[#0DA590] bg-[#0DA590]/10 border border-[#0DA590]/25 px-3 py-1 rounded-full uppercase tracking-wider">Custom Itinerary</span>
              <h1 class="text-3xl font-black text-white tracking-tight leading-tight uppercase mt-3 drop-shadow-sm">
                ${trip.title}
              </h1>
              <p class="text-xs text-stone-300 font-bold mt-1.5 drop-shadow-sm">Destination: ${trip.destination} (Ex-${trip.departureCity})</p>
            </div>
          </div>

          <div class="flex-1 px-[20mm] py-[15mm] flex flex-col justify-between">
            <div class="grid grid-cols-2 gap-8 border-b border-stone-250 pb-8">
              <div>
                <p class="text-stone-400 font-bold uppercase text-[9px] tracking-wider">Dates of Travel</p>
                <p class="font-extrabold text-[#1E3B39] text-base mt-1">
                  ${new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} to 
                  ${new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p class="text-stone-500 font-semibold text-xs mt-1 bg-stone-100 inline-block px-2.5 py-1 rounded-md border border-stone-200">
                  ${trip.durationDays} Days / ${trip.durationNights} Nights &bull; ${trip.numTravellers} Guests
                </p>
              </div>
              <div>
                <p class="text-stone-400 font-bold uppercase text-[9px] tracking-wider">Prepared By</p>
                <p class="font-extrabold text-[#1E3B39] text-base mt-1">${trip.consultantName}</p>
                <p class="text-stone-550 font-semibold text-xs mt-1">Phone: ${trip.consultantPhone}</p>
              </div>
            </div>

            <div class="flex justify-between items-center text-[10px] text-stone-400 font-medium">
              <p>&copy; TripCraft. All rights reserved.</p>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <!-- SUMMARY & INVOICE PAGE -->
        <div class="pdf-page">
          <div>
            <div class="flex justify-between items-center text-[9px] uppercase tracking-wider text-stone-400 border-b border-stone-200 pb-2 mb-6">
              <span>${trip.title}</span>
              <span>Summary & Pricing</span>
            </div>

            <h2 class="text-2xl font-black text-[#1E3B39] mb-4">
              Summary & Price Quotation
            </h2>

            <div class="grid grid-cols-2 gap-8 items-start">
              <div class="bg-white border border-stone-200 p-6 rounded-2xl space-y-4 shadow-sm">
                <h3 class="text-xs font-extrabold text-[#0DA590] uppercase tracking-wider">Plan Cost Inclusions</h3>
                <div class="space-y-1.5">${priceLines}</div>
                
                <div class="pt-4 border-t border-stone-200 space-y-2 text-xs">
                  <div class="flex justify-between font-semibold text-stone-400">
                    <span>Subtotal Cost</span>
                    <span>₹${priceQuoteSubtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div class="flex justify-between font-semibold text-stone-400">
                    <span>TCS Gov Tax (${trip.tripFinancials?.tcsPercentage || 5}%)</span>
                    <span>₹${trip.tripFinancials?.tcsAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div class="flex justify-between bg-[#0DA590]/5 p-2.5 rounded border border-[#0DA590]/15 font-bold text-sm text-[#0DA590]">
                    <span>Total Amount (with TCS)</span>
                    <span class="text-[#1E3B39]">₹${trip.tripFinancials?.totalWithTcs.toLocaleString("en-IN")}</span>
                  </div>
                  
                  <div class="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-[10px] text-[#1E3B39]/90 leading-relaxed font-semibold mt-4">
                    Government rules impose flat 2% TCS on overseas tour spends per financial year. You can claim this TCS credit when filing your income tax return. Your total amount including TCS is ₹${trip.tripFinancials?.totalWithTcs.toLocaleString("en-IN")}
                  </div>
                </div>

                ${trip.tripFinancials?.notes ? `
                  <div class="p-3 bg-stone-50 rounded border border-stone-150 text-[10px] text-stone-500 mt-2 leading-relaxed">
                    <span class="font-bold text-stone-700 block mb-1">Financial Notes:</span>
                    ${trip.tripFinancials.notes}
                  </div>
                ` : ""}
              </div>

              <div class="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm">
                <h3 class="text-xs font-extrabold text-[#0DA590] uppercase tracking-wider mb-3">Itinerary Glance</h3>
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-stone-300 text-stone-400 font-bold uppercase text-[9px]">
                      <th class="pb-2">Day</th>
                      <th class="pb-2">Stay/City</th>
                      <th class="pb-2">Highlight Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${glanceRows}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="border-t border-stone-250 pt-2 flex justify-between items-center text-[9px] text-stone-400 font-medium">
            <span>&copy; TripCraft. All rights reserved.</span>
            <span>Confidential Travel Itinerary</span>
          </div>
        </div>

        <!-- DAY-BY-DAY DETAILED PAGES -->
        ${detailedDaysHtml}

        <!-- ACCOMMODATION STAYS -->
        ${accommodationsHtml || ""}

        <!-- FLIGHTS & SERVICES -->
        ${flightsRows || addonsRows ? `
          <div class="pdf-page">
            <div>
              <div class="flex justify-between items-center text-[9px] uppercase tracking-wider text-stone-400 border-b border-stone-200 pb-2 mb-6">
                <span>${trip.title}</span>
                <span>Transit & Services</span>
              </div>

              ${flightsRows ? `
                <div class="space-y-4">
                  <h2 class="text-xl font-black text-[#1E3B39]">
                    ✈️ Flights & Transit Schedule
                  </h2>
                  <div class="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                    <table class="w-full text-left text-xs border-collapse">
                      <thead class="bg-stone-50 text-stone-500 font-bold border-b border-stone-200">
                        <tr>
                          <th class="p-3">Sector</th>
                          <th class="p-3">Airline</th>
                          <th class="p-3">Departure</th>
                          <th class="p-3">Arrival</th>
                          <th class="p-3">Stops & Details</th>
                          <th class="p-3 text-right">Baggage Limits</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${flightsRows}
                      </tbody>
                    </table>
                  </div>
                </div>
              ` : ""}

              ${addonsRows ? `
                <div class="space-y-4 pt-8">
                  <h2 class="text-xl font-black text-[#1E3B39]">
                    ➕ Included Add-ons & Visa Packages
                  </h2>
                  <div class="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                    <table class="w-full text-left text-xs border-collapse">
                      <thead class="bg-stone-50 text-stone-500 font-bold border-b border-stone-200">
                        <tr>
                          <th class="p-3">Package / Addon</th>
                          <th class="p-3">Details / Validity</th>
                          <th class="p-3 text-right">Service Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${addonsRows}
                      </tbody>
                    </table>
                  </div>
                </div>
              ` : ""}
            </div>

            <div class="border-t border-stone-250 pt-2 flex justify-between items-center text-[9px] text-stone-400 font-medium">
              <span>&copy; TripCraft. All rights reserved.</span>
              <span>Confidential Travel Itinerary</span>
            </div>
          </div>
        ` : ""}

        <!-- DINING & SPOTS SUGGESTIONS -->
        ${diningHtml ? `
          <div class="pdf-page">
            <div>
              <div class="flex justify-between items-center text-[9px] uppercase tracking-wider text-stone-400 border-b border-stone-200 pb-2 mb-6">
                <span>${trip.title}</span>
                <span>Dining Suggestions</span>
              </div>

              <h2 class="text-xl font-black text-[#1E3B39] mb-2">
                🍴 Recommended Dining & Hotspots
              </h2>
              <p class="text-xs text-stone-500 font-medium mb-6">Dining recommendations handpicked by our expert travel consultants.</p>
              <div class="space-y-6">${diningHtml}</div>
            </div>

            <div class="border-t border-stone-250 pt-2 flex justify-between items-center text-[9px] text-stone-400 font-medium">
              <span>&copy; TripCraft. All rights reserved.</span>
              <span>Confidential Travel Itinerary</span>
            </div>
          </div>
        ` : ""}

        <!-- POLICY GUIDELINES -->
        ${terms ? `
          <div class="pdf-page">
            <div>
              <div class="flex justify-between items-center text-[9px] uppercase tracking-wider text-stone-400 border-b border-stone-200 pb-2 mb-6">
                <span>${trip.title}</span>
                <span>Terms & Guidelines</span>
              </div>

              <h2 class="text-xl font-black text-[#1E3B39] mb-6">
                📄 Terms & Guidelines
              </h2>
              
              <div class="space-y-4 text-[10px] leading-relaxed text-stone-550 font-medium prose max-w-none">
                <div class="bg-white p-4 border border-stone-200 rounded-xl shadow-sm">
                  <h4 class="font-extrabold text-[#1E3B39] text-xs mb-1.5">1. Payment Policy</h4>
                  <div>${terms.paymentPolicy}</div>
                </div>
                
                <div class="bg-white p-4 border border-stone-200 rounded-xl shadow-sm">
                  <h4 class="font-extrabold text-[#1E3B39] text-xs mb-1.5">2. Cancellation Policy</h4>
                  <div>${terms.cancellationPolicy}</div>
                </div>

                <div class="bg-white p-4 border border-stone-200 rounded-xl shadow-sm">
                  <h4 class="font-extrabold text-[#1E3B39] text-xs mb-1.5">3. Entry Visa Rules</h4>
                  <div>${terms.visaRules}</div>
                </div>

                <div class="bg-white p-4 border border-stone-200 rounded-xl shadow-sm">
                  <h4 class="font-extrabold text-[#1E3B39] text-xs mb-1.5">4. General Notes & Advice</h4>
                  <div>${terms.generalNotes}</div>
                </div>
              </div>
            </div>

            <div class="border-t border-stone-250 pt-2 flex justify-between items-center text-[9px] text-stone-400 font-medium">
              <span>&copy; TripCraft. All rights reserved.</span>
              <span>Confidential Travel Itinerary</span>
            </div>
          </div>
        ` : ""}

      </body>
      </html>
    `;

    // 3. Launch headless browser via Puppeteer Core + Sparticuz Chromium for serverless limits
    let browser;
    try {
      let options = {};
      if (process.env.NODE_ENV === "development" || process.env.IS_LOCAL === "true" || process.platform === "win32") {
        options = {
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
          executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
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
      console.log("Launching Puppeteer Core browser with options:", JSON.stringify(options));
      browser = await puppeteer.launch(options);
      console.log("Puppeteer Core browser launched successfully.");
    } catch (err: any) {
      console.error("CRITICAL Puppeteer launch error:", err);
      throw new Error(`Puppeteer failed to launch: ${err.message}`);
    }

    const page = await browser.newPage();

    // Set viewport & content
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(htmlContent, { waitUntil: "networkidle0" as any });

    // Export A4 PDF with 0 margins to allow full bleed styling
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0mm",
        bottom: "0mm",
        left: "0mm",
        right: "0mm",
      },
    });

    await browser.close();

    // 4. Return as response attachment
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
