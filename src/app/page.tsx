import { db } from "@/lib/db";
import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Query all itineraries
  const trips = await db.trip.findMany({
    orderBy: {
      createdAt: "desc",
    },
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
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E3B39] font-sans">
      <AdminDashboard initialTrips={JSON.parse(JSON.stringify(trips))} />
    </div>
  );
}
