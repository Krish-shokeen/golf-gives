import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSsrClient } from "@supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

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

// PUT /api/scores/[id] — update an existing score
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { score, played_on } = await req.json() as { score?: number; played_on?: string };

  if (!score || score < 1 || score > 45) {
    return NextResponse.json({ error: "Score must be between 1 and 45" }, { status: 400 });
  }
  if (!played_on) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("scores")
    .update({ score, played_on })
    .eq("id", id)
    .eq("user_id", user.id); // ensure ownership

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return updated list
  const { data: updated } = await supabase
    .from("scores")
    .select("id, score, played_on, created_at")
    .eq("user_id", user.id)
    .order("played_on", { ascending: false })
    .limit(5);

  return NextResponse.json({ scores: updated ?? [] });
}
