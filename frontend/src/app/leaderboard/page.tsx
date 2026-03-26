import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createServerClient as createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import LeaderboardClient from "./LeaderboardClient";

export const dynamic = "force-dynamic";

interface LeaderboardEntry {
  position: number;
  userId: string;
  name: string;
  bestScore: number;
}

export default async function LeaderboardPage() {
  const cookieStore = await cookies();
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const [{ data: { user } }, scoresResult] = await Promise.all([
    anonClient.auth.getUser(),
    // Use service role to read all users' scores (bypasses RLS)
    createServiceClient()
      .from("scores")
      .select("user_id, score, profiles(full_name, email)")
      .order("score", { ascending: false }),
  ]);

  // Aggregate: best score per user
  const seen = new Set<string>();
  const leaderboard: LeaderboardEntry[] = [];

  for (const row of scoresResult.data ?? []) {
    if (seen.has(row.user_id)) continue;
    seen.add(row.user_id);

    type ProfileRow = { full_name: string | null; email: string };
    const profile = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as ProfileRow | null;
    const name = profile?.full_name ?? profile?.email?.split("@")[0] ?? "Anonymous";

    leaderboard.push({ position: leaderboard.length + 1, userId: row.user_id, name, bestScore: row.score });
    if (leaderboard.length >= 20) break;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">⛳</span>
            <span className="font-bold text-lg tracking-tight text-emerald-700">GolfGives</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/charities" className="hidden sm:block text-sm text-gray-500 hover:text-gray-800 transition-colors">Charities</Link>
            {user ? (
              <Link href="/dashboard" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full transition-colors">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full transition-colors">
                Log in
              </Link>
            )}
          </div>
        </div>
      </nav>

      <LeaderboardClient leaderboard={leaderboard} currentUserId={user?.id ?? null} />
    </div>
  );
}
