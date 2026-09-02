import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface EditTripPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditTripPage() {
  redirect("/");
}

