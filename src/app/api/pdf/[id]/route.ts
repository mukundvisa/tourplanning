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
import { getSiteLogoSettings } from "@/actions/settings";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Converts database storage URLs (/api/storage/[id]), local paths, or remote URLs
 * into base64 Data URIs so Puppeteer renders them 100% reliably in serverless environments.
 */
async function resolveImageToDataUri(src: string | null | undefined): Promise<string> {
  if (!src) return "";
  if (src.startsWith("data:image/")) return src;

  // 1. Database Storage URL (/api/storage/[id])
  if (src.startsWith("/api/storage/")) {
    const fileId = src.replace("/api/storage/", "").trim();
    try {
      const rows: any = await db.$queryRawUnsafe(
        `SELECT "mimeType", "dataBase64" FROM "StorageFile" WHERE id = $1 LIMIT 1;`,
        fileId
      );
      if (rows && rows.length > 0) {
        return `data:${rows[0].mimeType || "image/jpeg"};base64,${rows[0].dataBase64}`;
      }
    } catch (e) {
      console.warn("Could not load image from StorageFile table:", e);
    }
  }

  // 2. Local relative URL (e.g. /brand-logo.png, /uploads/..., /banner.png)
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
            : ext === "ico"
            ? "image/x-icon"
            : "image/jpeg";
        return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
      }
    } catch (e) {
      console.warn("Failed to read local uploaded image:", src, e);
    }
  }

  // 3. Remote URL (http:// or https://)
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

/**
 * Intelligent helper to choose relevant location place icons based on place type / activity
 */
