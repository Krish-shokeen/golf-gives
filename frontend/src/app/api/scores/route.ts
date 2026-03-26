import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSsrClient } from "@supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

async function getUser() {
  const cookieStore = await cookies();
  const ssrClient = createSsrClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  return user;
}

// GET /api/scores — return user's scores ordered by date desc
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scores")
    .select("id, score, played_on, created_at")
    .eq("user_id", user.id)
    .order("played_on", { ascending: false })
    .limit(5);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scores: data });
}

// POST /api/scores — add a new score, enforce rolling 5-window
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { score, played_on } = await req.json() as { score?: number; played_on?: string };

  if (!score || score < 1 || score > 45) {
    return NextResponse.json({ error: "Score must be between 1 and 45" }, { status: 400 });
  }
  if (!played_on) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get current scores count
  const { data: existing } = await supabase
    .from("scores")
    .select("id, played_on")
    .eq("user_id", user.id)
    .order("played_on", { ascending: true });

  const current = existing ?? [];

  // If already 5 scores, delete the oldest before inserting
  if (current.length >= 5) {
    await supabase.from("scores").delete().eq("id", current[0].id);
  }

  const { error: insertError } = await supabase
    .from("scores")
    .insert({ user_id: user.id, score, played_on });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Return updated list
  const { data: updated } = await supabase
    .from("scores")
    .select("id, score, played_on, created_at")
    .eq("user_id", user.id)
    .order("played_on", { ascending: false })
    .limit(5);

  return NextResponse.json({ scores: updated ?? [] }, { status: 201 });
}
