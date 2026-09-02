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
  const [
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
    }),
    getOverviewStats(),
    getMasterCities(),
    getMasterPlaces(),
    getMasterConsultants(),
    getMasterTaxSettings(),
    getMasterPricingLabels(),
    getMasterHotels(),
    getMasterFlightRoutes(),
    getMasterAddOns(),
    getMasterRestaurants(),
    getMasterPolicyTemplates(),
    getMasterBannerImages(),
    getTripsForCostCalculation(),
    getMasterCostRates(),
    getGeneralSettings(),
  ]);

  return (
    <UnifiedDashboard
      defaultView="console"
      initialTrips={JSON.parse(JSON.stringify(tripsRes))}
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
    />
  );
}
