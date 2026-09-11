import { db } from "@/lib/db";
import { getSiteLogoSettings } from "@/actions/settings";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";

/**
 * Converts database storage URLs, local paths, or remote URLs to Data URIs
 */
async function resolveImageToDataUri(src: string | null | undefined): Promise<string> {
  if (!src) return "";
  if (src.startsWith("data:image/")) return src;

  // 1. Database Storage URL (/api/storage/[id])
  if (src.startsWith("/api/storage/")) {
    const fileId = src.replace("/api/storage/", "").trim();
    try {
      const file = await db.storageFile.findUnique({
        where: { id: fileId },
        select: { mimeType: true, dataBase64: true },
      });
      if (file) {
        return `data:${file.mimeType || "image/jpeg"};base64,${file.dataBase64}`;
      }
    } catch (e: any) {
      console.warn("Could not load image from StorageFile:", e.message);
    }
  }

  // 2. Local relative URL
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

  // 3. Remote URL
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
 * Helper to choose relevant location place icons
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

export async function renderPdfHtml(tripId: string, autoPrint: boolean = false): Promise<{ html: string; title: string } | null> {
  const logoSettingsRes = await getSiteLogoSettings();
  const siteLogo = logoSettingsRes.data?.logoUrl || "/brand-logo.png";
  const watermarkOpacity =
    logoSettingsRes.data?.watermarkOpacity !== undefined
      ? Number(logoSettingsRes.data.watermarkOpacity)
      : 0.05;

  const [trip, allMasterRoutes] = await Promise.all([
    db.trip.findUnique({
      where: { id: tripId },
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
    }),
    db.masterFlightRoute.findMany({
      include: { city: true },
    }),
  ]);

  if (!trip) return null;

  let logoDataUri = siteLogo ? await resolveImageToDataUri(siteLogo) : "";
  if (!logoDataUri) {
    logoDataUri = await resolveImageToDataUri("/brand-logo.png");
  }

  const rawCoverImage =
    trip.coverImage ||
    trip.accommodations[0]?.photos[0] ||
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80";
  const coverImageDataUri = await resolveImageToDataUri(rawCoverImage);

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

  const sourceCity = trip.departureCity || "Origin Hub";
  const destCity = trip.destination || "Destination";
  const flightSectors = trip.flightDetails.map((f: any) => f.sector?.toLowerCase() || "");

  // ==========================================
  // SECTION 2: VISUAL JOURNEY & ROUTE MAP
  // ==========================================
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
    accentColor: "#14213D",
    placeIcon: "🛫",
  });

  const colorPalette = ["#B8944F", "#A6572E", "#6B7A5E", "#14213D"];

  trip.itineraryDays.forEach((d: any) => {
    const placesArr = Array.isArray(d.places) ? d.places : [];
    const currentCity = d.cityOrStay || destCity;
    const descText = d.description
      ? d.description.replace(/<[^>]*>/g, "").length > 70
        ? d.description.replace(/<[^>]*>/g, "").slice(0, 70).trim() + "..."
        : d.description.replace(/<[^>]*>/g, "")
      : `Sightseeing & activities in ${currentCity}`;

    const isFlight = flightSectors.some((s) => s.includes(currentCity.toLowerCase()));
    const combinedPlaceString = `${placesArr.join(" ")} ${d.title || ""} ${currentCity}`;
    const placeIcon = getPlaceIcon(combinedPlaceString);

    visualStops.push({
      id: `day-${d.dayNumber}`,
      stopType: "day",
      dayNumber: d.dayNumber,
      badge: `DAY ${d.dayNumber < 10 ? "0" + d.dayNumber : d.dayNumber}`,
      city: currentCity,
      title: d.title,
      places: placesArr.length > 0 ? placesArr : [currentCity],
      description: descText,
      transferMode: isFlight ? "flight" : "road",
      accentColor: colorPalette[(d.dayNumber - 1) % colorPalette.length],
      placeIcon: placeIcon,
    });
  });

  visualStops.push({
    id: "destination",
    stopType: "destination",
    badge: "DESTINATION",
    city: destCity,
    title: `Arrival at ${destCity}`,
    places: [`Final Destination (${destCity})`],
    description: `Official itinerary conclusion & return transit to ${sourceCity}`,
    transferMode: "road",
    accentColor: "#6B7A5E",
    placeIcon: "🏁",
  });

  const totalStops = visualStops.length;
  const canvasWidth = 740;

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
    y: number;
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

    const marginX = stopsInThisRow <= 2 ? 150 : stopsInThisRow <= 3 ? 100 : 75;
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
      midX = 0.25 * p1.x + 0.5 * ctrlX + 0.25 * p2.x;
      midY = 0.25 * p1.y + 0.5 * ctrlY + 0.25 * p2.y;
    } else {
      const outwards = p1.isGoingRight ? 45 : -45;
      const c1x = p1.x + outwards;
      const c1y = p1.y + 35;
      const c2x = p2.x + outwards;
      const c2y = p2.y - 35;
      pathD = `M ${p1.x},${p1.y} C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
      midX = 0.125 * p1.x + 0.375 * c1x + 0.375 * c2x + 0.125 * p2.x;
      midY = 0.125 * p1.y + 0.375 * c1y + 0.375 * c2y + 0.125 * p2.y;
    }

    pathSegments.push(`
      <path d="${pathD}" fill="none" stroke="#B8944F" stroke-width="2" stroke-dasharray="5,4" stroke-linecap="round" opacity="0.8" />
    `);

    const isFlight = p1.stop.transferMode === "flight";
    const vehicleIconSvg = isFlight
      ? `<svg style="width: 12px; height: 12px; color: #14213D;" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`
      : `<svg style="width: 12px; height: 12px; color: #A6572E;" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM7.5 15c-.83 0-1.5-.67-1.5-1.5S6.67 12 7.5 12s1.5.67 1.5 1.5S8.33 15 7.5 15zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`;

    transitMarkers.push(`
      <div style="position: absolute; left: ${Math.round(midX)}px; top: ${Math.round(midY)}px; transform: translate(-50%, -50%); z-index: 10;">
        <div style="height: 20px; width: 20px; background-color: rgba(255,255,255,0.9); border-radius: 9999px; border: 1px solid rgba(184, 148, 79, 0.4); display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          ${vehicleIconSvg}
        </div>
      </div>
    `);
  }

  const stopNodesHtml = nodePoints
    .map((np) => {
      const { stop, x, y } = np;
      const isSource = stop.stopType === "source";
      const isDest = stop.stopType === "destination";

      const placesText = stop.places
        .slice(0, 3)
        .map((p) => `<span style="color: #4A4E58; font-weight: 600;">&bull; ${p}</span>`)
        .join(" ");

      let markerBg = "background-color: #B8944F; color: #FFFFFF;";
      let markerBorder = "border: 2px solid #FFFFFF; box-shadow: 0 2px 6px rgba(184, 148, 79, 0.35);";
      let cityColor = "color: #14213D;";

      if (isSource) {
        markerBg = "background-color: #14213D; color: #FFFFFF;";
        markerBorder = "border: 2px solid #FFFFFF; box-shadow: 0 2px 6px rgba(20, 33, 61, 0.35);";
        cityColor = "color: #14213D;";
      } else if (isDest) {
        markerBg = "background-color: #6B7A5E; color: #FFFFFF;";
        markerBorder = "border: 2px solid #FFFFFF; box-shadow: 0 2px 6px rgba(107, 122, 94, 0.35);";
        cityColor = "color: #2B2E36;";
      }

      return `
        <div style="position: absolute; left: ${x}px; top: ${y}px; transform: translate(-50%, -50%); z-index: 25;">
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="height: 30px; width: 30px; border-radius: 9999px; ${markerBg} ${markerBorder} display: flex; align-items: center; justify-content: center; font-size: 13px;">
              ${stop.placeIcon}
            </div>
          </div>
        </div>

        <div style="position: absolute; left: ${x}px; top: ${y + 18}px; transform: translateX(-50%); z-index: 20; width: 130px; text-align: center;">
          <div style="display: flex; flex-direction: column; align-items: center; padding-top: 4px;">
            <div style="margin-bottom: 2px;">
              <span style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 6px; border-radius: 9999px; ${
                isSource
                  ? "background-color: rgba(20, 33, 61, 0.08); color: #14213D;"
                  : isDest
                  ? "background-color: rgba(107, 122, 94, 0.15); color: #6B7A5E;"
                  : "background-color: rgba(184, 148, 79, 0.14); color: #B8944F;"
              }">
                ${stop.badge}
              </span>
            </div>

            <h4 style="font-size: 11px; font-weight: 700; text-transform: uppercase; ${cityColor} margin: 0; line-height: 1.2; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${stop.city}
            </h4>

            ${
              placesText
                ? `<div style="font-size: 8px; color: #4A4E58; line-height: 1.25; margin-top: 2px; width: 100%; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${placesText}</div>`
                : ""
            }

            <p style="font-size: 7.5px; color: #717680; line-height: 1.2; margin-top: 2px; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${stop.description}
            </p>
          </div>
        </div>
      `;
    })
    .join("");

  // Highlights table rows
  const glanceRows = trip.itineraryDays
    .map(
      (d: any) => `
    <tr style="border-bottom: 1px solid rgba(184, 148, 79, 0.12);" class="break-avoid">
      <td style="padding: 7px 6px; font-weight: 700; color: #B8944F; font-size: 10px; width: 18%; vertical-align: top;">
        DAY ${d.dayNumber < 10 ? "0" + d.dayNumber : d.dayNumber}
      </td>
      <td style="padding: 7px 6px; color: #14213D; font-weight: 600; font-size: 10px; width: 32%; vertical-align: top;">
        ${d.cityOrStay || trip.destination}
      </td>
      <td style="padding: 7px 6px; color: #2B2E36; font-size: 10px; width: 50%; vertical-align: top; line-height: 1.35;">
        ${d.title}
      </td>
    </tr>
  `
    )
    .join("");

  // ==========================================
  // SECTION 3: TRIP PRICE / QUOTATION
  // ==========================================
  const priceQuoteSubtotal = trip.priceQuoteItems.reduce(
    (acc: number, item: any) => acc + item.amount,
    0
  );
  const priceLines = trip.priceQuoteItems
    .map(
      (item: any) => `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(184, 148, 79, 0.18); padding: 5.5px 0; font-size: 10.5px;">
      <span style="color: #4A4E58; font-weight: 500;">${item.label}</span>
      <span style="font-weight: 700; color: #14213D; font-family: 'Inter', monospace;">₹ ${item.amount.toLocaleString("en-IN")}</span>
    </div>
  `
    )
    .join("");

  // ==========================================
  // SECTION 4: DAY-BY-DAY COMPLETE ITINERARY
  // ==========================================
  const detailedDaysHtml = trip.itineraryDays
    .map((day: any) => {
      const dayNum = day.dayNumber;
      const dayCity = (day.cityOrStay || trip.destination || "").toLowerCase();

      // Formatted date string for this day
      let dayDateStr = "";
      if (trip.startDate) {
        const d = new Date(trip.startDate);
        d.setDate(d.getDate() + (dayNum - 1));
        if (!isNaN(d.getTime())) {
          dayDateStr = d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        }
      }

      // Matched Accommodation for this day
      const dayAccommodation = resolvedAccommodations.find((acc: any) => {
        return (
          acc.dayNumber === dayNum ||
          (acc.hotelName && day.hotelName && acc.hotelName === day.hotelName) ||
          (acc.location && dayCity && acc.location.toLowerCase() === dayCity)
        );
      });

      // Day-specific restaurants
      const dayRestaurants = (trip.restaurantSuggestions || []).filter((r: any) => {
        let dNum = r.dayNumber;
        if (!dNum && r.category && r.category.includes("###DAY_")) {
          dNum = parseInt(r.category.split("###DAY_")[1]);
        }
        if (dNum !== undefined && dNum !== null) {
          return Number(dNum) === Number(dayNum);
        }
        if (dayCity && (r.location || "").toLowerCase() === dayCity) {
          const matchingDays = trip.itineraryDays.filter((d: any) => (d.cityOrStay || "").toLowerCase() === dayCity);
          if (matchingDays.length === 1) return true;
        }
        return false;
      });

      // Day-specific add-ons
      const dayAddOns = (trip.addOns || []).filter((a: any) => {
        let dNum = a.dayNumber;
        if (!dNum && a.detailsJson) {
          let dj = a.detailsJson;
          if (typeof dj === "string") {
            try { dj = JSON.parse(dj); } catch (e) {}
          }
          if (dj?.dayNumber) dNum = Number(dj.dayNumber);
        }
        return Number(dNum) === Number(dayNum);
      });

      // Day-specific Transportation
      // 1. Inter-City Transfer
      let interCityTransfer: any = null;
      const interId = day.interCityTransferId || day.placeTransportMap?.inter_city_transfer_id;
      if (interId) {
        interCityTransfer = allMasterRoutes.find((r) => r.id === interId);
      }
      if (!interCityTransfer) {
        interCityTransfer = trip.flightDetails.find(
          (f: any) =>
            f.dayNumber === dayNum &&
            (f.transportCategory || "").toLowerCase().includes("inter-city")
        );
      }

      // 2. Local Transfers
      let localTransfers: any[] = [];
      const localIds: string[] = day.localTransportIds || day.placeTransportMap?.local_transport_ids || [];
      if (localIds.length > 0) {
        localTransfers = allMasterRoutes.filter((r) => localIds.includes(r.id));
      }
      if (localTransfers.length === 0) {
        localTransfers = trip.flightDetails.filter(
          (f: any) =>
            f.dayNumber === dayNum &&
            (f.transportCategory || "").toLowerCase().includes("local")
        );
      }

      // Inclusions / Exclusions
      const inclusionsList = (day.inclusions || [])
        .map(
          (inc: string) => `
        <li style="display: flex; align-items: flex-start; font-size: 10px; color: #2B2E36; margin-bottom: 3.5px; line-height: 1.45;">
          <span style="color: #6B7A5E; margin-right: 6px; font-weight: 800; line-height: 1;">✦</span>
          <span>${inc}</span>
        </li>
      `
        )
        .join("");

      const exclusionsList = (day.exclusions || [])
        .map(
          (exc: string) => `
        <li style="display: flex; align-items: flex-start; font-size: 10px; color: #4A4E58; margin-bottom: 3.5px; line-height: 1.45;">
          <span style="color: #A6572E; margin-right: 6px; font-weight: 800; line-height: 1;">✕</span>
          <span>${exc}</span>
        </li>
      `
        )
        .join("");

      const lovedTips = (day.customerLovedTips || [])
        .map(
          (tip: string) => `
        <li style="display: flex; align-items: flex-start; font-size: 9.5px; color: #14213D; margin-bottom: 3px; line-height: 1.4;">
          <span style="color: #B8944F; margin-right: 6px; font-weight: 700;">★</span>
          <span>${tip}</span>
        </li>
      `
        )
        .join("");

      const watchOutTips = (day.customerWatchOutTips || [])
        .map(
          (tip: string) => `
        <li style="display: flex; align-items: flex-start; font-size: 9.5px; color: #A6572E; margin-bottom: 3px; line-height: 1.4;">
          <span style="color: #A6572E; margin-right: 6px; font-weight: 700;">!</span>
          <span>${tip}</span>
        </li>
      `
        )
        .join("");

      // Day-wise Accommodation HTML Card
      const dayStayHtml = dayAccommodation ? (() => {
        const starRow = Array.from({ length: dayAccommodation.starRating || 4 })
          .map(
            () =>
              `<svg style="height: 10px; width: 10px; fill: #B8944F; color: #B8944F; display: inline;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
          )
          .join("");

        const photos = dayAccommodation.resolvedPhotos || [];
        const photoSlots = [
          photos[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
          photos[1] || "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80",
          photos[2] || "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=600&q=80",
        ];

        const photoGrid = photoSlots
          .map(
            (pUrl: string, idx: number) => `
          <div style="height: 70px; width: 100%; background-color: transparent; border-radius: 6px; overflow: hidden; border: 1px solid rgba(184, 148, 79, 0.2);">
            <img src="${pUrl}" alt="Hotel photo ${idx + 1}" style="height: 100%; width: 100%; object-fit: cover;" />
          </div>
        `
          )
          .join("");

        return `
          <div style="background-color: transparent; border: 1px solid rgba(184, 148, 79, 0.25); border-radius: 10px; padding: 10px 12px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <div>
                <p style="font-size: 8.5px; font-weight: 800; color: #B8944F; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 2px 0;">
                  🏨 CONFIRMED STAY &bull; ${dayAccommodation.location || day.cityOrStay}
                </p>
                <h4 class="font-serif-luxury" style="font-size: 13px; font-weight: 700; color: #14213D; margin: 0; line-height: 1.2;">
                  ${dayAccommodation.hotelName}
                </h4>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 3px;">
                  <div style="display: flex; gap: 1px;">${starRow}</div>
                  <span style="font-size: 9px; color: #4A4E58; font-weight: 600;">
                    ${dayAccommodation.roomType || "Luxury Deluxe Room"} &bull; ${dayAccommodation.mealPlan || "Buffet Breakfast (CP)"}
                  </span>
                </div>
              </div>
            </div>

            <!-- Hotel 3-Photo Gallery -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 6px;">
              ${photoGrid}
            </div>
          </div>
        `;
      })() : "";

      // Day-wise Dining HTML
      const dayRestaurantsHtml = dayRestaurants.length > 0 ? `
        <div style="background-color: transparent; border: 1px solid rgba(184, 148, 79, 0.25); padding: 10px 12px; border-radius: 10px;">
          <p style="font-size: 8.5px; color: #8F6F33; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 6px 0; display: flex; align-items: center; gap: 4px;">
            <span>🍴</span> CURATED DINING SPOT${dayRestaurants.length > 1 ? "S" : ""}
          </p>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${dayRestaurants.map((r: any) => {
              const cleanCat = (r.category || "Restaurant").split("###DAY_")[0];
              return `
                <div style="font-size: 9.5px; color: #14213D; line-height: 1.35; display: flex; align-items: center; justify-content: space-between; gap: 6px; border-bottom: 1px dashed rgba(184, 148, 79, 0.12); padding-bottom: 3px;">
                  <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                    <span style="font-weight: 700; color: #14213D;">${r.name}</span>
                    <span style="font-size: 8.5px; color: #717680;">(${r.cuisineType})</span>
                    ${r.isVeg ? `<span style="font-size: 7.5px; color: #4A5641; border: 1px solid rgba(107, 122, 94, 0.4); padding: 1px 4px; border-radius: 3px; font-weight: 700;">Pure Veg</span>` : ""}
                  </div>
                  ${r.rating ? `<span style="font-size: 8.5px; font-weight: 700; color: #B8944F;">★ ${r.rating}</span>` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </div>
      ` : "";

      // Day-wise Add-ons HTML
      const dayAddOnsHtml = dayAddOns.length > 0 ? `
        <div style="background-color: transparent; border: 1px solid rgba(20, 33, 61, 0.22); padding: 10px 12px; border-radius: 10px;">
          <p style="font-size: 8.5px; color: #14213D; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 6px 0; display: flex; align-items: center; gap: 4px;">
            <span>➕</span> DAY ADD-ON${dayAddOns.length > 1 ? "S" : ""} &amp; EXPERIENCES
          </p>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${dayAddOns.map((a: any) => {
              let desc: any = {};
              if (a.detailsJson) {
                desc = typeof a.detailsJson === "string" ? JSON.parse(a.detailsJson) : a.detailsJson;
              }
              return `
                <div style="font-size: 9.5px; color: #14213D; line-height: 1.35; display: flex; align-items: center; justify-content: space-between; gap: 6px; border-bottom: 1px dashed rgba(20, 33, 61, 0.12); padding-bottom: 3px;">
                  <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                    <span style="font-weight: 700; color: #14213D;">${a.name}</span>
                    ${desc?.visaType ? `<span style="font-size: 8px; color: #717680;">(${desc.visaType})</span>` : ""}
                  </div>
                  <span style="font-size: 9px; font-weight: 700; color: #4A5641; font-family: 'Inter', monospace;">₹ ${Number(a.price || 0).toLocaleString("en-IN")} ${a.priceType || "per person"}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      ` : "";

      // Day-wise Transportation HTML (Inter-City first, then Local)
      const hasTransportation = Boolean(interCityTransfer || localTransfers.length > 0);
      const dayTransportationHtml = hasTransportation ? `
        <div style="background-color: transparent; border: 1px solid rgba(184, 148, 79, 0.25); border-radius: 10px; padding: 10px 12px; margin-top: 10px;">
          <p style="font-size: 8.5px; color: #14213D; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 6px 0; display: flex; align-items: center; gap: 4px;">
            <span>🚗</span> DAY TRANSPORTATION &amp; TRANSFERS
          </p>

          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${
              interCityTransfer
                ? `
              <div style="border-left: 2.5px solid #B8944F; padding-left: 8px; font-size: 9.5px; line-height: 1.35;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                  <span style="font-weight: 800; color: #B8944F; text-transform: uppercase; font-size: 8px; letter-spacing: 0.05em;">INTER-CITY TRANSFER</span>
                  <span style="font-size: 8.5px; color: #717680; font-weight: 600;">Time: ${interCityTransfer.travelTime || "09:00 AM"}</span>
                </div>
                <div style="font-weight: 700; color: #14213D; margin-top: 1px;">
                  ${interCityTransfer.fromCity || day.cityOrStay} &rarr; ${interCityTransfer.toCity || day.cityOrStay} &bull; ${interCityTransfer.type || "Vehicle"} &bull; ${interCityTransfer.airline || "Dedicated Cab"}
                </div>
                ${interCityTransfer.flightNotes ? `<div style="font-size: 8.5px; color: #717680; font-style: italic; margin-top: 1px;">${interCityTransfer.flightNotes}</div>` : ""}
              </div>
            `
                : ""
            }

            ${
              localTransfers.length > 0
                ? `
              <div style="border-left: 2.5px solid #6B7A5E; padding-left: 8px; font-size: 9.5px; line-height: 1.35; ${interCityTransfer ? "margin-top: 4px; padding-top: 4px; border-top: 1px dashed rgba(184, 148, 79, 0.15);" : ""}">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                  <span style="font-weight: 800; color: #4A5641; text-transform: uppercase; font-size: 8px; letter-spacing: 0.05em;">LOCAL TRANSIT (${day.cityOrStay || trip.destination})</span>
                  <span style="font-size: 8px; color: #717680;">${localTransfers.length} service(s)</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 2px;">
                  ${localTransfers.map((lt: any) => `
                    <div style="color: #2B2E36; font-size: 9px; display: flex; align-items: center; gap: 4px;">
                      <span style="color: #6B7A5E;">&bull;</span>
                      <span style="font-weight: 600; color: #14213D;">${lt.sector || `${day.cityOrStay} Local Transport`}</span>
                      <span style="color: #717680;">(${lt.type || "Vehicle"} - ${lt.airline || "Operator"})</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            `
                : ""
            }
          </div>
        </div>
      ` : "";

      const dayExtrasHtml = (dayRestaurantsHtml || dayAddOnsHtml) ? `
        <div style="display: grid; grid-template-columns: ${dayRestaurantsHtml && dayAddOnsHtml ? "1fr 1fr" : "1fr"}; gap: 10px; margin-top: 10px;">
          ${dayRestaurantsHtml}
          ${dayAddOnsHtml}
        </div>
      ` : "";

      return `
      <div class="pdf-section break-avoid day-card" style="background-color: transparent; border: 1px solid rgba(184, 148, 79, 0.28); border-radius: 12px; padding: 16px 18px; margin-bottom: 16px;">
        <!-- Day Section Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #717680; border-bottom: 1px solid rgba(184, 148, 79, 0.18); padding-bottom: 6px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 800; color: #14213D; letter-spacing: 0.1em;">TRIPPLANNER</span>
            <span style="color: #B8944F;">|</span>
            <span style="font-weight: 600; color: #4A4E58;">${trip.title}</span>
          </div>
          <span style="font-weight: 700; color: #B8944F; letter-spacing: 0.08em;">
            DAY ${day.dayNumber < 10 ? "0" + day.dayNumber : day.dayNumber} ${dayDateStr ? `&bull; ${dayDateStr}` : ""}
          </span>
        </div>

        <!-- Day Title & Region -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(184, 148, 79, 0.18); padding-bottom: 10px; margin-bottom: 10px;">
          <div style="display: flex; align-items: flex-start; gap: 10px;">
            <div style="height: 34px; width: 34px; background-color: #14213D; border: 1px solid #B8944F; color: #F3ECDD; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;">
              <span style="font-size: 6.5px; font-weight: 700; letter-spacing: 0.05em; color: #B8944F; line-height: 1;">DAY</span>
              <span style="font-size: 13px; font-weight: 800; line-height: 1; margin-top: 1px;">${day.dayNumber < 10 ? "0" + day.dayNumber : day.dayNumber}</span>
            </div>
            <div>
              <h3 class="font-serif-luxury" style="font-size: 14.5px; font-weight: 700; color: #14213D; margin: 0; line-height: 1.25;">${day.title}</h3>
              <p style="font-size: 9.5px; font-weight: 700; color: #B8944F; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px;">
                LOCATION &bull; <span style="color: #14213D;">${day.cityOrStay || trip.destination}</span>
              </p>
            </div>
          </div>
          ${
            day.durationHours
              ? `<span style="font-size: 8.5px; font-weight: 700; border: 1px solid rgba(184, 148, 79, 0.3); color: #14213D; padding: 3px 8px; border-radius: 12px; flex-shrink: 0; letter-spacing: 0.03em;">${
                  String(day.durationHours).toLowerCase().includes("hour") || String(day.durationHours).toLowerCase().includes("day")
                    ? day.durationHours
                    : `Duration: ${day.durationHours}h`
                }</span>`
              : ""
          }
        </div>

        <!-- Description -->
        <div style="font-size: 10.5px; line-height: 1.55; color: #2B2E36; font-weight: 400; margin-bottom: 12px; white-space: pre-line;">
          ${(day.description || "Scheduled sightseeing and curated local activities as per the travel itinerary program.").replace(/<[^>]*>/g, "")}
        </div>

        <!-- Inclusions & Exclusions -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 8px; border-top: 1px solid rgba(184, 148, 79, 0.12);">
          <div style="border: 1px solid rgba(107, 122, 94, 0.25); padding: 8px 10px; border-radius: 8px;">
            <p style="font-size: 8.5px; color: #4A5641; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
              <span>✓</span> PLACES &amp; SIGHTS INCLUDED
            </p>
            <ul style="list-style: none; margin: 0; padding: 0;">
              ${inclusionsList || '<li style="color: #717680; font-style: italic; font-size: 9.5px;">Standard itinerary inclusions apply</li>'}
            </ul>
          </div>
          <div style="border: 1px solid rgba(166, 87, 46, 0.2); padding: 8px 10px; border-radius: 8px;">
            <p style="font-size: 8.5px; color: #8C441E; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
              <span>✕</span> NOT INCLUDED
            </p>
            <ul style="list-style: none; margin: 0; padding: 0;">
              ${exclusionsList || '<li style="color: #717680; font-style: italic; font-size: 9.5px;">Personal expenses & optional activities</li>'}
            </ul>
          </div>
        </div>

        <!-- Day Stay / Accommodation Card -->
        ${dayStayHtml}

        <!-- Day Dining & Add-ons -->
        ${dayExtrasHtml}

        <!-- Day Transportation Schedule -->
        ${dayTransportationHtml}

        <!-- Traveler Love & Advisory Tips -->
        ${
          lovedTips || watchOutTips
            ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 8px; margin-top: 8px; border-top: 1px dashed rgba(184, 148, 79, 0.18);">
            ${
              lovedTips
                ? `
              <div style="border: 1px solid rgba(184, 148, 79, 0.3); padding: 8px 10px; border-radius: 8px;">
                <h5 style="font-size: 8.5px; font-weight: 800; color: #B8944F; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 4px;">
                  <span>✦</span> TRAVEL EXPERT TIPS
                </h5>
                <ul style="list-style: none; margin: 0; padding: 0;">${lovedTips}</ul>
              </div>
            `
                : ""
            }
            ${
              watchOutTips
                ? `
              <div style="border: 1px solid rgba(166, 87, 46, 0.28); padding: 8px 10px; border-radius: 8px;">
                <h5 style="font-size: 8.5px; font-weight: 800; color: #A6572E; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 4px;">
                  <span>!</span> OPERATIONAL ADVISORY
                </h5>
                <ul style="list-style: none; margin: 0; padding: 0;">${watchOutTips}</ul>
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

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${trip.title}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,600&family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 14mm 8mm 14mm 8mm;
        }
        
        *, *::before, *::after {
          box-sizing: border-box;
          letter-spacing: normal !important;
          word-spacing: normal !important;
        }

        html, body {
          background-color: transparent !important;
          color: #14213D;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          margin: 0;
          padding: 0 4px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          word-break: normal;
          overflow-wrap: break-word;
          line-height: 1.55;
          position: relative;
        }

        .font-serif-luxury {
          font-family: 'Playfair Display', 'Cormorant Garamond', Georgia, serif;
          letter-spacing: -0.01em;
        }

        .font-serif-sub {
          font-family: 'Cormorant Garamond', Georgia, serif;
        }

        .pdf-watermark-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          opacity: ${watermarkOpacity};
        }

        .pdf-watermark-logo {
          max-width: 45%;
          max-height: 30%;
          object-fit: contain;
          filter: grayscale(100%);
        }

        .pdf-watermark-text {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 5rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #14213D;
          transform: rotate(-25deg);
        }

        .pdf-section, 
        .break-avoid,
        .pdf-section-wrapper,
        .day-card,
        .hotel-card,
        .dining-card,
        .policy-card,
        table, tr {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        .pdf-section-header,
        h1, h2, h3, h4, h5, h6, .section-header {
          break-after: avoid !important;
          page-break-after: avoid !important;
          break-inside: avoid !important;
        }

        .pdf-section {
          position: relative;
          z-index: 2;
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
          margin-bottom: 0.25rem !important;
          line-height: 1.5 !important;
        }
        .prose strong {
          font-weight: 700 !important;
          color: #14213D !important;
        }
        .prose p {
          margin-bottom: 0.45rem !important;
          line-height: 1.5 !important;
        }
      </style>
      ${
        autoPrint
          ? `<script>
              window.addEventListener('load', () => {
                setTimeout(() => {
                  window.print();
                }, 400);
              });
            </script>`
          : ""
      }
    </head>
    <body class="space-y-4">
      
      <!-- BACKGROUND WATERMARK -->
      <div class="pdf-watermark-container">
        ${
          logoDataUri
            ? `<img src="${logoDataUri}" alt="Watermark" class="pdf-watermark-logo" />`
            : `<span class="pdf-watermark-text">TripPlanner</span>`
        }
      </div>

      <!-- ========================================== -->
      <!-- 1. TRIP INTRODUCTION (COVER & METADATA)   -->
      <!-- ========================================== -->
      <div class="pdf-section break-avoid" style="background-color: transparent; border: 1px solid rgba(184, 148, 79, 0.3); border-radius: 14px; overflow: hidden; margin-bottom: 16px;">
        <!-- Hero Visual with Dark Luxury Overlay -->
        <div style="height: 80mm; width: 100%; position: relative; overflow: hidden;">
          <img src="${coverImageDataUri}" alt="Cover Image" style="height: 100%; width: 100%; object-fit: cover;" />
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(20, 33, 61, 0.35) 0%, rgba(20, 33, 61, 0.2) 40%, rgba(20, 33, 61, 0.85) 85%, rgba(20, 33, 61, 0.98) 100%);"></div>
          
          <!-- Top Brand Header Bar on Cover -->
          <div style="position: absolute; top: 14px; left: 18px; right: 18px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="font-serif-luxury" style="font-size: 17px; font-weight: 900; color: #FFFFFF; letter-spacing: 0.08em; text-transform: uppercase;">
                TRIPPLANNER
              </span>
              <span style="font-size: 8.5px; font-weight: 700; color: #B8944F; border-left: 1px solid rgba(184, 148, 79, 0.6); padding-left: 8px; letter-spacing: 0.12em; text-transform: uppercase;">
                BESPOKE ITINERARY
              </span>
            </div>
            <span style="font-size: 8px; font-weight: 700; color: #F3ECDD; background-color: rgba(20, 33, 61, 0.6); border: 1px solid rgba(184, 148, 79, 0.4); padding: 3px 8px; border-radius: 9999px; letter-spacing: 0.06em; text-transform: uppercase;">
              PROPOSAL ID: #${trip.id.slice(-6).toUpperCase()}
            </span>
          </div>
          
          <!-- Hero Title & Journey Summary -->
          <div style="position: absolute; bottom: 16px; left: 20px; right: 20px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="height: 2px; width: 20px; background-color: #B8944F; display: inline-block;"></span>
              <span style="font-size: 9px; font-weight: 800; color: #B8944F; text-transform: uppercase; letter-spacing: 0.15em;">
                OFFICIAL TRAVEL BLUEPRINT
              </span>
            </div>
            <h1 class="font-serif-luxury" style="font-size: 26px; font-weight: 800; color: #FFFFFF; line-height: 1.15; margin: 0; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">
              ${trip.title}
            </h1>
            <p style="font-size: 12px; color: #F3ECDD; font-weight: 600; margin: 5px 0 0 0; letter-spacing: 0.02em;">
              Destination: <span style="color: #FFFFFF; font-weight: 700;">${trip.destination}</span> &bull; Ex-${trip.departureCity}
            </p>
          </div>
        </div>

        <!-- Metadata Grid (Transparent Background) -->
        <div style="padding: 14px 20px; background-color: transparent;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; border-bottom: 1px solid rgba(184, 148, 79, 0.18); padding-bottom: 12px;">
            <div>
              <p style="color: #717680; font-weight: 700; font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 3px 0;">TRAVEL SCHEDULE</p>
              <p style="font-weight: 700; color: #14213D; font-size: 11.5px; margin: 0;">
                ${new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}&nbsp;&ndash;&nbsp;${new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p style="color: #4A4E58; font-weight: 600; font-size: 10px; margin: 2px 0 0 0;">
                ${trip.durationDays} Days / ${trip.durationNights} Nights &bull; ${trip.numTravellers} Travellers
              </p>
            </div>
            <div>
              <p style="color: #717680; font-weight: 700; font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 3px 0;">DEDICATED TRAVEL CONSULTANT</p>
              <p style="font-weight: 700; color: #14213D; font-size: 11.5px; margin: 0;">${trip.consultantName || "Agency Travel Desk"}</p>
              <p style="color: #4A4E58; font-weight: 500; font-size: 10px; margin: 2px 0 0 0;">Phone: ${trip.consultantPhone || "Agency Concierge"}</p>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #717680; font-weight: 500; padding-top: 8px; letter-spacing: 0.04em;">
            <p style="margin: 0;">&copy; TripPlanner &bull; Bespoke Itinerary Document</p>
            <p style="margin: 0; color: #14213D; font-weight: 600;">Proposal Date: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 2. TOUR ROUTE (VISUAL JOURNEY MAP)        -->
      <!-- ========================================== -->
      <div class="pdf-section break-avoid" style="background-color: transparent; border: 1px solid rgba(184, 148, 79, 0.28); border-radius: 12px; padding: 16px 18px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid rgba(184, 148, 79, 0.2); padding-bottom: 8px; margin-bottom: 12px;">
          <div>
            <span style="font-size: 8px; font-weight: 800; color: #B8944F; text-transform: uppercase; letter-spacing: 0.1em; display: block;">
              JOURNEY OVERVIEW &bull; COMPLETE TOUR ROUTE
            </span>
            <h2 class="font-serif-luxury" style="font-size: 15px; font-weight: 700; color: #14213D; margin: 2px 0 0 0;">
              ${sourceCity.toUpperCase()} &rarr; ${destCity.toUpperCase()}
            </h2>
          </div>
          <div style="font-size: 8.5px; font-weight: 700; color: #717680; letter-spacing: 0.04em;">
            ${trip.itineraryDays.length} DAYS CONNECTED TOUR &bull; EX-${sourceCity.toUpperCase()}
          </div>
        </div>

        <div style="position: relative; width: 100%; overflow: hidden; height: ${canvasHeight}px;">
          <svg viewBox="0 0 ${canvasWidth} ${canvasHeight}" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;" preserveAspectRatio="none">
            ${pathSegments.join("")}
          </svg>
          ${transitMarkers.join("")}
          ${stopNodesHtml}
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 3. TRIP PRICE / QUOTATION SUMMARY         -->
      <!-- ========================================== -->
      <div class="pdf-section break-avoid" style="background-color: transparent; border: 1px solid rgba(184, 148, 79, 0.28); border-radius: 12px; padding: 16px 18px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #717680; border-bottom: 1px solid rgba(184, 148, 79, 0.18); padding-bottom: 6px; margin-bottom: 12px;">
          <span style="font-weight: 800; color: #14213D;">${trip.title}</span>
          <span style="font-weight: 700; color: #B8944F;">COMMERCIAL QUOTATION &bull; PRICE SUMMARY</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start;">
          <!-- Pricing Plan Breakdown Card -->
          <div style="border: 1px solid rgba(184, 148, 79, 0.25); padding: 12px 14px; border-radius: 10px; background-color: transparent;">
            <h3 style="font-size: 9.5px; font-weight: 800; color: #B8944F; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 8px 0;">
              PRICING PLAN BREAKDOWN
            </h3>
            <div style="display: flex; flex-direction: column;">${priceLines}</div>
            
            <div style="padding-top: 8px; margin-top: 4px; border-top: 1px solid rgba(184, 148, 79, 0.2); display: flex; flex-direction: column; gap: 3.5px; font-size: 10px;">
              <div style="display: flex; justify-content: space-between; color: #717680; font-weight: 600;">
                <span>Price Per Person</span>
                <span style="font-family: 'Inter', monospace; font-weight: 700; color: #14213D;">₹ ${priceQuoteSubtotal.toLocaleString("en-IN")}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #717680; font-weight: 600;">
                <span>Number of Travellers</span>
                <span style="font-family: 'Inter', monospace; font-weight: 700; color: #14213D;">${trip.numTravellers || 1} Person(s)</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #717680; font-weight: 600;">
                <span>Total Base Package</span>
                <span style="font-family: 'Inter', monospace; font-weight: 700; color: #14213D;">₹ ${(priceQuoteSubtotal * (trip.numTravellers || 1)).toLocaleString("en-IN")}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #717680; font-weight: 600;">
                <span>Total TCS (${trip.tripFinancials?.tcsPercentage || 5}%)</span>
                <span style="font-family: 'Inter', monospace; font-weight: 700; color: #14213D;">₹ ${(trip.tripFinancials?.tcsAmount || 0).toLocaleString("en-IN")}</span>
              </div>
              
              <!-- Total Payable Box (Transparent Luxury Outline) -->
              <div style="display: flex; justify-content: space-between; align-items: center; border: 1.5px solid #14213D; padding: 8px 10px; border-radius: 8px; margin-top: 6px;">
                <span style="font-size: 10px; font-weight: 700; color: #14213D; text-transform: uppercase; letter-spacing: 0.05em;">Final Total Payable (with TCS)</span>
                <span style="font-family: 'Inter', monospace; font-size: 13.5px; font-weight: 800; color: #B8944F;">₹ ${(trip.tripFinancials?.totalWithTcs || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>

            ${
              trip.tripFinancials?.notes
                ? `
              <div style="padding: 6px 8px; border-radius: 6px; border: 1px dashed rgba(184, 148, 79, 0.3); font-size: 9px; color: #4A4E58; line-height: 1.4; margin-top: 8px;">
                <span style="font-weight: 700; color: #14213D; display: block; margin-bottom: 2px;">Commercial Notes:</span>
                ${trip.tripFinancials.notes}
              </div>
            `
                : ""
            }
          </div>

          <!-- Trip Highlights At A Glance -->
          <div style="border: 1px solid rgba(184, 148, 79, 0.25); padding: 12px 14px; border-radius: 10px; background-color: transparent;">
            <h3 style="font-size: 9.5px; font-weight: 800; color: #B8944F; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 8px 0;">
              TRIP HIGHLIGHTS AT A GLANCE
            </h3>
            <table style="width: 100%; text-align: left; font-size: 10px; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1.5px solid rgba(184, 148, 79, 0.25); color: #717680; font-weight: 700; text-transform: uppercase; font-size: 7.5px; letter-spacing: 0.06em;">
                  <th style="padding-bottom: 5px; width: 18%;">Day</th>
                  <th style="padding-bottom: 5px; width: 32%;">Region</th>
                  <th style="padding-bottom: 5px; width: 50%;">Highlight</th>
                </tr>
              </thead>
              <tbody>
                ${glanceRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 4. DAY-WISE FULL PLAN (COMPLETE JOURNEY)  -->
      <!-- ========================================== -->
      <div class="pdf-section-wrapper" style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #B8944F; padding-bottom: 6px; margin-bottom: 12px;" class="break-avoid">
          <h2 class="font-serif-luxury" style="font-size: 15px; font-weight: 700; color: #14213D; margin: 0;">
            Day-by-Day Complete Itinerary
          </h2>
          <span style="font-size: 8.5px; font-weight: 700; color: #B8944F; text-transform: uppercase; letter-spacing: 0.08em;">
            ${trip.itineraryDays.length} DAYS FULL PLAN
          </span>
        </div>
        ${detailedDaysHtml}
      </div>

      <!-- ========================================== -->
      <!-- 5. POLICIES & GUIDELINES (AT THE END)     -->
      <!-- ========================================== -->
      ${(() => {
        const terms = trip.tripTerms || (trip as any).termsAndConditions || {};
        const activePdfPolicies: { title: string; html: string }[] = [];
        if (terms?.paymentPolicy && terms.paymentPolicy.trim()) {
          activePdfPolicies.push({ title: "Payment Policy & Booking Deposit Schedule", html: terms.paymentPolicy });
        }
        if (terms?.cancellationPolicy && terms.cancellationPolicy.trim()) {
          activePdfPolicies.push({ title: "Cancellation & Refund Policy", html: terms.cancellationPolicy });
        }
        if (terms?.visaRules && terms.visaRules.trim()) {
          activePdfPolicies.push({ title: "Visa Rules & Passport Validity", html: terms.visaRules });
        }
        if (terms?.generalNotes && terms.generalNotes.trim()) {
          activePdfPolicies.push({ title: "General Notes & Operational Advisory", html: terms.generalNotes });
        }

        if (activePdfPolicies.length === 0) return "";

        return `
        <div class="pdf-section break-avoid" style="background-color: transparent; border: 1px solid rgba(184, 148, 79, 0.28); border-radius: 12px; padding: 16px 18px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #717680; border-bottom: 1px solid rgba(184, 148, 79, 0.18); padding-bottom: 6px; margin-bottom: 10px;">
            <span style="font-weight: 800; color: #14213D;">${trip.title}</span>
            <span style="font-weight: 700; color: #B8944F;">TERMS &bull; POLICIES &bull; COMMERCIAL GUIDELINES</span>
          </div>

          <h2 class="font-serif-luxury" style="font-size: 15px; font-weight: 700; color: #14213D; margin: 0 0 10px 0;">
            Master Policies &amp; Booking Terms
          </h2>
          
          <div style="display: grid; grid-template-columns: ${activePdfPolicies.length === 1 ? '1fr' : '1fr 1fr'}; gap: 10px; font-size: 10px; color: #2B2E36;" class="prose max-w-none">
            ${activePdfPolicies.map((pol, idx) => `
              <div style="border: 1px solid rgba(184, 148, 79, 0.25); padding: 10px 12px; border-radius: 8px; background-color: transparent;">
                <h4 style="font-weight: 800; color: #14213D; font-size: 10.5px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.04em;">${idx + 1}. ${pol.title}</h4>
                <div style="line-height: 1.5; color: #4A4E58;">${pol.html}</div>
              </div>
            `).join("")}
          </div>

          <div style="border-top: 1px solid rgba(184, 148, 79, 0.18); padding-top: 10px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #717680; font-weight: 500;">
            <span>&copy; TripPlanner &bull; Custom Travel Proposal</span>
            <span style="font-weight: 700; color: #14213D; text-transform: uppercase; letter-spacing: 0.05em;">Official Customer Travel Proposal</span>
          </div>
        </div>
      `;
      })()}

    </body>
    </html>
  `;

  return { html, title: trip.title || trip.destination || "Itinerary" };
}
