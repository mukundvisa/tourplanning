import React from "react";
import { MasterDataHub } from "@/components/master-data/MasterDataHub";
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
  getMasterTitleTemplates,
  getMasterBannerImages,
  getTripsForCostCalculation,
  getMasterCostRates,
} from "@/actions/master-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Master Data Management | TripCraft Workspace",
  description: "Centralized configuration of cities, hotels, flight routes, activities, and internal margins.",
};

export default async function MasterDataPage() {
  const [
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
    titlesRes,
    bannersRes,
    tripsCostRes,
    costRatesRes,
  ] = await Promise.all([
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
    getMasterTitleTemplates(),
    getMasterBannerImages(),
    getTripsForCostCalculation(),
    getMasterCostRates(),
  ]);

  return (
    <MasterDataHub
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
      titleTemplates={titlesRes.data || []}
      bannerImages={bannersRes.data || []}
      tripsForCost={tripsCostRes.data || []}
      costRates={costRatesRes.data || []}
    />
  );
}
