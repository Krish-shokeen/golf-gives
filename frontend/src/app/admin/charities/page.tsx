import { createServerClient as createServiceClient } from "@/lib/supabase/server";
import CharitiesManager from "./CharitiesManager";

export default async function AdminCharitiesPage() {
  const supabase = createServiceClient();
  const { data: charities } = await supabase
    .from("charities")
    .select("id, name, description, image_url, is_featured, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Charities</h1>
        <span className="text-sm text-gray-500">{(charities ?? []).length} total</span>
      </div>
      <CharitiesManager initialCharities={charities ?? []} />
    </div>
  );
}
