import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServerClient();

  // Get each user's best (highest) score and their profile name
  // We join scores → profiles and aggregate max score per user
  const { data, error } = await supabase
    .from("scores")
    .select("user_id, score, profiles(full_name, email)")
    .order("score", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate: keep only the best score per user
  const seen = new Set<string>();
  const leaderboard: { position: number; userId: string; name: string; bestScore: number }[] = [];

  for (const row of data ?? []) {
    if (seen.has(row.user_id)) continue;
    seen.add(row.user_id);

    type ProfileRow = { full_name: string | null; email: string };
    const profile = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as ProfileRow | null;
    const name = profile?.full_name ?? profile?.email?.split("@")[0] ?? "Anonymous";

    leaderboard.push({
      position: leaderboard.length + 1,
      userId: row.user_id,
      name,
      bestScore: row.score,
    });

    if (leaderboard.length >= 20) break;
  }

  return NextResponse.json({ leaderboard });
}