function getPlaceIcon(placeOrCityName: string): string {
  const p = (placeOrCityName || "").toLowerCase();
  if (
    p.includes("temple") ||
    p.includes("mandir") ||
    p.includes("darshan") ||
    p.includes("ghat") ||
    p.includes("ashram") ||
    p.includes("shrine") ||
    p.includes("jyotirlinga") ||
    p.includes("mahakal") ||
    p.includes("church") ||
    p.includes("mosque") ||
    p.includes("gurudwara") ||
    p.includes("omkareshwar") ||
    p.includes("bada ganpati")
  ) {
    return "🛕";
  }
  if (
    p.includes("fort") ||
    p.includes("palace") ||
    p.includes("mahal") ||
    p.includes("museum") ||
    p.includes("monument") ||
    p.includes("heritage") ||
    p.includes("gate") ||
    p.includes("haveli") ||
    p.includes("statue") ||
    p.includes("tower") ||
    p.includes("rajwada") ||
    p.includes("lal bagh")
  ) {
    return "🏛️";
  }
  if (
    p.includes("beach") ||
    p.includes("lake") ||
    p.includes("river") ||
    p.includes("waterfall") ||
    p.includes("falls") ||
    p.includes("island") ||
    p.includes("bay") ||
    p.includes("sea") ||
    p.includes("cove")
  ) {
    return "🏖️";
  }
  if (
    p.includes("hill") ||
    p.includes("mountain") ||
    p.includes("peak") ||
    p.includes("valley") ||
    p.includes("pass") ||
    p.includes("trek") ||
    p.includes("viewpoint") ||
    p.includes("cliff")
  ) {
    return "🏔️";
  }
  if (
    p.includes("safari") ||
    p.includes("jungle") ||
    p.includes("forest") ||
    p.includes("park") ||
    p.includes("sanctuary") ||
    p.includes("nature") ||
    p.includes("garden") ||
    p.includes("wildlife") ||
    p.includes("ralamandal")
  ) {
    return "🌿";
  }
  if (
    p.includes("hotel") ||
    p.includes("resort") ||
    p.includes("stay") ||
    p.includes("villa") ||
    p.includes("palace hotel") ||
    p.includes("lodge")
  ) {
    return "🏨";
  }
  if (
    p.includes("food") ||
    p.includes("cafe") ||
    p.includes("restaurant") ||
    p.includes("bazaar") ||
    p.includes("market") ||
    p.includes("street food") ||
    p.includes("dining") ||
    p.includes("chappan") ||
    p.includes("sarafa")
  ) {
    return "🍴";
  }
  if (p.includes("flight") || p.includes("airport") || p.includes("aerodrome") || p.includes("air")) {
    return "✈️";
  }
  if (p.includes("drive") || p.includes("road") || p.includes("transfer") || p.includes("cab") || p.includes("car")) {
    return "🚗";
  }
  return "📍";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Fetch Site Logo & Watermark Settings directly from GeneralSettings table
    const logoSettingsRes = await getSiteLogoSettings();
    const siteLogo = logoSettingsRes.data?.logoUrl || "/brand-logo.png";
    const watermarkOpacity =
      logoSettingsRes.data?.watermarkOpacity !== undefined
        ? Number(logoSettingsRes.data.watermarkOpacity)
        : 0.06;

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

    // Resolve site logo and cover image to reliable base64 Data URIs
    let logoDataUri = siteLogo ? await resolveImageToDataUri(siteLogo) : "";
    if (!logoDataUri) {
      logoDataUri = await resolveImageToDataUri("/brand-logo.png");
    }

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

    // =========================================================================
    // DYNAMIC ICON-BASED TRAVEL JOURNEY (Minimal, Clean Text, No Place Images)
    // Structure: Source -> Day 1 -> Day 2 -> ... -> Last Day -> Destination
    // =========================================================================
    const sourceCity = trip.departureCity || "Origin Hub";
    const destCity = trip.destination || "Destination";

    // Determine flight sectors
    const flightSectors = trip.flightDetails.map((f: any) => f.sector?.toLowerCase() || "");

    interface VisualStop {
      id: string;
      stopType: "source" | "day" | "destination";
      dayNumber?: number;
      badge: string;
      city: string;
      title: string;
      places: string[];
      description: string;
      transferMode: "road" | "flight";
      accentColor: string;
      placeIcon: string;
    }

    const visualStops: VisualStop[] = [];

    // 1. Source Stop (Start-point / Departure Location Icon)
    const isSourceFlight = flightSectors.some((s) => s.includes(sourceCity.toLowerCase()));
    visualStops.push({
      id: "source",
      stopType: "source",
      badge: "ORIGIN",
      city: sourceCity,
      title: `Departure from ${sourceCity}`,
      places: [`Departure Hub (Ex-${sourceCity})`],
      description: `Commence travel journey towards ${destCity}`,
      transferMode: isSourceFlight ? "flight" : "road",
      accentColor: "#1D4ED8", // Royal Blue
      placeIcon: "🛫",
    });

    // 2. Day-wise Stops (Relevant Location Place-Type Icons)
    const colorPalette = ["#B8944F", "#A6572E", "#6B7A5E", "#14213D"];

    trip.itineraryDays.forEach((d: any) => {
      const placesArr = Array.isArray(d.places) ? d.places : [];
      const currentCity = d.cityOrStay || destCity;
      const descText = d.description
        ? d.description.length > 70
          ? d.description.slice(0, 70).trim() + "..."
          : d.description
        : `Sightseeing & activities in ${currentCity}`;

      const isFlight = flightSectors.some((s) => s.includes(currentCity.toLowerCase()));
      
      // Determine primary place type icon based on places list, day title, or city
      const combinedPlaceString = `${placesArr.join(" ")} ${d.title || ""} ${currentCity}`;
      const placeIcon = getPlaceIcon(combinedPlaceString);

      visualStops.push({
        id: `day-${d.dayNumber}`,
        stopType: "day",
        dayNumber: d.dayNumber,
        badge: `DAY ${d.dayNumber}`,
        city: currentCity,
        title: d.title,
        places: placesArr.length > 0 ? placesArr : [currentCity],
        description: descText,
        transferMode: isFlight ? "flight" : "road",
        accentColor: colorPalette[(d.dayNumber - 1) % colorPalette.length],
        placeIcon: placeIcon,
      });
    });

    // 3. Destination Stop (Destination / Return Location Icon)
    visualStops.push({
      id: "destination",
      stopType: "destination",
      badge: "DESTINATION",
      city: destCity,
      title: `Arrival at ${destCity}`,
      places: [`Final Destination (${destCity})`],
      description: `Official itinerary conclusion & return transit to ${sourceCity}`,
      transferMode: "road",
      accentColor: "#047857", // Emerald Green
      placeIcon: "🏁",
    });

    // =========================================================================
    // DYNAMIC SERPENTINE PATH COORDINATES CALCULATION
    // =========================================================================
    const totalStops = visualStops.length;
    const canvasWidth = 760;

    let numRows = 1;
    let stopsPerRow = totalStops;
    if (totalStops >= 7) {
      numRows = 3;
      stopsPerRow = Math.ceil(totalStops / 3);
    } else if (totalStops >= 5) {
      numRows = 2;
      stopsPerRow = Math.ceil(totalStops / 2);
    }

    const canvasHeight = numRows === 1 ? 165 : numRows === 2 ? 320 : 475;
    const rowHeight = (canvasHeight - 20) / numRows;

    interface NodePoint {
      stop: VisualStop;
      x: number;
      y: number; // Marker circle center Y
      row: number;
      isGoingRight: boolean;
    }

    const nodePoints: NodePoint[] = [];

    visualStops.forEach((stop, index) => {
      const rowIndex = Math.floor(index / stopsPerRow);
      const indexInRow = index % stopsPerRow;
      const isGoingRight = rowIndex % 2 === 0;

      const stopsInThisRow =
        rowIndex === numRows - 1
          ? totalStops - rowIndex * stopsPerRow
          : stopsPerRow;

      const marginX = stopsInThisRow <= 2 ? 160 : stopsInThisRow <= 3 ? 110 : 85;
      const effectiveWidth = canvasWidth - marginX * 2;
      const stepX = stopsInThisRow > 1 ? effectiveWidth / (stopsInThisRow - 1) : effectiveWidth / 2;

      let x = marginX + indexInRow * stepX;
      if (!isGoingRight) {
        x = canvasWidth - marginX - indexInRow * stepX;
      }

      const y = 30 + rowIndex * rowHeight;

      nodePoints.push({
        stop,
        x: Math.round(x),
        y: Math.round(y),
        row: rowIndex,
        isGoingRight,
      });
    });

    // SVG Curved Dashed Connecting Paths (Between circular marker centers)
    const pathSegments: string[] = [];
    const transitMarkers: string[] = [];

    for (let i = 0; i < nodePoints.length - 1; i++) {
      const p1 = nodePoints[i];
      const p2 = nodePoints[i + 1];

      let pathD = "";
      let midX = (p1.x + p2.x) / 2;
      let midY = (p1.y + p2.y) / 2;

      if (p1.row === p2.row) {
        const arcDip = -14;
        const ctrlX = (p1.x + p2.x) / 2;
        const ctrlY = (p1.y + p2.y) / 2 + arcDip;
        pathD = `M ${p1.x},${p1.y} Q ${ctrlX},${ctrlY} ${p2.x},${p2.y}`;
        // Mathematical midpoint of quadratic Bézier curve at t = 0.5
        midX = 0.25 * p1.x + 0.5 * ctrlX + 0.25 * p2.x;
        midY = 0.25 * p1.y + 0.5 * ctrlY + 0.25 * p2.y;
      } else {
        const outwards = p1.isGoingRight ? 50 : -50;
        const c1x = p1.x + outwards;
        const c1y = p1.y + 35;
        const c2x = p2.x + outwards;
        const c2y = p2.y - 35;
        pathD = `M ${p1.x},${p1.y} C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
        // Mathematical midpoint of cubic Bézier curve at t = 0.5
        midX = 0.125 * p1.x + 0.375 * c1x + 0.375 * c2x + 0.125 * p2.x;
        midY = 0.125 * p1.y + 0.375 * c1y + 0.375 * c2y + 0.125 * p2.y;
      }

      pathSegments.push(`
        <path d="${pathD}" fill="none" stroke="#B8944F" stroke-width="2.2" stroke-dasharray="6,5" stroke-linecap="round" opacity="0.85" />
      `);

      const isFlight = p1.stop.transferMode === "flight";
      const vehicleIconSvg = isFlight
        ? `<svg class="w-3.5 h-3.5 text-[#14213D]" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`
        : `<svg class="w-3.5 h-3.5 text-[#A6572E]" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM7.5 15c-.83 0-1.5-.67-1.5-1.5S6.67 12 7.5 12s1.5.67 1.5 1.5S8.33 15 7.5 15zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`;

      // Transport icon exactly centered on the connecting dashed path line
      transitMarkers.push(`
        <div style="position: absolute; left: ${Math.round(midX)}px; top: ${Math.round(midY)}px; transform: translate(-50%, -50%); z-index: 10;">
          <div class="h-5 w-5 bg-white rounded-full border border-[#B8944F]/60 flex items-center justify-center shadow-xs">
            ${vehicleIconSvg}
          </div>
        </div>
      `);
    }

    // Clean Stop Nodes (Location-style pin markers with place-type icons, clean text below without extra icons)
    const stopNodesHtml = nodePoints
      .map((np) => {
        const { stop, x, y } = np;
        const isSource = stop.stopType === "source";
        const isDest = stop.stopType === "destination";

        // Places string for clean text display (clean bullets, no additional icons)
        const placesText = stop.places
          .slice(0, 3)
          .map((p) => `<span class="text-zinc-700 font-semibold">&bull; ${p}</span>`)
          .join(" ");

        let markerBg = "bg-[#B8944F] text-white";
        let markerBorder = "border-white ring-2 ring-[#B8944F]/40";
        let pinTailBg = "bg-[#B8944F]";
        let cityColor = "text-[#14213D]";

        if (isSource) {
          markerBg = "bg-blue-600 text-white";
          markerBorder = "border-blue-200 ring-2 ring-blue-100";
          pinTailBg = "bg-blue-600";
          cityColor = "text-blue-900";
        } else if (isDest) {
          markerBg = "bg-emerald-700 text-white";
          markerBorder = "border-emerald-200 ring-2 ring-emerald-100";
          pinTailBg = "bg-emerald-700";
          cityColor = "text-emerald-950";
        }

        return `
          <!-- Location Map Pin Marker on Path (Location/Map style with relevant place icon) -->
          <div style="position: absolute; left: ${x}px; top: ${y}px; transform: translate(-50%, -50%); z-index: 25;">
            <div class="relative flex flex-col items-center justify-center">
              <div class="h-8 w-8 rounded-full ${markerBg} ${markerBorder} flex items-center justify-center text-sm shadow-md">
                ${stop.placeIcon}
              </div>
              <div class="w-1.5 h-1.5 ${pinTailBg} rotate-45 -mt-1 shadow-2xs"></div>
            </div>
          </div>

          <!-- Clean Text Block Below Marker (Clean text without extra icons, no line crossing) -->
          <div style="position: absolute; left: ${x}px; top: ${y + 20}px; transform: translateX(-50%); z-index: 20; width: 135px; max-width: 145px; text-align: center;">
            <div class="flex flex-col items-center pt-1">
              
              <!-- Day / Stop Badge -->
              <div class="mb-0.5">
                <span class="text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                  isSource
                    ? "bg-blue-100 text-blue-800"
                    : isDest
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-[#B8944F]/15 text-[#B8944F]"
                }">
                  ${stop.badge}
                </span>
              </div>

              <!-- City Name (Bold) -->
              <h4 class="text-xs font-black uppercase tracking-tight ${cityColor} leading-tight truncate w-full" title="${stop.city}">
                ${stop.city}
              </h4>

              <!-- Places Visited (Clean text with bullet points, no extra icons) -->
              ${
                placesText
                  ? `<div class="text-[8.5px] text-zinc-700 leading-tight mt-0.5 line-clamp-2 w-full">${placesText}</div>`
                  : ""
              }

              <!-- Short Visit Note -->
              <p class="text-[7.5px] text-zinc-500 line-clamp-1 mt-0.5 leading-tight font-medium w-full" title="${stop.description}">
                ${stop.description}
              </p>

            </div>
          </div>
        `;
      })
      .join("");

    // Summary glance table rows
    const glanceRows = trip.itineraryDays
      .map(
        (d: any) => `
      <tr class="border-b border-zinc-150 break-avoid">
        <td class="py-2 font-bold text-[#B8944F] pr-2 whitespace-nowrap text-xs w-[18%]">
          Day ${d.dayNumber}
        </td>
        <td class="py-2 text-zinc-700 font-semibold pr-2 text-xs w-[32%]">
          ${d.cityOrStay || trip.destination}
        </td>
        <td class="py-2 text-zinc-900 font-bold text-xs w-[50%] leading-snug">
          ${d.title}
        </td>
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
      <div class="flex justify-between items-center border-b border-zinc-100 py-1.5 text-xs">
        <span class="text-zinc-600 font-medium">${item.label}</span>
        <span class="font-bold text-[#14213D] font-mono">₹${item.amount.toLocaleString("en-IN")}</span>
      </div>
    `
      )
      .join("");

    // Detailed Days HTML
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
        <div class="pdf-section break-avoid bg-white/90 border border-zinc-200/90 rounded-2xl p-4 sm:p-5 mb-4 shadow-2xs">
          <!-- Top Day Header Bar -->
          <div class="flex justify-between items-center text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-150 pb-2 mb-2.5">
            <span class="font-bold text-[#14213D]">${trip.title}</span>
            <span class="font-semibold text-[#B8944F]">Day ${day.dayNumber} Daily Itinerary</span>
          </div>

          <div class="flex justify-between items-start border-b border-[#B8944F]/25 pb-2.5 mb-2.5">
            <div class="flex items-center space-x-3">
              <span class="h-8 w-8 bg-[#B8944F] text-white rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                ${day.dayNumber}
              </span>
              <div>
                <h3 class="text-sm font-bold text-[#14213D] leading-snug">${day.title}</h3>
                <p class="text-[11px] text-[#B8944F] font-bold mt-0.5">Stay / Region: ${day.cityOrStay || trip.destination}</p>
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
          <div class="text-xs leading-relaxed text-zinc-700 font-normal mb-3 whitespace-pre-line">
            ${day.description || "Scheduled sightseeing and curated local activities as per the travel itinerary program."}
          </div>

          <!-- Inclusions & Exclusions Grid -->
          <div class="grid grid-cols-2 gap-3 pt-2.5 border-t border-zinc-150">
            <div class="bg-emerald-50/40 border border-emerald-100 p-3 rounded-xl">
              <p class="text-[10px] text-emerald-800 font-bold uppercase tracking-wider mb-1.5">Day Inclusions</p>
              <ul class="list-none space-y-0.5">
                ${inclusionsList || '<li class="text-zinc-400 italic text-xs">Standard itinerary inclusions apply</li>'}
              </ul>
            </div>
            <div class="bg-rose-50/40 border border-rose-100 p-3 rounded-xl">
              <p class="text-[10px] text-rose-800 font-bold uppercase tracking-wider mb-1.5">Day Exclusions</p>
              <ul class="list-none space-y-0.5">
                ${exclusionsList || '<li class="text-zinc-400 italic text-xs">Personal expenses & optional activities</li>'}
              </ul>
            </div>
          </div>

          <!-- Traveler Insights & Advisory Guidelines -->
          ${
            lovedTips || watchOutTips
              ? `
            <div class="grid grid-cols-2 gap-3 pt-2.5 mt-2.5 border-t border-zinc-100">
              ${
                lovedTips
                  ? `
                <div class="bg-amber-50/40 border border-amber-200/80 p-3 rounded-xl">
                  <h5 class="text-[10px] font-bold text-[#B8944F] mb-1 uppercase tracking-wider flex items-center gap-1">
                    <span>★</span> What Travelers Love
                  </h5>
                  <ul class="space-y-0.5">${lovedTips}</ul>
                </div>
              `
                  : ""
              }
              ${
                watchOutTips
                  ? `
                <div class="bg-amber-50/60 border border-amber-200 p-3 rounded-xl">
                  <h5 class="text-[10px] font-bold text-amber-900 mb-1 uppercase tracking-wider flex items-center gap-1">
                    <span>⚠️</span> Advisory Guidelines
                  </h5>
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
        <div class="pdf-section break-avoid bg-white/90 border border-zinc-200/90 rounded-2xl p-4 sm:p-5 mb-4 shadow-2xs">
          <div class="flex justify-between items-start border-b border-[#B8944F]/25 pb-2.5 mb-2.5">
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

          <div class="grid grid-cols-12 gap-3.5">
            <div class="col-span-7 space-y-2.5">
              <div class="text-xs">
                <p class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Room Category & Meal Plan</p>
                <p class="font-bold text-[#14213D] mt-0.5">${acc.roomType || "Standard Luxury Room"} (${acc.mealPlan || "CP"})</p>
              </div>

              ${
                facilitiesTags
                  ? `
                <div>
                  <p class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Amenities & Highlights</p>
                  <div class="flex flex-wrap gap-1">${facilitiesTags}</div>
                </div>
              `
                  : ""
              }
            </div>

            <div class="col-span-5 grid grid-cols-3 gap-1.5 content-start">
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
            <td class="p-2.5 font-bold text-[#14213D] align-top">
              <div class="flex items-center flex-wrap gap-1">
                <span class="bg-[#B8944F]/15 text-[#B8944F] text-[9px] font-bold px-2 py-0.5 rounded mr-1">${typeLabel}</span>
                <span>${f.sector}</span>
                ${startingBadge}
                ${packageBadge}
              </div>
              ${f.flightNotes ? `<div class="text-[10px] text-zinc-500 mt-1 italic">${f.flightNotes}</div>` : ""}
            </td>
            <td class="p-2.5 align-top font-semibold text-[#14213D]">
              ${f.airline}
              ${f.flightCodeDefault ? `<div class="text-[9px] text-zinc-400 font-mono mt-0.5">${f.flightCodeDefault}</div>` : ""}
            </td>
            <td class="p-2.5 align-top font-mono text-[11px]">${depTime}</td>
            <td class="p-2.5 align-top font-mono text-[11px]">${arrTime}</td>
            <td class="p-2.5 align-top">
              <p class="font-bold text-xs">${durationOrStops}</p>
              ${f.layoverInfo ? `<p class="text-[9px] text-zinc-400 mt-0.5">${f.layoverInfo}</p>` : ""}
            </td>
            <td class="p-2.5 text-right align-top font-mono text-[11px]">
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
          <td class="p-2.5 font-bold text-[#14213D]">${addon.name}</td>
          <td class="p-2.5 text-zinc-600">
            ${desc?.visaType ? `<p><span class="font-bold">Visa Type:</span> ${desc.visaType}</p>` : ""}
            ${desc?.length ? `<p><span class="font-bold">Validity:</span> ${desc.length}</p>` : ""}
            ${desc?.details ? `<p class="italic text-zinc-500 mt-0.5">${desc.details}</p>` : ""}
          </td>
          <td class="p-2.5 text-right font-bold text-[#14213D] font-mono">₹${addon.price.toLocaleString("en-IN")} ${addon.priceType}</td>
        </tr>
      `;
      })
      .join("");

    // Dining suggestions
    const diningCards = trip.restaurantSuggestions
      .map(
        (rest: any) => `
      <div class="bg-white/90 border border-zinc-200/90 p-3 rounded-xl break-avoid shadow-2xs">
        <h4 class="font-bold text-[#14213D] text-xs">${rest.name}</h4>
        <p class="text-[10px] text-zinc-500 mt-0.5">📍 ${rest.location} &bull; ${rest.category} (${rest.cuisineType})</p>
        <div class="flex items-center justify-between mt-1.5 pt-1.5 border-t border-zinc-100">
          ${rest.rating ? `<span class="text-[10px] text-amber-600 font-bold">★ ${rest.rating} (${rest.reviewCount || 100}+ reviews)</span>` : "<span></span>"}
          ${rest.isVeg ? `<span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Pure Veg / Jain</span>` : ""}
        </div>
      </div>
    `
      )
      .join("");

    const terms = trip.tripTerms;

    // Compile continuous, natural-flow HTML layout with generous top margins, clean visual journey, and all-page watermark
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${trip.title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap');
          
          /* Generous page margins with ample top spacing so content never touches header */
          @page {
            size: A4;
            margin: 18mm 6mm 14mm 6mm;
          }
          
          * {
            box-sizing: border-box;
          }

          html, body {
            background-color: transparent !important;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #14213D;
            margin: 0;
            padding: 4px 2px 0 2px;
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

          /* FIXED REPEATING WATERMARK: Layered softly across EVERY page behind all cards and tables */
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
            opacity: ${watermarkOpacity};
          }

          .pdf-watermark-logo {
            max-width: 58%;
            max-height: 38%;
            object-fit: contain;
            filter: grayscale(100%);
          }

          .pdf-watermark-text {
            font-family: 'Fraunces', Georgia, serif;
            font-size: 4.8rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            color: #14213D;
            transform: rotate(-25deg);
          }

          /* PREVENT CROPPING & SECTION SPLITTING ACROSS PAGES */
          .pdf-section, 
          .break-avoid,
          .pdf-section-wrapper,
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* KEEP HEADINGS TOGETHER WITH THEIR CONTENT - NEVER ORPHAN A HEADING */
          h1, h2, h3, h4, h5, h6, .section-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          /* CARD STYLING WITH SUBTLE TRANSLUCENCY SO WATERMARK IS ALWAYS VISIBLE BEHIND CONTENT */
          .pdf-section {
            background-color: rgba(255, 255, 255, 0.40) !important;
          }
          .bg-white {
            background-color: rgba(255, 255, 255, 0.40) !important;
          }
          table, thead, tbody, tr, th, td {
            background-color: transparent !important;
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
      <body class="space-y-4 bg-transparent">
        
        <!-- Watermark Behind Content (Repeats on every page) -->
        <div class="pdf-watermark-container">
          ${
            logoDataUri
              ? `<img src="${logoDataUri}" alt="Watermark" class="pdf-watermark-logo" />`
              : `<span class="pdf-watermark-text">TripPlanner</span>`
          }
        </div>

        <!-- ========================================================= -->
        <!-- FIRST PAGE - SECTION 1: HERO COVER BANNER -->
        <!-- ========================================================= -->
        <div class="pdf-section break-avoid bg-white/95 border border-zinc-200/90 rounded-2xl overflow-hidden shadow-2xs mb-4">
          <div class="h-[75mm] w-full relative">
            <img src="${coverImageDataUri}" class="h-full w-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-[#14213D] via-[#14213D]/50 to-transparent"></div>
            
            <!-- Top Bar: Logo & Proposal Badge -->
            <div class="absolute top-4 left-5 right-5 flex justify-between items-center">
              <div class="flex items-center space-x-2.5">
                ${
                  logoDataUri
                    ? `<div class="h-10 w-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-xs border border-white/60 p-0.5">
                         <img src="${logoDataUri}" class="h-full w-full rounded-full object-cover" />
                       </div>
                       <span class="text-lg font-black text-white tracking-tight font-fraunces drop-shadow-sm">
                         Trip<span class="text-[#B8944F]">Planner</span>
                       </span>`
                    : `<span class="text-xl font-black text-white tracking-tight font-fraunces drop-shadow-sm">TripPlanner</span>`
                }
              </div>
              <span class="text-[9px] font-bold px-3 py-1.5 bg-[#B8944F] text-white rounded-full uppercase tracking-wider shadow-sm">
                Bespoke Travel Proposal
              </span>
            </div>
            
            <!-- Bottom Hero Content -->
            <div class="absolute bottom-4 left-5 right-5">
              <span class="text-[9px] font-bold text-white bg-[#B8944F]/90 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Official Itinerary Blueprint
              </span>
              <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mt-1.5 font-fraunces drop-shadow-sm">
                ${trip.title}
              </h1>
              <p class="text-xs text-zinc-200 font-semibold mt-1">
                Route: ${trip.departureCity} ➔ ${trip.destination}
              </p>
            </div>
          </div>

          <!-- Hero Metadata Bar -->
          <div class="p-4 sm:p-5 bg-white/90">
            <div class="grid grid-cols-2 gap-4 border-b border-zinc-150 pb-3">
              <div>
                <p class="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Travel Schedule & Group</p>
                <p class="font-bold text-[#14213D] text-xs mt-0.5">
                  ${new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} to 
                  ${new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p class="text-zinc-600 font-medium text-[11px] mt-0.5">
                  ${trip.durationDays} Days / ${trip.durationNights} Nights &bull; ${trip.numTravellers} Travellers
                </p>
              </div>
              <div>
                <p class="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Dedicated Travel Consultant</p>
                <p class="font-bold text-[#14213D] text-xs mt-0.5">${trip.consultantName}</p>
                <p class="text-zinc-600 font-medium text-[11px] mt-0.5">Phone: ${trip.consultantPhone || "Agency Concierge"}</p>
              </div>
            </div>

            <div class="flex justify-between items-center text-[10px] text-zinc-400 font-medium pt-2.5">
              <p>&copy; TripPlanner &bull; Curated Luxury Journeys</p>
              <p>Proposal Date: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- FIRST PAGE - SECTION 2: CLEAN ICON-BASED TRAVEL JOURNEY   -->
        <!-- (Generous top spacing, location-style pin markers, clean text) -->
        <!-- ========================================================= -->
        <div class="pdf-section break-avoid mt-6 pt-3 pb-2 mb-4">
          
          <!-- Top Route Header Bar (Generous breathing room) -->
          <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-[#B8944F]/30 pb-2 mb-3">
            <div>
              <span class="text-[9px] font-black text-[#B8944F] uppercase tracking-widest block">
                Travel Itinerary &amp; Visual Journey
              </span>
              <h2 class="text-base sm:text-lg font-black text-[#14213D] font-fraunces tracking-tight mt-0.5">
                ${sourceCity.toUpperCase()} ➔ ${destCity.toUpperCase()}
              </h2>
            </div>
            <div class="text-[9.5px] font-bold text-zinc-500">
              ${trip.itineraryDays.length} Days Connected Journey &bull; Ex-${sourceCity}
            </div>
          </div>

          <!-- Free-Flowing Route Canvas (Clean transparent SVG path + Location Map Pin Markers) -->
          <div class="relative w-full overflow-hidden" style="height: ${canvasHeight}px;">
            
            <!-- SVG Vector Layer (Curved Dashed Routes strictly between Marker centers) -->
            <svg viewBox="0 0 ${canvasWidth} ${canvasHeight}" class="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
              ${pathSegments.join("")}
            </svg>

            <!-- Transit Vehicle Badges exactly centered on the connecting path -->
            ${transitMarkers.join("")}

            <!-- Chronological Stop Nodes (Location Pin Markers with Place Icons, Clean Text below) -->
            ${stopNodesHtml}
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- FIRST PAGE - SECTION 3: PRICING & AT A GLANCE SUMMARY -->
        <!-- ========================================================= -->
        <div class="pdf-section break-avoid bg-white/95 border border-zinc-200/90 rounded-2xl p-4 sm:p-5 mb-4 shadow-2xs">
          <div class="flex justify-between items-center text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-150 pb-2 mb-3">
            <span class="font-bold text-[#14213D]">${trip.title}</span>
            <span class="font-semibold text-[#B8944F]">Proposal Summary &amp; Price Quotation</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <!-- Cost Breakdown -->
            <div class="bg-white/90 border border-zinc-200/90 p-3.5 sm:p-4 rounded-xl space-y-2">
              <h3 class="text-[11px] font-bold text-[#B8944F] uppercase tracking-wider">Pricing Plan Breakdown</h3>
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
                <div class="p-2 bg-zinc-50 rounded-lg border border-zinc-200 text-[10px] text-zinc-600 leading-relaxed">
                  <span class="font-bold text-zinc-800 block mb-0.5">Commercial Notes:</span>
                  ${trip.tripFinancials.notes}
                </div>
              `
                  : ""
              }
            </div>

            <!-- Trip Highlights At A Glance Table (Fully visible & uncropped) -->
            <div class="bg-white/90 border border-zinc-200/90 p-3.5 sm:p-4 rounded-xl">
              <h3 class="text-[11px] font-bold text-[#B8944F] uppercase tracking-wider mb-2">TRIP HIGHLIGHTS AT A GLANCE</h3>
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-zinc-300 text-zinc-400 font-bold uppercase text-[9px]">
                    <th class="pb-1.5 w-[18%]">Day</th>
                    <th class="pb-1.5 w-[32%]">Region</th>
                    <th class="pb-1.5 w-[50%]">Highlight</th>
                  </tr>
                </thead>
                <tbody>
                  ${glanceRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- DAY-BY-DAY DETAILED ITINERARY (Moves gracefully to Page 2+) -->
        <!-- ========================================================= -->
        <div class="pdf-section-wrapper mb-4 space-y-3">
          <div class="flex items-center justify-between pb-1 break-avoid">
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
          <div class="pdf-section-wrapper mb-4 space-y-3">
            <div class="flex items-center justify-between pb-1 break-avoid">
              <h2 class="text-base font-bold text-[#14213D] font-fraunces">
                Stays &amp; Accommodations
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
          <div class="pdf-section break-avoid bg-white/90 border border-zinc-200/90 rounded-2xl p-4 sm:p-5 mb-4 shadow-2xs">
            ${
              flightsRows
                ? `
              <div class="space-y-3">
                <div class="flex items-center justify-between border-b border-zinc-150 pb-2">
                  <h3 class="text-sm font-bold text-[#14213D] font-fraunces flex items-center gap-1.5">
                    🚗 Transportation &amp; Transit Schedule
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
              <div class="space-y-3 pt-3.5 ${flightsRows ? "border-t border-zinc-200 mt-3.5" : ""}">
                <div class="flex items-center justify-between border-b border-zinc-150 pb-2">
                  <h3 class="text-sm font-bold text-[#14213D] font-fraunces">
                    ➕ Included Add-ons &amp; Visa Packages
                  </h3>
                </div>
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 text-[10px]">
                    <tr>
                      <th class="p-2">Package / Service Name</th>
                      <th class="p-2">Validity &amp; Processing Details</th>
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
          <div class="pdf-section break-avoid bg-white/90 border border-zinc-200/90 rounded-2xl p-4 sm:p-5 mb-4 shadow-2xs">
            <div class="flex items-center justify-between border-b border-zinc-150 pb-2 mb-3">
              <h3 class="text-sm font-bold text-[#14213D] font-fraunces flex items-center gap-1.5">
                🍴 Recommended Dining &amp; Hotspots
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
          <div class="pdf-section break-avoid bg-white/90 border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs mb-4">
            <div class="flex justify-between items-center text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-200 pb-1.5 mb-3">
              <span class="font-bold text-[#14213D]">${trip.title}</span>
              <span class="font-semibold text-[#B8944F]">Policies &amp; Commercial Guidelines</span>
            </div>

            <h2 class="text-base font-bold text-[#14213D] mb-3 font-fraunces">
              Master Policies &amp; Guidelines
            </h2>
            
            <div class="space-y-3 text-xs text-zinc-700 font-normal prose max-w-none">
              <div class="bg-white/90 p-3.5 border border-zinc-200/90 rounded-xl">
                <h4 class="font-bold text-[#14213D] text-xs mb-1">1. Payment Policy</h4>
                <div>${terms.paymentPolicy || "Standard booking deposit and structured payment schedule apply."}</div>
              </div>
              
              <div class="bg-white/90 p-3.5 border border-zinc-200/90 rounded-xl">
                <h4 class="font-bold text-[#14213D] text-xs mb-1">2. Cancellation Policy</h4>
                <div>${terms.cancellationPolicy || "Strict operator cancellation policy and supplier penalties apply."}</div>
              </div>

              <div class="bg-white/90 p-3.5 border border-zinc-200/90 rounded-xl">
                <h4 class="font-bold text-[#14213D] text-xs mb-1">3. Visa Rules &amp; Entry Requirements</h4>
                <div>${terms.visaRules || "Minimum 6 months passport validity required from scheduled date of return."}</div>
              </div>

              <div class="bg-white/90 p-3.5 border border-zinc-200/90 rounded-xl">
                <h4 class="font-bold text-[#14213D] text-xs mb-1">4. General Notes &amp; Advisory</h4>
                <div>${terms.generalNotes || "Standard international travel advisories, health regulations, and insurance conditions apply."}</div>
              </div>
            </div>

            <div class="border-t border-zinc-200 pt-3 mt-4 flex justify-between items-center text-[10px] text-zinc-400 font-medium">
              <span>&copy; TripPlanner &bull; Custom Travel Proposal</span>
              <span class="font-bold text-[#14213D]">Official Customer Travel Proposal</span>
            </div>
          </div>
        `
            : ""
        }

      </body>
      </html>
    `;

    // 3. Launch Puppeteer (Local Dev & Vercel Serverless Safe)
    let browser;
    try {
      let options: any = {};
      
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
        // Vercel / AWS Lambda Linux Environment
        let execPath = process.env.CHROMIUM_EXECUTABLE_PATH || "";

        if (!execPath) {
          // Check if already unpacked in /tmp
          const tmpChromium = "/tmp/chromium";
          if (existsSync(tmpChromium)) {
            execPath = tmpChromium;
          }
        }

        if (!execPath) {
          // Check if local bin exists in serverless package
          const possibleBinPaths = [
            join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin"),
            "/var/task/node_modules/@sparticuz/chromium/bin",
          ];
          const localBin = possibleBinPaths.find((p) => existsSync(p));

          if (localBin) {
            try {
              execPath = await chromium.executablePath(localBin);
            } catch (localErr) {
              console.warn("Failed local bin extraction:", localErr);
            }
          }
        }

        // If local bin not found on Vercel, load via remote Sparticuz pack URL
        if (!execPath) {
          const packUrls = [
            "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar",
            "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar",
            "https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar",
          ];

          for (const url of packUrls) {
            try {
              execPath = await chromium.executablePath(url);
              if (execPath) break;
            } catch (remoteErr) {
              console.warn(`Remote pack failed for ${url}:`, remoteErr);
            }
          }
        }

        if (!execPath) {
          execPath = await chromium.executablePath();
        }

        options = {
          args: [
            ...(chromium as any).args,
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--single-process",
            "--no-zygote",
          ],
          defaultViewport: (chromium as any).defaultViewport,
          executablePath: execPath,
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

    // Export A4 PDF with guaranteed top margins (18mm) and repeating header/footer
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 8px; color: #9CA3AF; width: 100%; padding: 0 6mm; display: flex; justify-content: space-between; font-family: sans-serif; font-weight: 600;">
          <span style="color: #14213D; font-weight: 700; letter-spacing: 0.05em;">TripPlanner</span>
          <span style="color: #6B7280;">${trip.title}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 7.5px; color: #9CA3AF; width: 100%; padding: 0 6mm; display: flex; justify-content: space-between; font-family: sans-serif;">
          <span>Confidential Travel Itinerary Proposal</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: "18mm",
        bottom: "14mm",
        left: "6mm",
        right: "6mm",
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
