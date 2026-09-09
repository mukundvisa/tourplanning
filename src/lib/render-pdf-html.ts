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

  const trip = await db.trip.findUnique({
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
  });

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
      ? d.description.length > 70
        ? d.description.slice(0, 70).trim() + "..."
        : d.description
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
        <div style="height: 20px; width: 20px; background-color: #FFFFFF; border-radius: 9999px; border: 1px solid rgba(184, 148, 79, 0.4); display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
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

  const glanceRows = trip.itineraryDays
    .map(
      (d: any) => `
    <tr style="border-bottom: 1px solid rgba(184, 148, 79, 0.12);" class="break-avoid">
      <td style="padding: 8px 6px; font-weight: 700; color: #B8944F; font-size: 10.5px; width: 18%; vertical-align: top;">
        DAY ${d.dayNumber < 10 ? "0" + d.dayNumber : d.dayNumber}
      </td>
      <td style="padding: 8px 6px; color: #14213D; font-weight: 600; font-size: 10.5px; width: 32%; vertical-align: top;">
        ${d.cityOrStay || trip.destination}
      </td>
      <td style="padding: 8px 6px; color: #2B2E36; font-size: 10.5px; width: 50%; vertical-align: top; line-height: 1.35;">
        ${d.title}
      </td>
    </tr>
  `
    )
    .join("");

  const priceQuoteSubtotal = trip.priceQuoteItems.reduce(
    (acc: number, item: any) => acc + item.amount,
    0
  );
  const priceLines = trip.priceQuoteItems
    .map(
      (item: any) => `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(184, 148, 79, 0.15); padding: 6px 0; font-size: 11px;">
      <span style="color: #4A4E58; font-weight: 500;">${item.label}</span>
      <span style="font-weight: 700; color: #14213D; font-family: 'Inter', monospace;">₹ ${item.amount.toLocaleString("en-IN")}</span>
    </div>
  `
    )
    .join("");

  const detailedDaysHtml = trip.itineraryDays
    .map((day: any) => {
      const inclusionsList = (day.inclusions || [])
        .map(
          (inc: string) => `
        <li style="display: flex; align-items: flex-start; font-size: 10.5px; color: #2B2E36; margin-bottom: 4px; line-height: 1.45;">
          <span style="color: #6B7A5E; margin-right: 6px; font-weight: 800; line-height: 1;">✦</span>
          <span>${inc}</span>
        </li>
      `
        )
        .join("");

      const exclusionsList = (day.exclusions || [])
        .map(
          (exc: string) => `
        <li style="display: flex; align-items: flex-start; font-size: 10.5px; color: #4A4E58; margin-bottom: 4px; line-height: 1.45;">
          <span style="color: #A6572E; margin-right: 6px; font-weight: 800; line-height: 1;">✕</span>
          <span>${exc}</span>
        </li>
      `
        )
        .join("");

      const lovedTips = (day.customerLovedTips || [])
        .map(
          (tip: string) => `
        <li style="display: flex; align-items: flex-start; font-size: 10px; color: #14213D; margin-bottom: 3px; line-height: 1.4;">
          <span style="color: #B8944F; margin-right: 6px; font-weight: 700;">★</span>
          <span>${tip}</span>
        </li>
      `
        )
        .join("");

      const watchOutTips = (day.customerWatchOutTips || [])
        .map(
          (tip: string) => `
        <li style="display: flex; align-items: flex-start; font-size: 10px; color: #A6572E; margin-bottom: 3px; line-height: 1.4;">
          <span style="color: #A6572E; margin-right: 6px; font-weight: 700;">!</span>
          <span>${tip}</span>
        </li>
      `
        )
        .join("");

      return `
      <div class="pdf-section break-avoid day-card" style="background-color: #FFFFFF; border: 1px solid rgba(184, 148, 79, 0.22); border-radius: 14px; padding: 18px 20px; margin-bottom: 18px; box-shadow: 0 2px 8px rgba(20, 33, 61, 0.04);">
        <!-- Day Section Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #717680; border-bottom: 1px solid rgba(184, 148, 79, 0.15); padding-bottom: 8px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 800; color: #14213D; letter-spacing: 0.1em;">TRIPPLANNER</span>
            <span style="color: #B8944F;">|</span>
            <span style="font-weight: 600; color: #4A4E58;">${trip.title}</span>
          </div>
          <span style="font-weight: 700; color: #B8944F; letter-spacing: 0.08em;">DAILY ITINERARY &bull; DAY ${day.dayNumber < 10 ? "0" + day.dayNumber : day.dayNumber}</span>
        </div>

        <!-- Day Title & Region -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(184, 148, 79, 0.18); padding-bottom: 12px; margin-bottom: 12px;">
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="height: 36px; width: 36px; background-color: #14213D; border: 1px solid #B8944F; color: #F3ECDD; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 4px rgba(20, 33, 61, 0.2);">
              <span style="font-size: 7px; font-weight: 700; letter-spacing: 0.05em; color: #B8944F; line-height: 1;">DAY</span>
              <span style="font-size: 14px; font-weight: 800; line-height: 1; margin-top: 1px;">${day.dayNumber < 10 ? "0" + day.dayNumber : day.dayNumber}</span>
            </div>
            <div>
              <h3 class="font-serif-luxury" style="font-size: 15px; font-weight: 700; color: #14213D; margin: 0; line-height: 1.25;">${day.title}</h3>
              <p style="font-size: 10px; font-weight: 700; color: #B8944F; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 3px;">
                STAY / REGION &bull; <span style="color: #14213D;">${day.cityOrStay || trip.destination}</span>
              </p>
            </div>
          </div>
          ${
            day.durationHours
              ? `<span style="font-size: 9px; font-weight: 700; background-color: #FAF8F3; border: 1px solid rgba(184, 148, 79, 0.3); color: #14213D; padding: 4px 10px; border-radius: 20px; flex-shrink: 0; letter-spacing: 0.03em;">${
                  String(day.durationHours).toLowerCase().includes("hour") || String(day.durationHours).toLowerCase().includes("day")
                    ? day.durationHours
                    : `Duration: ${day.durationHours}h`
                }</span>`
              : ""
          }
        </div>

        <!-- Description -->
        <div style="font-size: 11px; line-height: 1.6; color: #2B2E36; font-weight: 400; margin-bottom: 14px; white-space: pre-line;">
          ${day.description || "Scheduled sightseeing and curated local activities as per the travel itinerary program."}
        </div>

        <!-- Inclusions & Exclusions Two-Column Cards -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 10px; border-top: 1px solid rgba(184, 148, 79, 0.12);">
          <div style="background-color: rgba(107, 122, 94, 0.08); border: 1px solid rgba(107, 122, 94, 0.25); padding: 10px 12px; border-radius: 10px;">
            <p style="font-size: 9px; color: #4A5641; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
              <span>✓</span> INCLUDED
            </p>
            <ul style="list-style: none; margin: 0; padding: 0;">
              ${inclusionsList || '<li style="color: #717680; font-style: italic; font-size: 10.5px;">Standard itinerary inclusions apply</li>'}
            </ul>
          </div>
          <div style="background-color: rgba(166, 87, 46, 0.06); border: 1px solid rgba(166, 87, 46, 0.2); padding: 10px 12px; border-radius: 10px;">
            <p style="font-size: 9px; color: #8C441E; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
              <span>✕</span> NOT INCLUDED
            </p>
            <ul style="list-style: none; margin: 0; padding: 0;">
              ${exclusionsList || '<li style="color: #717680; font-style: italic; font-size: 10.5px;">Personal expenses & optional activities</li>'}
            </ul>
          </div>
        </div>

        <!-- Traveler Love & Advisory Tips -->
        ${
          lovedTips || watchOutTips
            ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 10px; margin-top: 10px; border-top: 1px dashed rgba(184, 148, 79, 0.15);">
            ${
              lovedTips
                ? `
              <div style="background-color: rgba(184, 148, 79, 0.08); border: 1px solid rgba(184, 148, 79, 0.3); padding: 10px 12px; border-radius: 10px;">
                <h5 style="font-size: 9px; font-weight: 800; color: #B8944F; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 4px;">
                  <span>✦</span> LOVE THIS
                </h5>
                <ul style="list-style: none; margin: 0; padding: 0;">${lovedTips}</ul>
              </div>
            `
                : ""
            }
            ${
              watchOutTips
                ? `
              <div style="background-color: rgba(166, 87, 46, 0.08); border: 1px solid rgba(166, 87, 46, 0.28); padding: 10px 12px; border-radius: 10px;">
                <h5 style="font-size: 9px; font-weight: 800; color: #A6572E; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 4px;">
                  <span>!</span> WATCH OUT
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

  const accommodationsHtml = resolvedAccommodations
    .map((acc: any) => {
      const starRow = Array.from({ length: acc.starRating || 4 })
        .map(
          () =>
            `<svg style="height: 12px; width: 12px; fill: #B8944F; color: #B8944F; display: inline;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
        )
        .join("");

      const facilitiesTags = (acc.facilities || [])
        .map(
          (fac: string) => `
        <span style="font-size: 8.5px; padding: 3px 8px; background-color: #FAF8F3; border: 1px solid rgba(184, 148, 79, 0.25); color: #2B2E36; border-radius: 6px; font-weight: 600;">${fac}</span>
      `
        )
        .join("");

      // Balanced 3-thumbnail photo gallery
      const photos = acc.resolvedPhotos || [];
      const photoSlots = [
        photos[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
        photos[1] || "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80",
        photos[2] || "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=600&q=80",
      ];

      const photoGrid = photoSlots
        .map(
          (pUrl: string, idx: number) => `
        <div style="height: 85px; width: 100%; background-color: #F3ECDD; border-radius: 8px; overflow: hidden; border: 1px solid rgba(184, 148, 79, 0.2); box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <img src="${pUrl}" alt="Hotel photo ${idx + 1}" style="height: 100%; width: 100%; object-fit: cover;" />
        </div>
      `
        )
        .join("");

      return `
      <div class="pdf-section break-avoid hotel-card" style="background-color: #FFFFFF; border: 1px solid rgba(184, 148, 79, 0.22); border-radius: 14px; padding: 18px 20px; margin-bottom: 18px; box-shadow: 0 2px 8px rgba(20, 33, 61, 0.04);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(184, 148, 79, 0.18); padding-bottom: 12px; margin-bottom: 12px;">
          <div>
            <span style="font-size: 8.5px; font-weight: 800; color: #B8944F; text-transform: uppercase; letter-spacing: 0.08em;">${acc.location} STAY</span>
            <h3 class="font-serif-luxury" style="font-size: 15px; font-weight: 700; color: #14213D; margin: 3px 0 4px 0; line-height: 1.25;">${acc.hotelName}</h3>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              <div style="display: flex; gap: 2px;">${starRow}</div>
              ${
                acc.ratingScore
                  ? `<span style="font-size: 8.5px; background-color: rgba(184, 148, 79, 0.12); border: 1px solid rgba(184, 148, 79, 0.3); color: #B8944F; padding: 2px 8px; border-radius: 9999px; font-weight: 700;">${acc.ratingScore}★ (${acc.ratingLabel || "Guest rating"})</span>`
                  : ""
              }
            </div>
          </div>
          <div style="text-align: right; font-size: 10.5px;">
            <span style="font-size: 8px; color: #717680; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; display: block; margin-bottom: 2px;">STAY SCHEDULE</span>
            <span style="font-weight: 700; color: #14213D; font-family: 'Inter', sans-serif;">${new Date(acc.checkInDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} &ndash; ${new Date(acc.checkOutDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 10.5px;">
            <div>
              <p style="font-size: 8px; color: #717680; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 3px 0;">ROOM CATEGORY &amp; MEAL PLAN</p>
              <p style="font-weight: 700; color: #14213D; margin: 0;">${acc.roomType || "Standard Luxury Room"} (${acc.mealPlan || "CP"})</p>
            </div>
            ${
              facilitiesTags
                ? `
              <div>
                <p style="font-size: 8px; color: #717680; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 4px 0;">AMENITIES &amp; HIGHLIGHTS</p>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">${facilitiesTags}</div>
              </div>
            `
                : ""
            }
          </div>

          <!-- 3 Equal-Width Hotel Photo Gallery -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; padding-top: 10px; border-top: 1px solid rgba(184, 148, 79, 0.12);">
            ${photoGrid}
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  const flightsRows = trip.flightDetails
    .map((f: any) => {
      const typeLabel = f.type ? f.type.toUpperCase() : "TRANSIT";
      const startingBadge = f.isStartingTransfer
        ? `<span style="background-color: rgba(20, 33, 61, 0.08); color: #14213D; border: 1px solid rgba(20, 33, 61, 0.2); font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">Starting Transfer</span>`
        : "";
      const packageBadge = f.isPackageIncluded
        ? `<span style="background-color: rgba(107, 122, 94, 0.12); color: #4A5641; border: 1px solid rgba(107, 122, 94, 0.3); font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">Package Included</span>`
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
        <tr style="border-bottom: 1px solid rgba(184, 148, 79, 0.12); font-size: 10.5px;" class="break-avoid">
          <td style="padding: 10px 8px; font-weight: 700; color: #14213D; vertical-align: top;">
            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
              <span style="background-color: rgba(184, 148, 79, 0.15); color: #B8944F; font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.05em;">${typeLabel}</span>
              <span>${f.sector}</span>
              ${startingBadge}
              ${packageBadge}
            </div>
            ${f.flightNotes ? `<div style="font-size: 9.5px; color: #717680; margin-top: 3px; font-style: italic;">${f.flightNotes}</div>` : ""}
          </td>
          <td style="padding: 10px 8px; vertical-align: top; font-weight: 600; color: #14213D;">
            ${f.airline}
            ${f.flightCodeDefault ? `<div style="font-size: 9px; color: #717680; font-family: 'Inter', monospace; margin-top: 2px;">${f.flightCodeDefault}</div>` : ""}
          </td>
          <td style="padding: 10px 8px; vertical-align: top; font-family: 'Inter', monospace; font-size: 10px; color: #2B2E36;">${depTime}</td>
          <td style="padding: 10px 8px; vertical-align: top; font-family: 'Inter', monospace; font-size: 10px; color: #2B2E36;">${arrTime}</td>
          <td style="padding: 10px 8px; vertical-align: top;">
            <p style="font-weight: 700; font-size: 10.5px; margin: 0; color: #14213D;">${durationOrStops}</p>
            ${f.layoverInfo ? `<p style="font-size: 9px; color: #717680; margin: 2px 0 0 0;">${f.layoverInfo}</p>` : ""}
          </td>
          <td style="padding: 10px 8px; text-align: right; vertical-align: top; font-family: 'Inter', monospace; font-size: 10px; color: #2B2E36;">
            ${f.type === "Flight" ? `${f.carryOnBaggageKg || 7} kg / ${f.checkInBaggageKg || 20} kg` : "N/A"}
          </td>
        </tr>
      `;
    })
    .join("");

  const addonsRows = trip.addOns
    .map((addon: any) => {
      let desc: any = {};
      try {
        desc = typeof addon.detailsJson === "string" ? JSON.parse(addon.detailsJson) : addon.detailsJson;
      } catch (e) {}
      return `
      <tr style="border-bottom: 1px solid rgba(184, 148, 79, 0.12); font-size: 10.5px;" class="break-avoid">
        <td style="padding: 10px 8px; font-weight: 700; color: #14213D; vertical-align: top;">${addon.name}</td>
        <td style="padding: 10px 8px; color: #4A4E58; vertical-align: top;">
          ${desc?.visaType ? `<p style="margin: 0 0 2px 0;"><span style="font-weight: 700; color: #14213D;">Visa Type:</span> ${desc.visaType}</p>` : ""}
          ${desc?.length ? `<p style="margin: 0 0 2px 0;"><span style="font-weight: 700; color: #14213D;">Validity:</span> ${desc.length}</p>` : ""}
          ${desc?.details ? `<p style="font-style: italic; color: #717680; margin: 2px 0 0 0;">${desc.details}</p>` : ""}
        </td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #14213D; font-family: 'Inter', monospace; vertical-align: top;">
          ₹ ${addon.price.toLocaleString("en-IN")} ${addon.priceType}
        </td>
      </tr>
    `;
    })
    .join("");

  const diningCards = trip.restaurantSuggestions
    .map(
      (rest: any) => `
    <div class="break-avoid dining-card" style="background-color: #FFFFFF; border: 1px solid rgba(184, 148, 79, 0.2); padding: 14px 16px; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
      <h4 class="font-serif-luxury" style="font-weight: 700; color: #14213D; font-size: 12px; margin: 0;">${rest.name}</h4>
      <p style="font-size: 9.5px; color: #717680; margin: 4px 0 0 0;">📍 ${rest.location} &bull; ${rest.category} (${rest.cuisineType})</p>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(184, 148, 79, 0.15);">
        ${rest.rating ? `<span style="font-size: 9.5px; color: #B8944F; font-weight: 700;">★ ${rest.rating} (${rest.reviewCount || 100}+ reviews)</span>` : "<span></span>"}
        ${rest.isVeg ? `<span style="font-size: 8px; font-weight: 700; color: #4A5641; background-color: rgba(107, 122, 94, 0.12); border: 1px solid rgba(107, 122, 94, 0.3); padding: 2px 8px; border-radius: 9999px;">Pure Veg / Jain</span>` : ""}
      </div>
    </div>
  `
    )
    .join("");

  const terms = trip.tripTerms;

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
          margin: 10mm 12mm 12mm 12mm;
        }
        
        *, *::before, *::after {
          box-sizing: border-box;
          letter-spacing: normal !important;
          word-spacing: normal !important;
        }

        html {
          background-color: #F8F6F0 !important;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #14213D;
          background-color: #F8F6F0 !important;
          margin: 0;
          padding: 16px 20px;
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
    <body class="space-y-5">
      
      <!-- BACKGROUND WATERMARK -->
      <div class="pdf-watermark-container">
        ${
          logoDataUri
            ? `<img src="${logoDataUri}" alt="Watermark" class="pdf-watermark-logo" />`
            : `<span class="pdf-watermark-text">TripPlanner</span>`
        }
      </div>

      <!-- 1. MAGAZINE COVER BANNER -->
      <div class="pdf-section break-avoid" style="background-color: #FFFFFF; border: 1px solid rgba(184, 148, 79, 0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(20, 33, 61, 0.06); margin-bottom: 18px;">
        <!-- Full-bleed Hero Visual with Dark Luxury Overlay -->
        <div style="height: 85mm; width: 100%; position: relative; overflow: hidden;">
          <img src="${coverImageDataUri}" alt="Cover Image" style="height: 100%; width: 100%; object-fit: cover;" />
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(20, 33, 61, 0.4) 0%, rgba(20, 33, 61, 0.25) 40%, rgba(20, 33, 61, 0.88) 85%, rgba(20, 33, 61, 0.98) 100%);"></div>
          
          <!-- Top Brand Header Bar on Cover -->
          <div style="position: absolute; top: 16px; left: 20px; right: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="font-serif-luxury" style="font-size: 18px; font-weight: 900; color: #FFFFFF; letter-spacing: 0.08em; text-transform: uppercase;">
                TRIPPLANNER
              </span>
              <span style="font-size: 9px; font-weight: 700; color: #B8944F; border-left: 1px solid rgba(184, 148, 79, 0.6); padding-left: 8px; letter-spacing: 0.12em; text-transform: uppercase;">
                BESPOKE ITINERARY
              </span>
            </div>
            <span style="font-size: 8.5px; font-weight: 700; color: #F3ECDD; background-color: rgba(20, 33, 61, 0.6); border: 1px solid rgba(184, 148, 79, 0.4); padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.06em; text-transform: uppercase;">
              PROPOSAL ID: #${trip.id.slice(-6).toUpperCase()}
            </span>
          </div>
          
          <!-- Hero Title & Journey Summary -->
          <div style="position: absolute; bottom: 20px; left: 24px; right: 24px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="height: 2px; width: 24px; background-color: #B8944F; display: inline-block;"></span>
              <span style="font-size: 9.5px; font-weight: 800; color: #B8944F; text-transform: uppercase; letter-spacing: 0.15em;">
                CURATED TRAVEL EXPERIENCE
              </span>
            </div>
            <h1 class="font-serif-luxury" style="font-size: 28px; font-weight: 800; color: #FFFFFF; line-height: 1.15; margin: 0; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">
              ${trip.title}
            </h1>
            <p style="font-size: 13px; color: #F3ECDD; font-weight: 600; margin: 6px 0 0 0; letter-spacing: 0.02em;">
              Route: <span style="color: #FFFFFF; font-weight: 700;">${trip.destination}</span> &bull; Ex-${trip.departureCity}
            </p>
          </div>
        </div>

        <!-- Luxury Metadata Information Grid -->
        <div style="padding: 18px 24px; background-color: #FFFFFF;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-bottom: 1px solid rgba(184, 148, 79, 0.18); padding-bottom: 14px;">
            <div>
              <p style="color: #717680; font-weight: 700; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 4px 0;">TRAVEL SCHEDULE</p>
              <p style="font-weight: 700; color: #14213D; font-size: 12px; margin: 0;">
                ${new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}&nbsp;&ndash;&nbsp;${new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p style="color: #4A4E58; font-weight: 600; font-size: 10.5px; margin: 3px 0 0 0;">
                ${trip.durationDays} Days / ${trip.durationNights} Nights &bull; ${trip.numTravellers} Travellers
              </p>
            </div>
            <div>
              <p style="color: #717680; font-weight: 700; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 4px 0;">DEDICATED TRAVEL CONSULTANT</p>
              <p style="font-weight: 700; color: #14213D; font-size: 12px; margin: 0;">${trip.consultantName}</p>
              <p style="color: #4A4E58; font-weight: 500; font-size: 10.5px; margin: 3px 0 0 0;">Phone: ${trip.consultantPhone || "Agency Concierge"}</p>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #717680; font-weight: 500; padding-top: 10px; letter-spacing: 0.04em;">
            <p style="margin: 0;">&copy; TripPlanner &bull; Luxury Travel Management</p>
            <p style="margin: 0; color: #14213D; font-weight: 600;">Proposal Date: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>
      </div>

      <!-- 2. VISUAL JOURNEY & ROUTE MAP -->
      <div class="pdf-section break-avoid" style="background-color: #FFFFFF; border: 1px solid rgba(184, 148, 79, 0.22); border-radius: 14px; padding: 18px 20px; margin-bottom: 18px; box-shadow: 0 2px 8px rgba(20, 33, 61, 0.04);">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid rgba(184, 148, 79, 0.2); padding-bottom: 10px; margin-bottom: 14px;">
          <div>
            <span style="font-size: 8.5px; font-weight: 800; color: #B8944F; text-transform: uppercase; letter-spacing: 0.1em; display: block;">
              JOURNEY OVERVIEW &bull; ROUTE VISUALIZATION
            </span>
            <h2 class="font-serif-luxury" style="font-size: 16px; font-weight: 700; color: #14213D; margin: 2px 0 0 0;">
              ${sourceCity.toUpperCase()} &rarr; ${destCity.toUpperCase()}
            </h2>
          </div>
          <div style="font-size: 9px; font-weight: 700; color: #717680; letter-spacing: 0.04em;">
            ${trip.itineraryDays.length} DAYS CONNECTED ROUTE &bull; EX-${sourceCity.toUpperCase()}
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

      <!-- 3. FINANCIAL SUMMARY & TRIP HIGHLIGHTS AT A GLANCE -->
      <div class="pdf-section break-avoid" style="background-color: #FFFFFF; border: 1px solid rgba(184, 148, 79, 0.22); border-radius: 14px; padding: 18px 20px; margin-bottom: 18px; box-shadow: 0 2px 8px rgba(20, 33, 61, 0.04);">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #717680; border-bottom: 1px solid rgba(184, 148, 79, 0.15); padding-bottom: 8px; margin-bottom: 14px;">
          <span style="font-weight: 800; color: #14213D;">${trip.title}</span>
          <span style="font-weight: 700; color: #B8944F;">PROPOSAL SUMMARY &bull; COMMERCIAL QUOTATION</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start;">
          <!-- Pricing Plan Breakdown Card -->
          <div style="background-color: #FAF8F3; border: 1px solid rgba(184, 148, 79, 0.25); padding: 14px 16px; border-radius: 12px;">
            <h3 style="font-size: 10px; font-weight: 800; color: #B8944F; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 10px 0;">
              PRICING PLAN BREAKDOWN
            </h3>
            <div style="display: flex; flex-direction: column;">${priceLines}</div>
            
            <div style="padding-top: 10px; margin-top: 6px; border-top: 1px solid rgba(184, 148, 79, 0.2); display: flex; flex-direction: column; gap: 4px; font-size: 10.5px;">
              <div style="display: flex; justify-content: space-between; color: #717680; font-size: 10px; font-weight: 600;">
                <span>Per-Person Subtotal</span>
                <span style="font-family: 'Inter', monospace; font-weight: 700; color: #14213D;">₹ ${priceQuoteSubtotal.toLocaleString("en-IN")}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #717680; font-size: 10px; font-weight: 600;">
                <span>Number of Travellers</span>
                <span style="font-family: 'Inter', monospace; font-weight: 700; color: #14213D;">${trip.numTravellers || 1}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #717680; font-size: 10px; font-weight: 600;">
                <span>Total Base Package</span>
                <span style="font-family: 'Inter', monospace; font-weight: 700; color: #14213D;">₹ ${(priceQuoteSubtotal * (trip.numTravellers || 1)).toLocaleString("en-IN")}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #717680; font-size: 10px; font-weight: 600;">
                <span>Total TCS (${trip.tripFinancials?.tcsPercentage || 5}%)</span>
                <span style="font-family: 'Inter', monospace; font-weight: 700; color: #14213D;">₹ ${(trip.tripFinancials?.tcsAmount || 0).toLocaleString("en-IN")}</span>
              </div>
              
              <!-- Luxury Navy Total Payable Box -->
              <div style="display: flex; justify-content: space-between; align-items: center; background-color: #14213D; border: 1px solid #B8944F; padding: 10px 12px; border-radius: 10px; margin-top: 8px; box-shadow: 0 2px 6px rgba(20, 33, 61, 0.15);">
                <span style="font-size: 10.5px; font-weight: 700; color: #F3ECDD; text-transform: uppercase; letter-spacing: 0.05em;">Total Payable (with TCS)</span>
                <span style="font-family: 'Inter', monospace; font-size: 14px; font-weight: 800; color: #B8944F;">₹ ${(trip.tripFinancials?.totalWithTcs || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>

            ${
              trip.tripFinancials?.notes
                ? `
              <div style="padding: 8px 10px; background-color: #FFFFFF; border-radius: 8px; border: 1px dashed rgba(184, 148, 79, 0.3); font-size: 9.5px; color: #4A4E58; line-height: 1.45; margin-top: 10px;">
                <span style="font-weight: 700; color: #14213D; display: block; margin-bottom: 2px;">Commercial Notes:</span>
                ${trip.tripFinancials.notes}
              </div>
            `
                : ""
            }
          </div>

          <!-- Trip Highlights At A Glance -->
          <div style="background-color: #FAF8F3; border: 1px solid rgba(184, 148, 79, 0.25); padding: 14px 16px; border-radius: 12px;">
            <h3 style="font-size: 10px; font-weight: 800; color: #B8944F; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 10px 0;">
              TRIP HIGHLIGHTS AT A GLANCE
            </h3>
            <table style="width: 100%; text-align: left; font-size: 10.5px; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1.5px solid rgba(184, 148, 79, 0.25); color: #717680; font-weight: 700; text-transform: uppercase; font-size: 8px; letter-spacing: 0.06em;">
                  <th style="padding-bottom: 6px; width: 18%;">Day</th>
                  <th style="padding-bottom: 6px; width: 32%;">Region</th>
                  <th style="padding-bottom: 6px; width: 50%;">Highlight</th>
                </tr>
              </thead>
              <tbody>
                ${glanceRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 4. DAY-BY-DAY DETAILED ITINERARY -->
      <div class="pdf-section-wrapper" style="margin-bottom: 18px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #B8944F; padding-bottom: 6px; margin-bottom: 14px;" class="break-avoid">
          <h2 class="font-serif-luxury" style="font-size: 16px; font-weight: 700; color: #14213D; margin: 0;">
            Day-by-Day Detailed Itinerary
          </h2>
          <span style="font-size: 9px; font-weight: 700; color: #B8944F; text-transform: uppercase; letter-spacing: 0.08em;">
            ${trip.itineraryDays.length} DAYS DETAILED JOURNEY
          </span>
        </div>
        ${detailedDaysHtml}
      </div>

      <!-- 5. ACCOMMODATIONS & STAYS -->
      ${
        accommodationsHtml
          ? `
        <div class="pdf-section-wrapper" style="margin-bottom: 18px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #B8944F; padding-bottom: 6px; margin-bottom: 14px;" class="break-avoid">
            <h2 class="font-serif-luxury" style="font-size: 16px; font-weight: 700; color: #14213D; margin: 0;">
              Curated Accommodations &amp; Stays
            </h2>
            <span style="font-size: 9px; font-weight: 700; color: #B8944F; text-transform: uppercase; letter-spacing: 0.08em;">
              ${trip.accommodations.length} PROPERTIES CONFIRMED
            </span>
          </div>
          ${accommodationsHtml}
        </div>
      `
          : ""
      }

      <!-- 6. TRANSPORTATION & ADD-ONS -->
      ${
        flightsRows || addonsRows
          ? `
        <div class="pdf-section break-avoid" style="background-color: #FFFFFF; border: 1px solid rgba(184, 148, 79, 0.22); border-radius: 14px; padding: 18px 20px; margin-bottom: 18px; box-shadow: 0 2px 8px rgba(20, 33, 61, 0.04);">
          ${
            flightsRows
              ? `
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(184, 148, 79, 0.18); padding-bottom: 8px;">
                <h3 class="font-serif-luxury" style="font-size: 14px; font-weight: 700; color: #14213D; margin: 0; display: flex; align-items: center; gap: 6px;">
                  <span>🚗</span> Transportation &amp; Transit Schedule
                </h3>
                <span style="font-size: 8.5px; font-weight: 700; color: #B8944F; text-transform: uppercase; letter-spacing: 0.06em;">
                  Arrangement: ${trip.transportationArrangement}
                </span>
              </div>

              ${
                trip.transportationArrangement === "Own"
                  ? `
                <div style="background-color: #FAF8F3; border: 1px solid rgba(184, 148, 79, 0.25); color: #4A4E58; font-size: 9.5px; padding: 8px 12px; border-radius: 8px; line-height: 1.45;">
                  ℹ️ <strong style="color: #14213D;">Own Transportation:</strong> Traveller has opted to arrange their own transit for this journey. The schedule below is provided for itinerary reference.
                </div>
              `
                  : ""
              }

              ${
                trip.startingTransferDetails
                  ? `
                <div style="background-color: rgba(20, 33, 61, 0.06); border: 1px solid rgba(20, 33, 61, 0.15); color: #14213D; font-size: 9.5px; padding: 8px 12px; border-radius: 8px; line-height: 1.45;">
                  🗺️ <strong>Starting Hub Transfer Details:</strong> ${trip.startingTransferDetails}
                </div>
              `
                  : ""
              }

              ${
                trip.packageTransportationDetails
                  ? `
                <div style="background-color: rgba(107, 122, 94, 0.08); border: 1px solid rgba(107, 122, 94, 0.25); color: #4A5641; font-size: 9.5px; padding: 8px 12px; border-radius: 8px; line-height: 1.45;">
                  🎁 <strong>Package Included Transit:</strong> ${trip.packageTransportationDetails}
                </div>
              `
                  : ""
              }

              <table style="width: 100%; text-align: left; font-size: 10.5px; border-collapse: collapse; margin-top: 4px;">
                <thead style="background-color: #FAF8F3; color: #717680; font-weight: 700; border-bottom: 1.5px solid rgba(184, 148, 79, 0.25); font-size: 8px; text-transform: uppercase; letter-spacing: 0.06em;">
                  <tr>
                    <th style="padding: 8px;">Route / Sector</th>
                    <th style="padding: 8px;">Carrier</th>
                    <th style="padding: 8px;">Departure</th>
                    <th style="padding: 8px;">Arrival</th>
                    <th style="padding: 8px;">Duration</th>
                    <th style="padding: 8px; text-align: right;">Baggage Allowance</th>
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
            <div style="display: flex; flex-direction: column; gap: 10px; padding-top: 14px; ${flightsRows ? "border-top: 1px solid rgba(184, 148, 79, 0.18); margin-top: 14px;" : ""}">
              <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(184, 148, 79, 0.18); padding-bottom: 8px;">
                <h3 class="font-serif-luxury" style="font-size: 14px; font-weight: 700; color: #14213D; margin: 0; display: flex; align-items: center; gap: 6px;">
                  <span>➕</span> Included Add-ons &amp; Visa Packages
                </h3>
              </div>
              <table style="width: 100%; text-align: left; font-size: 10.5px; border-collapse: collapse;">
                <thead style="background-color: #FAF8F3; color: #717680; font-weight: 700; border-bottom: 1.5px solid rgba(184, 148, 79, 0.25); font-size: 8px; text-transform: uppercase; letter-spacing: 0.06em;">
                  <tr>
                    <th style="padding: 8px;">Package / Service Name</th>
                    <th style="padding: 8px;">Validity &amp; Processing Details</th>
                    <th style="padding: 8px; text-align: right;">Cost</th>
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

      <!-- 7. DINING & CULINARY SUGGESTIONS -->
      ${
        diningCards
          ? `
        <div class="pdf-section break-avoid" style="background-color: #FFFFFF; border: 1px solid rgba(184, 148, 79, 0.22); border-radius: 14px; padding: 18px 20px; margin-bottom: 18px; box-shadow: 0 2px 8px rgba(20, 33, 61, 0.04);">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(184, 148, 79, 0.18); padding-bottom: 8px; margin-bottom: 12px;">
            <h3 class="font-serif-luxury" style="font-size: 14px; font-weight: 700; color: #14213D; margin: 0; display: flex; align-items: center; gap: 6px;">
              <span>🍴</span> Curated Dining &amp; Hotspots
            </h3>
            <span style="font-size: 8.5px; font-weight: 700; color: #B8944F; text-transform: uppercase; letter-spacing: 0.06em;">
              HANDPICKED SUGGESTIONS
            </span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            ${diningCards}
          </div>
        </div>
      `
          : ""
      }

      <!-- 8. MASTER POLICIES & TERMS -->
      ${
        terms
          ? `
        <div class="pdf-section break-avoid" style="background-color: #FFFFFF; border: 1px solid rgba(184, 148, 79, 0.22); border-radius: 14px; padding: 18px 20px; box-shadow: 0 2px 8px rgba(20, 33, 61, 0.04); margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #717680; border-bottom: 1px solid rgba(184, 148, 79, 0.18); padding-bottom: 8px; margin-bottom: 12px;">
            <span style="font-weight: 800; color: #14213D;">${trip.title}</span>
            <span style="font-weight: 700; color: #B8944F;">TERMS &bull; POLICIES &bull; COMMERCIAL GUIDELINES</span>
          </div>

          <h2 class="font-serif-luxury" style="font-size: 16px; font-weight: 700; color: #14213D; margin: 0 0 12px 0;">
            Master Policies &amp; Booking Terms
          </h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 10.5px; color: #2B2E36;" class="prose max-w-none">
            <div style="background-color: #FAF8F3; padding: 12px 14px; border: 1px solid rgba(184, 148, 79, 0.2); border-radius: 10px;">
              <h4 style="font-weight: 800; color: #14213D; font-size: 11px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.04em;">1. Payment Policy</h4>
              <div style="line-height: 1.5; color: #4A4E58;">${terms.paymentPolicy || "Standard booking deposit and structured payment schedule apply."}</div>
            </div>
            
            <div style="background-color: #FAF8F3; padding: 12px 14px; border: 1px solid rgba(184, 148, 79, 0.2); border-radius: 10px;">
              <h4 style="font-weight: 800; color: #14213D; font-size: 11px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.04em;">2. Cancellation Policy</h4>
              <div style="line-height: 1.5; color: #4A4E58;">${terms.cancellationPolicy || "Strict operator cancellation policy and supplier penalties apply."}</div>
            </div>

            <div style="background-color: #FAF8F3; padding: 12px 14px; border: 1px solid rgba(184, 148, 79, 0.2); border-radius: 10px;">
              <h4 style="font-weight: 800; color: #14213D; font-size: 11px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.04em;">3. Visa Rules &amp; Entry Requirements</h4>
              <div style="line-height: 1.5; color: #4A4E58;">${terms.visaRules || "Minimum 6 months passport validity required from scheduled date of return."}</div>
            </div>

            <div style="background-color: #FAF8F3; padding: 12px 14px; border: 1px solid rgba(184, 148, 79, 0.2); border-radius: 10px;">
              <h4 style="font-weight: 800; color: #14213D; font-size: 11px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.04em;">4. General Notes &amp; Advisory</h4>
              <div style="line-height: 1.5; color: #4A4E58;">${terms.generalNotes || "Standard international travel advisories, health regulations, and insurance conditions apply."}</div>
            </div>
          </div>

          <div style="border-top: 1px solid rgba(184, 148, 79, 0.18); padding-top: 12px; margin-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #717680; font-weight: 500;">
            <span>&copy; TripPlanner &bull; Custom Travel Proposal</span>
            <span style="font-weight: 700; color: #14213D; text-transform: uppercase; letter-spacing: 0.05em;">Official Customer Travel Proposal</span>
          </div>
        </div>
      `
          : ""
      }

    </body>
    </html>
  `;

  return { html, title: trip.title || trip.destination || "Itinerary" };
}

