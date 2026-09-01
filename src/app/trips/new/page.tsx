import React from "react";
import { db } from "@/lib/db";
import { UnifiedDashboard } from "@/components/UnifiedDashboard";
import {
  getOverviewStats,
  getMasterCities,
  getMasterConsultants,
  getMasterTaxSettings,
  getMasterPricingLabels,
  getMasterActivities,
  getMasterHotels,
  getMasterFlightRoutes,
  getMasterAddOns,
  getMasterRestaurants,
  getMasterPolicyTemplates,
  getMasterBannerImages,
  getTripsForCostCalculation,
  getMasterCostRates,
} from "@/actions/master-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create Trip Blueprint | TripCraft Workspace",
  description: "Draft, customize, and export client itineraries within the unified workspace.",
};

export default async function NewTripPage() {
  const [
    tripsRes,
    statsRes,
    citiesRes,
    consultantsRes,
    taxRes,
    pricingRes,
    activitiesRes,
    hotelsRes,
    flightsRes,
    addonsRes,
    restaurantsRes,
    policiesRes,
    bannersRes,
    tripsCostRes,
    costRatesRes,
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
    getMasterConsultants(),
    getMasterTaxSettings(),
    getMasterPricingLabels(),
    getMasterActivities(),
    getMasterHotels(),
    getMasterFlightRoutes(),
    getMasterAddOns(),
    getMasterRestaurants(),
    getMasterPolicyTemplates(),
    getMasterBannerImages(),
    getTripsForCostCalculation(),
    getMasterCostRates(),
  ]);

  return (
    <UnifiedDashboard
      defaultView="create"
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
      consultants={consultantsRes.data || []}
      taxSettings={taxRes.data || []}
      pricingLabels={pricingRes.data || []}
      activities={activitiesRes.data || []}
      hotels={hotelsRes.data || []}
      flightRoutes={flightsRes.data || []}
      addOns={addonsRes.data || []}
      restaurants={restaurantsRes.data || []}
      policyTemplates={policiesRes.data || []}
      bannerImages={bannersRes.data || []}
      tripsForCost={tripsCostRes.data || []}
      costRates={costRatesRes.data || []}
    />
  );
}
