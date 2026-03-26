import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServerClient as createSsrClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Verify the user is authenticated
  const cookieStore = await cookies();
  const ssrClient = createSsrClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await ssrClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan, paymentId } = await req.json() as { plan: string; paymentId: string };

  if (!plan || !["monthly", "yearly"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Use service role to bypass RLS
  const supabase = createServerClient();

  const periodEnd = plan === "yearly"
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Delete any existing subscription rows for this user first, then insert fresh
  await supabase.from("subscriptions").delete().eq("user_id", user.id);

  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    plan,
    status: "active",
    razorpay_subscription_id: paymentId,
    current_period_end: periodEnd,
  });

  if (error) {
    console.error("Failed to record subscription:", error);
    return NextResponse.json({ error: "Failed to record subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
