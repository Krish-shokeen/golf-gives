import { createServerClient as createServiceClient } from "@/lib/supabase/server";
import WinnersManager from "./WinnersManager";

export default async function AdminWinnersPage() {
  const supabase = createServiceClient();
  const { data: winners } = await supabase
    .from("draw_winners")
    .select("id, match_tier, prize_amount, verification_status, payment_status, proof_url, created_at, profiles(full_name, email), draws(month)")
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeWinners = (winners ?? []) as any[];

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Winners</h1>
      <WinnersManager initialWinners={safeWinners} />
    </div>
  );
}
