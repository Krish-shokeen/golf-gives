import { createServerClient as createServiceClient } from "@/lib/supabase/server";
import DrawsManager from "./DrawsManager";

export interface DrawRecord {
  id: string;
  month: string;
  mode: string;
  drawn_numbers: number[];
  status: string;
  prize_pool_total: number;
  jackpot_carried: number;
  published_at: string | null;
  created_at: string;
}

export default async function AdminDrawsPage() {
  const supabase = createServiceClient();
  const { data: draws } = await supabase
    .from("draws")
    .select("id, month, mode, drawn_numbers, status, prize_pool_total, jackpot_carried, published_at, created_at")
    .order("month", { ascending: false });

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Draws</h1>
      <DrawsManager draws={(draws ?? []) as DrawRecord[]} />
    </div>
  );
}
