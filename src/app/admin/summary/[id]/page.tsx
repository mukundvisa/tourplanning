import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DayWiseTripSummary } from "@/components/admin/DayWiseTripSummary";

export const dynamic = "force-dynamic";

interface AdminTripSummaryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: AdminTripSummaryPageProps) {
  const { id } = await params;
  const trip = await db.trip.findUnique({
    where: { id },
    select: { title: true, destination: true },
  });

  return {
    title: trip ? `Trip Summary - ${trip.title} | Admin Portal` : "Admin Trip Summary",
    description: "Complete Day-by-Day operational overview for admin travel operations.",
  };
}

export default async function AdminTripSummaryPage({ params }: AdminTripSummaryPageProps) {
  const { id } = await params;

  const trip = await db.trip.findUnique({
    where: { id },
    include: {
      priceQuoteItems: {
        orderBy: { sortOrder: "asc" },
      },
      tripFinancials: true,
      itineraryDays: {
        orderBy: { dayNumber: "asc" },
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
      costCalculation: true,
    },
  });

  if (!trip) {
    notFound();
  }

  // De-serialize dates to standard JSON strings
  const serialized = JSON.parse(JSON.stringify(trip));

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <DayWiseTripSummary trip={serialized} />
    </div>
  );
}
