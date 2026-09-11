import React from "react";
import { db } from "@/lib/db";
import { UnifiedDashboard } from "@/components/UnifiedDashboard";
import {
  getOverviewStats,
  getMasterCities,
  getMasterPlaces,
  getMasterConsultants,
  getMasterTaxSettings,
  getMasterPricingLabels,
  getMasterHotels,
  getMasterFlightRoutes,
  getMasterAddOns,
  getMasterRestaurants,
  getMasterPolicyTemplates,
  getMasterBannerImages,
  getTripsForCostCalculation,
  getMasterCostRates,
} from "@/actions/master-data";
import { getGeneralSettings } from "@/actions/settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "TripPlanner Workspace | Unified Operations Dashboard",
  description: "Unified travel agency operations for master data, proposals, cost engine, and performance analytics.",
};

export default async function HomePage() {
  let tripsRes: any[] = [];
  let statsRes: any = { success: false, data: null };
  let citiesRes: any = { success: false, data: [] };
  let placesRes: any = { success: false, data: [] };
  let consultantsRes: any = { success: false, data: [] };
  let taxRes: any = { success: false, data: [] };
  let pricingRes: any = { success: false, data: [] };
  let hotelsRes: any = { success: false, data: [] };
  let flightsRes: any = { success: false, data: [] };
  let addonsRes: any = { success: false, data: [] };
  let restaurantsRes: any = { success: false, data: [] };
  let policiesRes: any = { success: false, data: [] };
  let bannersRes: any = { success: false, data: [] };
  let tripsCostRes: any = { success: false, data: [] };
  let costRatesRes: any = { success: false, data: [] };
  let settingsRes: any = { success: false, data: null };

  try {
    [
      tripsRes,
      statsRes,
      citiesRes,
      placesRes,
      consultantsRes,
      taxRes,
      pricingRes,
      hotelsRes,
      flightsRes,
      addonsRes,
      restaurantsRes,
      policiesRes,
      bannersRes,
      tripsCostRes,
      costRatesRes,
      settingsRes,
    ] = await Promise.all([
      db.trip.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          destination: true,
          departureCity: true,
          startDate: true,
          endDate: true,
          durationDays: true,
          durationNights: true,
          numTravellers: true,
          consultantName: true,
          updatedAt: true,
        },
      }).catch((e) => {
        console.error("Error fetching trips:", e.message);
        return [];
      }),
      getOverviewStats().catch(() => ({ success: false, data: null })),
      getMasterCities().catch(() => ({ success: false, data: [] })),
      getMasterPlaces().catch(() => ({ success: false, data: [] })),
      getMasterConsultants().catch(() => ({ success: false, data: [] })),
      getMasterTaxSettings().catch(() => ({ success: false, data: [] })),
      getMasterPricingLabels().catch(() => ({ success: false, data: [] })),
      getMasterHotels().catch(() => ({ success: false, data: [] })),
      getMasterFlightRoutes().catch(() => ({ success: false, data: [] })),
      getMasterAddOns().catch(() => ({ success: false, data: [] })),
      getMasterRestaurants().catch(() => ({ success: false, data: [] })),
      getMasterPolicyTemplates().catch(() => ({ success: false, data: [] })),
      getMasterBannerImages().catch(() => ({ success: false, data: [] })),
      getTripsForCostCalculation().catch(() => ({ success: false, data: [] })),
      getMasterCostRates().catch(() => ({ success: false, data: [] })),
      getGeneralSettings().catch(() => ({ success: false, data: null })),
    ]);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }

  return (
    <UnifiedDashboard
      defaultView="console"
      initialTrips={JSON.parse(JSON.stringify(tripsRes || []))}
      overviewStats={
        statsRes.data || {
          totalTrips: 0,
          tripsThisMonth: 0,
          totalMasterRecords: 0,
          avgMargin: 24.5,
          chartData: [],
        }
      }
      cities={citiesRes.data || []}
      places={placesRes.data || []}
      consultants={consultantsRes.data || []}
      taxSettings={taxRes.data || []}
      pricingLabels={pricingRes.data || []}
      hotels={hotelsRes.data || []}
      flightRoutes={flightsRes.data || []}
      addOns={addonsRes.data || []}
      restaurants={restaurantsRes.data || []}
      policyTemplates={policiesRes.data || []}
      bannerImages={bannersRes.data || []}
      tripsForCost={tripsCostRes.data || []}
      costRates={costRatesRes.data || []}
      generalSettings={settingsRes.data}
      placeDefaults={placesRes.placeDefaults}
    />
  );
}
