import { db } from "@/lib/db";
import { TripFormWizard } from "@/components/TripFormWizard";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface EditTripPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditTripPage({ params }: EditTripPageProps) {
  const { id } = await params;

  // Retrieve complete trip object with relations
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
    notFound();
  }

  // De-serialize dates to standard JSON strings
  const serialized = JSON.parse(JSON.stringify(trip));

  return <TripFormWizard initialData={serialized} tripId={id} />;
}
