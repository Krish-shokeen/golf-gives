/**
 * /dashboard — User Dashboard Page (Server Component)
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import DashboardShell from "./components/DashboardShell";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardData {
  user: { email: string; fullName: string | null };
  subscription: { status: string; plan: string | null; renewalDate: string | null };
  scores: Array<{ id: string; score: number; played_on: string; created_at: string }>;
  charity: { id: string | null; name: string | null; imageUrl: string | null; contributionPct: number };
  draws: {
    drawsEntered: number;
    upcomingDraws: Array<{ id: string; month: string; mode: string; status: string; prizePoolTotal: number; jackpotCarried: number }>;
  };
  winnings: { totalWon: number; latestPaymentStatus: string | null; latestVerificationStatus: string | null; winCount: number };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Redirect admins to their panel
  const { createServerClient: createServiceClient } = await import("@/lib/supabase/server");
  const { data: roleCheck } = await createServiceClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (roleCheck?.role === "admin") redirect("/admin");

  const userId = user.id;

  const [subResult, scoresResult, profileResult, winnersResult, drawsResult] = await Promise.all([
    supabase.from("subscriptions").select("status, plan, current_period_end").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("scores").select("id, score, played_on, created_at").eq("user_id", userId).order("played_on", { ascending: false }).limit(5),
    supabase.from("profiles").select("full_name, charity_contribution_pct, charities(id, name, image_url)").eq("id", userId).maybeSingle(),
    supabase.from("draw_winners").select("prize_amount, payment_status, verification_status, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("draws").select("id, month, mode, status, prize_pool_total, jackpot_carried").in("status", ["draft", "simulated"]).order("month", { ascending: true }).limit(3),
  ]);

  const subscription = subResult.data
    ? { status: subResult.data.status, plan: subResult.data.plan, renewalDate: subResult.data.current_period_end ?? null }
    : { status: "inactive", plan: null, renewalDate: null };

  const profile = profileResult.data;
  type CharityRow = { id: string; name: string; image_url: string | null };
  const rawCharity = profile?.charities as CharityRow | CharityRow[] | null | undefined;
  const charityData: CharityRow | null = Array.isArray(rawCharity) ? (rawCharity[0] ?? null) : (rawCharity ?? null);
  const charity = charityData
    ? { id: charityData.id, name: charityData.name, imageUrl: charityData.image_url, contributionPct: profile?.charity_contribution_pct ?? 10 }
    : { id: null, name: null, imageUrl: null, contributionPct: profile?.charity_contribution_pct ?? 10 };

  const winnerRecords = winnersResult.data ?? [];
  const upcomingDraws = drawsResult.data ?? [];
  const latestWin = winnerRecords[0] ?? null;

  const data: DashboardData = {
    user: { email: user.email ?? "", fullName: profile?.full_name ?? null },
    subscription,
    scores: scoresResult.data ?? [],
    charity,
    draws: {
      drawsEntered: winnerRecords.length,
      upcomingDraws: upcomingDraws.map((d) => ({ id: d.id, month: d.month, mode: d.mode, status: d.status, prizePoolTotal: d.prize_pool_total, jackpotCarried: d.jackpot_carried })),
    },
    winnings: {
      totalWon: winnerRecords.reduce((s, w) => s + Number(w.prize_amount), 0),
      latestPaymentStatus: latestWin?.payment_status ?? null,
      latestVerificationStatus: latestWin?.verification_status ?? null,
      winCount: winnerRecords.length,
    },
  };

  return <DashboardShell data={data} />;
}
