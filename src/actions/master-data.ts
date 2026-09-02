"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ==========================================
// OVERVIEW STATS & ANALYTICS
// ==========================================
export async function getOverviewStats() {
  try {
    const totalTrips = await db.trip.count();
    
    // Trips this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const tripsThisMonth = await db.trip.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Total master records
    const [
      citiesCount,
      consultantsCount,
      taxCount,
      pricingLabelsCount,
      placesCount,
      hotelsCount,
      flightsCount,
      addonsCount,
      restaurantsCount,
      policiesCount,
      titlesCount,
      bannersCount,
      ratesCount,
    ] = await Promise.all([
      db.masterCity.count(),
      db.masterConsultant.count(),
      db.masterTaxSetting.count(),
      db.masterPricingLabel.count(),
      db.masterPlace.count(),
      db.masterHotel.count(),
      db.masterFlightRoute.count(),
      db.masterAddOn.count(),
      db.masterRestaurant.count(),
      db.masterPolicyTemplate.count(),
      db.masterTitleTemplate.count(),
      db.masterBannerImage.count(),
      db.masterCostRate.count(),
    ]);

    const totalMasterRecords =
      citiesCount +
      consultantsCount +
      taxCount +
      pricingLabelsCount +
      placesCount +
      hotelsCount +
      flightsCount +
      addonsCount +
      restaurantsCount +
      policiesCount +
      titlesCount +
      bannersCount +
      ratesCount;

    // Average profit margin
    const calculations = await db.tripCostCalculation.findMany({
      select: { marginPercentage: true },
    });
    const avgMargin = calculations.length
      ? Math.round((calculations.reduce((acc, c) => acc + c.marginPercentage, 0) / calculations.length) * 10) / 10
      : 24.5; // fallback baseline if no calculations saved yet

    // Monthly chart data (last 12 months)
    const monthsData: { month: string; trips: number; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = d.toLocaleString("default", { month: "short", year: "2-digit" });
      
      const count = await db.trip.count({
        where: {
          createdAt: {
            gte: d,
            lt: nextD,
          },
        },
      });

      monthsData.push({
        month: monthLabel,
        trips: count,
        revenue: count * 75000,
      });
    }

    return {
      success: true,
      data: {
        totalTrips,
        tripsThisMonth,
        totalMasterRecords,
        avgMargin,
        chartData: monthsData,
      },
    };
  } catch (error: any) {
    console.error("Error fetching overview stats:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 1. CITIES & STATES
// ==========================================
export async function getMasterCities() {
  try {
    const data = await db.masterCity.findMany({
      orderBy: [{ country: "asc" }, { name: "asc" }],
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createMasterCity(formData: { name: string; state: string; country: string }) {
  try {
    const data = await db.masterCity.create({
      data: {
        name: formData.name.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMasterCity(id: string, formData: { name: string; state: string; country: string }) {
  try {
    const data = await db.masterCity.update({
      where: { id },
      data: {
        name: formData.name.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMasterCity(id: string) {
  try {
    await db.masterCity.delete({ where: { id } });
    revalidatePath("/master-data");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 2. CONSULTANTS
// ==========================================
export async function getMasterConsultants() {
  try {
    const data = await db.masterConsultant.findMany({
      orderBy: { name: "asc" },
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createMasterConsultant(formData: {
  name: string;
  phone: string;
  email?: string;
  departureCity?: string;
}) {
  try {
    const data = await db.masterConsultant.create({
      data: {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || null,
        departureCity: formData.departureCity?.trim() || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMasterConsultant(
  id: string,
  formData: { name: string; phone: string; email?: string; departureCity?: string }
) {
  try {
    const data = await db.masterConsultant.update({
      where: { id },
      data: {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || null,
        departureCity: formData.departureCity?.trim() || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMasterConsultant(id: string) {
  try {
    await db.masterConsultant.delete({ where: { id } });
    revalidatePath("/master-data");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 3. TAX SETTINGS
// ==========================================
export async function getMasterTaxSettings() {
  try {
    const data = await db.masterTaxSetting.findMany({
      orderBy: { effectiveFrom: "desc" },
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getActiveTaxSetting() {
  try {
    const setting = await db.masterTaxSetting.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: "desc" },
    });
    return { success: true, data: setting || { currentTcsPercentage: 5.0, notes: "" } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveMasterTaxSetting(formData: { currentTcsPercentage: number; notes?: string; effectiveFrom?: string }) {
  try {
    // Deactivate existing
    await db.masterTaxSetting.updateMany({
      data: { isActive: false },
    });

    const data = await db.masterTaxSetting.create({
      data: {
        currentTcsPercentage: Number(formData.currentTcsPercentage),
        notes: formData.notes || null,
        effectiveFrom: formData.effectiveFrom ? new Date(formData.effectiveFrom) : new Date(),
        isActive: true,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 4. PRICING LABELS
// ==========================================
export async function getMasterPricingLabels() {
  try {
    const data = await db.masterPricingLabel.findMany({
      orderBy: { name: "asc" },
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createMasterPricingLabel(name: string, price: number = 0, titleTemplateId: string | null = null) {
  try {
    const data = await db.masterPricingLabel.create({
      data: {
        name: name.trim(),
        price: Number(price),
        titleTemplateId: titleTemplateId || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMasterPricingLabel(id: string, name: string, price: number = 0) {
  try {
    const data = await db.masterPricingLabel.update({
      where: { id },
      data: {
        name: name.trim(),
        price: Number(price),
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMasterPricingLabel(id: string) {
  try {
    await db.masterPricingLabel.delete({ where: { id } });
    revalidatePath("/master-data");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 5. PLACES (City-Wise Attractions & Sights)
// ==========================================
export async function getMasterPlaceDefaults() {
  try {
    const records = await db.$queryRaw<any[]>`
      SELECT id, "defaultInclusions", "defaultExclusions", "createdAt", "updatedAt"
      FROM "MasterPlaceDefault"
      LIMIT 1
    `;
    if (records && records.length > 0) {
      return {
        success: true,
        data: {
          id: records[0].id,
          defaultInclusions: Array.isArray(records[0].defaultInclusions) ? records[0].defaultInclusions : [],
          defaultExclusions: Array.isArray(records[0].defaultExclusions) ? records[0].defaultExclusions : [],
        },
      };
    }

    const fallbackDefaults = {
      defaultInclusions: [
        "Entry Ticket & Monument Access",
        "Professional Local Tour Guide",
        "Private Air-Conditioned Vehicle Transfers",
        "Complimentary Bottled Drinking Water",
      ],
      defaultExclusions: [
        "Personal Souvenirs & Shopping Expenses",
        "Optional Adventure / Special Activity Upgrades",
        "Meals, Snacks & Beverages (unless specified)",
        "Special Camera / Video Recording Permissions",
      ],
    };

    return {
      success: true,
      data: {
        id: "default",
        ...fallbackDefaults,
      },
    };
  } catch (err: any) {
    console.error("Error in getMasterPlaceDefaults:", err);
    return {
      success: true,
      data: {
        id: "default",
        defaultInclusions: [
          "Entry Ticket & Monument Access",
          "Professional Local Tour Guide",
          "Private Air-Conditioned Vehicle Transfers",
          "Complimentary Bottled Drinking Water",
        ],
        defaultExclusions: [
          "Personal Souvenirs & Shopping Expenses",
          "Optional Adventure / Special Activity Upgrades",
          "Meals, Snacks & Beverages (unless specified)",
          "Special Camera / Video Recording Permissions",
        ],
      },
    };
  }
}

export async function updateMasterPlaceDefaults(formData: {
  defaultInclusions: string[];
  defaultExclusions: string[];
}) {
  try {
    const existing = await db.$queryRaw<any[]>`
      SELECT id FROM "MasterPlaceDefault" LIMIT 1
    `;
    if (existing && existing.length > 0) {
      await db.$executeRaw`
        UPDATE "MasterPlaceDefault"
        SET "defaultInclusions" = ${formData.defaultInclusions},
            "defaultExclusions" = ${formData.defaultExclusions},
            "updatedAt" = NOW()
        WHERE id = ${existing[0].id}
      `;
    } else {
      await db.$executeRaw`
        INSERT INTO "MasterPlaceDefault" (id, "defaultInclusions", "defaultExclusions", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${formData.defaultInclusions}, ${formData.defaultExclusions}, NOW(), NOW())
      `;
    }
    revalidatePath("/master-data");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("Error updating place defaults:", err);
    return { success: false, error: err.message || "Failed to update place defaults" };
  }
}

export async function getMasterPlaces(cityId?: string) {
  try {
    const where = cityId && cityId !== "all" ? { cityId } : {};
    const [rawPlaces, defaultsRes] = await Promise.all([
      db.masterPlace.findMany({
        where,
        include: { city: true },
        orderBy: { name: "asc" },
      }),
      getMasterPlaceDefaults(),
    ]);

    const defaultInc = defaultsRes.data?.defaultInclusions || [];
    const defaultExc = defaultsRes.data?.defaultExclusions || [];

    const data = rawPlaces.map((p) => ({
      ...p,
      inclusions: Array.from(new Set([...defaultInc, ...(p.inclusions || [])])),
      exclusions: Array.from(new Set([...defaultExc, ...(p.exclusions || [])])),
      placeSpecificInclusions: p.inclusions || [],
      placeSpecificExclusions: p.exclusions || [],
    }));

    return { success: true, data, placeDefaults: defaultsRes.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createMasterPlace(formData: {
  name: string;
  cityId: string;
  category?: string;
  description?: string;
  inclusions?: string[];
  exclusions?: string[];
}) {
  try {
    const data = await db.masterPlace.create({
      data: {
        name: formData.name.trim(),
        cityId: formData.cityId,
        category: formData.category?.trim() || "Sightseeing",
        description: formData.description?.trim() || null,
        inclusions: formData.inclusions || [],
        exclusions: formData.exclusions || [],
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMasterPlace(
  id: string,
  formData: {
    name: string;
    cityId: string;
    category?: string;
    description?: string;
    inclusions?: string[];
    exclusions?: string[];
  }
) {
  try {
    const data = await db.masterPlace.update({
      where: { id },
      data: {
        name: formData.name.trim(),
        cityId: formData.cityId,
        category: formData.category?.trim() || "Sightseeing",
        description: formData.description?.trim() || null,
        inclusions: formData.inclusions || [],
        exclusions: formData.exclusions || [],
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMasterPlace(id: string) {
  try {
    await db.masterPlace.delete({ where: { id } });
    revalidatePath("/master-data");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 11. HOTELS
// ==========================================
export async function getMasterHotels(cityId?: string) {
  try {
    const where = cityId && cityId !== "all" ? { cityId } : {};
    const data = await db.masterHotel.findMany({
      where,
      include: { city: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createMasterHotel(formData: {
  name: string;
  cityId?: string;
  starRating: number;
  roomTypes: string[];
  mealPlans: string[];
  guestScore?: number;
  guestScoreLabel?: string;
  facilities: string[];
  nearbyAttractions: any;
  nearbyRestaurants: any;
  photos: string[];
  pricePerNight?: number;
  pricePerPerson?: number;
  titleTemplateId?: string;
}) {
  try {
    const data = await db.masterHotel.create({
      data: {
        name: formData.name.trim(),
        cityId: formData.cityId || null,
        starRating: Number(formData.starRating || 4),
        roomTypes: formData.roomTypes || [],
        mealPlans: formData.mealPlans || [],
        guestScore: formData.guestScore ? Number(formData.guestScore) : null,
        guestScoreLabel: formData.guestScoreLabel || null,
        facilities: formData.facilities || [],
        nearbyAttractions: formData.nearbyAttractions || [],
        nearbyRestaurants: formData.nearbyRestaurants || [],
        photos: formData.photos || [],
        pricePerNight: formData.pricePerNight !== undefined ? Number(formData.pricePerNight) : 0,
        pricePerPerson: formData.pricePerPerson !== undefined ? Number(formData.pricePerPerson) : 0,
        titleTemplateId: formData.titleTemplateId || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMasterHotel(
  id: string,
  formData: {
    name: string;
    cityId?: string;
    starRating: number;
    roomTypes: string[];
    mealPlans: string[];
    guestScore?: number;
    guestScoreLabel?: string;
    facilities: string[];
    nearbyAttractions: any;
    nearbyRestaurants: any;
    photos: string[];
    pricePerNight?: number;
    pricePerPerson?: number;
    titleTemplateId?: string;
  }
) {
  try {
    const data = await db.masterHotel.update({
      where: { id },
      data: {
        name: formData.name.trim(),
        cityId: formData.cityId || null,
        starRating: Number(formData.starRating || 4),
        roomTypes: formData.roomTypes || [],
        mealPlans: formData.mealPlans || [],
        guestScore: formData.guestScore ? Number(formData.guestScore) : null,
        guestScoreLabel: formData.guestScoreLabel || null,
        facilities: formData.facilities || [],
        nearbyAttractions: formData.nearbyAttractions || [],
        nearbyRestaurants: formData.nearbyRestaurants || [],
        photos: formData.photos || [],
        pricePerNight: formData.pricePerNight !== undefined ? Number(formData.pricePerNight) : 0,
        pricePerPerson: formData.pricePerPerson !== undefined ? Number(formData.pricePerPerson) : 0,
        titleTemplateId: formData.titleTemplateId || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMasterHotel(id: string) {
  try {
    await db.masterHotel.delete({ where: { id } });
    revalidatePath("/master-data");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 7. FLIGHT ROUTES
// ==========================================
export async function getMasterFlightRoutes() {
  try {
    const data = await db.masterFlightRoute.findMany({
      orderBy: { sector: "asc" },
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
export async function createMasterFlightRoute(formData: {
  sector: string;
  airline: string;
  flightCodeDefault?: string;
  typicalStops: number;
  typicalLayoverInfo?: string;
  cabinBaggageKg?: number;
  checkInBaggageKg?: number;
  cancellationPolicy?: string;
  flightNotes?: string;
  type?: string;
  travelTime?: string;
  titleTemplateId?: string;
}) {
  try {
    const data = await db.masterFlightRoute.create({
      data: {
        sector: formData.sector.trim(),
        airline: formData.airline.trim(),
        flightCodeDefault: formData.flightCodeDefault?.trim() || null,
        typicalStops: Number(formData.typicalStops || 0),
        typicalLayoverInfo: formData.typicalLayoverInfo?.trim() || null,
        cabinBaggageKg: formData.cabinBaggageKg ? Number(formData.cabinBaggageKg) : 7,
        checkInBaggageKg: formData.checkInBaggageKg ? Number(formData.checkInBaggageKg) : 20,
        cancellationPolicy: formData.cancellationPolicy?.trim() || null,
        flightNotes: formData.flightNotes?.trim() || null,
        type: formData.type || "Flight",
        travelTime: formData.travelTime || null,
        titleTemplateId: formData.titleTemplateId || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMasterFlightRoute(id: string, formData: {
  sector: string;
  airline: string;
  flightCodeDefault?: string;
  typicalStops: number;
  typicalLayoverInfo?: string;
  cabinBaggageKg?: number;
  checkInBaggageKg?: number;
  cancellationPolicy?: string;
  flightNotes?: string;
  type?: string;
  travelTime?: string;
  titleTemplateId?: string;
}) {
  try {
    const data = await db.masterFlightRoute.update({
      where: { id },
      data: {
        sector: formData.sector.trim(),
        airline: formData.airline.trim(),
        flightCodeDefault: formData.flightCodeDefault?.trim() || null,
        typicalStops: Number(formData.typicalStops || 0),
        typicalLayoverInfo: formData.typicalLayoverInfo?.trim() || null,
        cabinBaggageKg: formData.cabinBaggageKg ? Number(formData.cabinBaggageKg) : 7,
        checkInBaggageKg: formData.checkInBaggageKg ? Number(formData.checkInBaggageKg) : 20,
        cancellationPolicy: formData.cancellationPolicy?.trim() || null,
        flightNotes: formData.flightNotes?.trim() || null,
        type: formData.type || "Flight",
        travelTime: formData.travelTime || null,
        titleTemplateId: formData.titleTemplateId || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMasterFlightRoute(id: string) {
  try {
    await db.masterFlightRoute.delete({ where: { id } });
    revalidatePath("/master-data");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 8. ADD-ONS & VISA
// ==========================================
export async function getMasterAddOns() {
  try {
    const data = await db.masterAddOn.findMany({
      orderBy: { name: "asc" },
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createMasterAddOn(formData: {
  name: string;
  type?: string;
  visaType?: string;
  validityLength?: string;
  validityWindow?: string;
  defaultPrice: number;
  detailsDescription?: string;
  titleTemplateId?: string;
}) {
  try {
    const data = await db.masterAddOn.create({
      data: {
        name: formData.name.trim(),
        type: formData.type || "Visa",
        visaType: formData.visaType?.trim() || null,
        validityLength: formData.validityLength?.trim() || null,
        validityWindow: formData.validityWindow?.trim() || null,
        defaultPrice: Number(formData.defaultPrice || 0),
        detailsDescription: formData.detailsDescription?.trim() || null,
        titleTemplateId: formData.titleTemplateId || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMasterAddOn(id: string, formData: {
  name: string;
  type?: string;
  visaType?: string;
  validityLength?: string;
  validityWindow?: string;
  defaultPrice: number;
  detailsDescription?: string;
  titleTemplateId?: string;
}) {
  try {
    const data = await db.masterAddOn.update({
      where: { id },
      data: {
        name: formData.name.trim(),
        type: formData.type || "Visa",
        visaType: formData.visaType?.trim() || null,
        validityLength: formData.validityLength?.trim() || null,
        validityWindow: formData.validityWindow?.trim() || null,
        defaultPrice: Number(formData.defaultPrice || 0),
        detailsDescription: formData.detailsDescription?.trim() || null,
        titleTemplateId: formData.titleTemplateId || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMasterAddOn(id: string) {
  try {
    await db.masterAddOn.delete({ where: { id } });
    revalidatePath("/master-data");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 9. RESTAURANTS & CLUBS
// ==========================================
export async function getMasterRestaurants() {
  try {
    const data = await db.masterRestaurant.findMany({
      include: { city: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createMasterRestaurant(formData: {
  name: string;
  cityId?: string;
  cuisineType: string;
  categoryType: string;
  starRating?: number;
  reviewsCount?: number;
  offersPureVegJain: boolean;
  titleTemplateId?: string;
}) {
  try {
    const data = await db.masterRestaurant.create({
      data: {
        name: formData.name.trim(),
        cityId: formData.cityId || null,
        cuisineType: formData.cuisineType.trim(),
        categoryType: formData.categoryType || "Restaurant",
        starRating: formData.starRating ? Number(formData.starRating) : 4.5,
        reviewsCount: formData.reviewsCount ? Number(formData.reviewsCount) : 100,
        offersPureVegJain: Boolean(formData.offersPureVegJain),
        titleTemplateId: formData.titleTemplateId || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMasterRestaurant(id: string, formData: {
  name: string;
  cityId?: string;
  cuisineType: string;
  categoryType: string;
  starRating?: number;
  reviewsCount?: number;
  offersPureVegJain: boolean;
  titleTemplateId?: string;
}) {
  try {
    const data = await db.masterRestaurant.update({
      where: { id },
      data: {
        name: formData.name.trim(),
        cityId: formData.cityId || null,
        cuisineType: formData.cuisineType.trim(),
        categoryType: formData.categoryType || "Restaurant",
        starRating: formData.starRating ? Number(formData.starRating) : 4.5,
        reviewsCount: formData.reviewsCount ? Number(formData.reviewsCount) : 100,
        offersPureVegJain: Boolean(formData.offersPureVegJain),
        titleTemplateId: formData.titleTemplateId || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMasterRestaurant(id: string) {
  try {
    await db.masterRestaurant.delete({ where: { id } });
    revalidatePath("/master-data");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 10. POLICY TEMPLATES
// ==========================================
export async function getMasterPolicyTemplates() {
  try {
    const data = await db.masterPolicyTemplate.findMany({
      orderBy: { name: "asc" },
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createMasterPolicyTemplate(formData: {
  name: string;
  paymentPolicy: string;
  cancellationPolicy: string;
  visaRules: string;
  generalNotes: string;
  titleTemplateId?: string;
}) {
  try {
    const data = await db.masterPolicyTemplate.create({
      data: {
        name: formData.name.trim(),
        paymentPolicy: formData.paymentPolicy,
        cancellationPolicy: formData.cancellationPolicy,
        visaRules: formData.visaRules,
        generalNotes: formData.generalNotes,
        titleTemplateId: formData.titleTemplateId || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMasterPolicyTemplate(id: string, formData: {
  name: string;
  paymentPolicy: string;
  cancellationPolicy: string;
  visaRules: string;
  generalNotes: string;
  titleTemplateId?: string;
}) {
  try {
    const data = await db.masterPolicyTemplate.update({
      where: { id },
      data: {
        name: formData.name.trim(),
        paymentPolicy: formData.paymentPolicy,
        cancellationPolicy: formData.cancellationPolicy,
        visaRules: formData.visaRules,
        generalNotes: formData.generalNotes,
        titleTemplateId: formData.titleTemplateId || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMasterPolicyTemplate(id: string) {
  try {
    await db.masterPolicyTemplate.delete({ where: { id } });
    revalidatePath("/master-data");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 11. TITLE TEMPLATES
// ==========================================
export async function getMasterTitleTemplates() {
  try {
    const data = await db.masterTitleTemplate.findMany({
      orderBy: { title: "asc" },
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createMasterTitleTemplate(title: string) {
  try {
    const data = await db.masterTitleTemplate.create({
      data: { title: title.trim() },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMasterTitleTemplate(id: string, title: string) {
  try {
    const data = await db.masterTitleTemplate.update({
      where: { id },
      data: { title: title.trim() },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMasterTitleTemplate(id: string) {
  try {
    await db.masterTitleTemplate.delete({ where: { id } });
    revalidatePath("/master-data");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 12. BANNER IMAGES
// ==========================================
export async function getMasterBannerImages() {
  try {
    const data = await db.masterBannerImage.findMany({
      include: { destinationCity: true },
      orderBy: { label: "asc" },
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createMasterBannerImage(formData: {
  label: string;
  imageUrl: string;
  destinationCityId?: string;
}) {
  try {
    const data = await db.masterBannerImage.create({
      data: {
        label: formData.label.trim(),
        imageUrl: formData.imageUrl.trim(),
        destinationCityId: formData.destinationCityId || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMasterBannerImage(id: string, formData: {
  label: string;
  imageUrl: string;
  destinationCityId?: string;
}) {
  try {
    const data = await db.masterBannerImage.update({
      where: { id },
      data: {
        label: formData.label.trim(),
        imageUrl: formData.imageUrl.trim(),
        destinationCityId: formData.destinationCityId || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMasterBannerImage(id: string) {
  try {
    await db.masterBannerImage.delete({ where: { id } });
    revalidatePath("/master-data");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 13. COST RATES
// ==========================================
export async function getMasterCostRates() {
  try {
    const data = await db.masterCostRate.findMany({
      orderBy: [{ category: "asc" }, { label: "asc" }],
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createMasterCostRate(formData: {
  category: string;
  label: string;
  defaultRate: number;
  unit: string;
  notes?: string;
}) {
  try {
    const data = await db.masterCostRate.create({
      data: {
        category: formData.category.trim(),
        label: formData.label.trim(),
        defaultRate: Number(formData.defaultRate),
        unit: formData.unit.trim(),
        notes: formData.notes?.trim() || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMasterCostRate(id: string, formData: {
  category: string;
  label: string;
  defaultRate: number;
  unit: string;
  notes?: string;
}) {
  try {
    const data = await db.masterCostRate.update({
      where: { id },
      data: {
        category: formData.category.trim(),
        label: formData.label.trim(),
        defaultRate: Number(formData.defaultRate),
        unit: formData.unit.trim(),
        notes: formData.notes?.trim() || null,
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMasterCostRate(id: string) {
  try {
    await db.masterCostRate.delete({ where: { id } });
    revalidatePath("/master-data");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 14. ADMIN COST CALCULATION ENGINE
// ==========================================
export async function getTripsForCostCalculation() {
  try {
    const trips = await db.trip.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        priceQuoteItems: true,
        tripFinancials: true,
        costCalculation: true,
      },
    });

    const formatted = trips.map((t) => {
      // Calculate total customer revenue from priceQuoteItems or tripFinancials
      const subtotal = t.priceQuoteItems.reduce((acc, item) => acc + item.amount, 0);
      const revenue = t.costCalculation?.customerRevenue || subtotal || 0;
      const internalCost = t.costCalculation?.internalCost || 0;
      const netProfit = revenue - internalCost;
      const marginPercentage = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return {
        id: t.id,
        title: t.title,
        destination: t.destination,
        numTravellers: t.numTravellers,
        durationDays: t.durationDays,
        customerRevenue: revenue,
        internalCost: internalCost,
        netProfit: Math.round(netProfit * 100) / 100,
        marginPercentage: Math.round(marginPercentage * 10) / 10,
        hasCalculation: !!t.costCalculation,
        lineItems: t.costCalculation?.lineItems || [],
      };
    });

    return { success: true, data: formatted };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveTripCostCalculation(tripId: string, payload: {
  customerRevenue: number;
  internalCost: number;
  netProfit: number;
  marginPercentage: number;
  lineItems: any[];
}) {
  try {
    const data = await db.tripCostCalculation.upsert({
      where: { tripId },
      update: {
        customerRevenue: Number(payload.customerRevenue),
        internalCost: Number(payload.internalCost),
        netProfit: Number(payload.netProfit),
        marginPercentage: Number(payload.marginPercentage),
        lineItems: payload.lineItems || [],
      },
      create: {
        tripId,
        customerRevenue: Number(payload.customerRevenue),
        internalCost: Number(payload.internalCost),
        netProfit: Number(payload.netProfit),
        marginPercentage: Number(payload.marginPercentage),
        lineItems: payload.lineItems || [],
      },
    });
    revalidatePath("/master-data");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// BATCH QUERY FOR FORM AUTO-FILL SELECTORS
// ==========================================
export async function getAllMasterDataForSelectors() {
  try {
    const [
      cities,
      consultants,
      taxSetting,
      pricingLabels,
      placesRaw,
      hotels,
      flightRoutes,
      addOns,
      restaurants,
      policyTemplates,
      titleTemplates,
      bannerImages,
      placeDefaultsRes,
    ] = await Promise.all([
      db.masterCity.findMany({ orderBy: [{ country: "asc" }, { name: "asc" }] }),
      db.masterConsultant.findMany({ orderBy: { name: "asc" } }),
      db.masterTaxSetting.findFirst({ where: { isActive: true }, orderBy: { effectiveFrom: "desc" } }),
      db.masterPricingLabel.findMany({ orderBy: { name: "asc" } }),
      db.masterPlace.findMany({ include: { city: true }, orderBy: { name: "asc" } }),
      db.masterHotel.findMany({ include: { city: true }, orderBy: { name: "asc" } }),
      db.masterFlightRoute.findMany({ orderBy: { sector: "asc" } }),
      db.masterAddOn.findMany({ orderBy: { name: "asc" } }),
      db.masterRestaurant.findMany({ orderBy: { name: "asc" } }),
      db.masterPolicyTemplate.findMany({ orderBy: { name: "asc" } }),
      db.masterTitleTemplate.findMany({ orderBy: { title: "asc" } }),
      db.masterBannerImage.findMany({ orderBy: { label: "asc" } }),
      getMasterPlaceDefaults(),
    ]);

    const defaultInc = placeDefaultsRes.data?.defaultInclusions || [];
    const defaultExc = placeDefaultsRes.data?.defaultExclusions || [];

    const places = placesRaw.map((p) => ({
      ...p,
      inclusions: Array.from(new Set([...defaultInc, ...(p.inclusions || [])])),
      exclusions: Array.from(new Set([...defaultExc, ...(p.exclusions || [])])),
      placeSpecificInclusions: p.inclusions || [],
      placeSpecificExclusions: p.exclusions || [],
    }));

    return {
      success: true,
      data: {
        cities,
        consultants,
        taxSetting: taxSetting || { currentTcsPercentage: 5.0 },
        pricingLabels,
        places,
        hotels,
        flightRoutes,
        addOns,
        restaurants,
        policyTemplates,
        titleTemplates,
        bannerImages,
        placeDefaults: placeDefaultsRes.data,
      },
    };
  } catch (err: any) {
    console.error("Error fetching master data for selectors:", err);
    return { success: false, error: err.message };
  }
}
