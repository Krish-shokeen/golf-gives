import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createServerClient as createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface DrawWinner { user_id: string; match_tier: number; prize_amount: number; verification_status: string; payment_status: string }
interface Draw { id: string; month: string; mode: string; drawn_numbers: number[]; prize_pool_total: number; jackpot_carried: number; published_at: string | null; status: string; draw_winners: DrawWinner[] }

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const TIER_LABEL: Record<number, string> = { 5: "🥇 Jackpot (5-Match)", 4: "🥈 4-Match", 3: "🥉 3-Match" };

export default async function DrawsPage() {
  const cookieStore = await cookies();
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login?redirectTo=/draws");

  const supabase = createServiceClient();
  const { data: allDraws } = await supabase
    .from("draws")
    .select("id, month, mode, drawn_numbers, prize_pool_total, jackpot_carried, published_at, status, draw_winners(user_id, match_tier, prize_amount, verification_status, payment_status)")
    .in("status", ["published", "draft", "simulated"])
    .order("month", { ascending: false });

  const typedDraws = (allDraws ?? []) as unknown as Draw[];
  const upcoming = typedDraws.filter((d) => d.status !== "published");
  const past = typedDraws.filter((d) => d.status === "published");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
          <span className="font-bold text-emerald-700">GolfGives</span>
          <div className="w-20" />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div>
          <p className="text-xs font-semibold tracking-widest text-emerald-600 uppercase mb-1">Draws</p>
          <h1 className="text-3xl font-extrabold text-gray-900">Monthly Draws 🎯</h1>
          <p className="text-gray-500 text-sm mt-1">View upcoming draws and your past results.</p>
        </div>

        {/* Upcoming */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming Draws</h2>
          {upcoming.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-sm">No upcoming draws scheduled yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map((draw) => {
                const month = new Date(draw.month).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
                const totalPool = Number(draw.prize_pool_total) + Number(draw.jackpot_carried);
                return (
                  <div key={draw.id} className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{month}</h3>
                        <p className="text-xs text-gray-400 capitalize mt-0.5">{draw.mode} draw</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold text-emerald-600">{fmt(totalPool)}</p>
                        <p className="text-xs text-gray-400">prize pool</p>
                      </div>
                    </div>
                    {Number(draw.jackpot_carried) > 0 && (
                      <div className="mt-3 bg-amber-50 rounded-xl px-4 py-2 text-xs text-amber-700 font-medium">
                        🔥 Includes {fmt(Number(draw.jackpot_carried))} rolled over jackpot
                      </div>
                    )}
                    <div className="mt-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${draw.status === "simulated" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                        {draw.status === "simulated" ? "Simulated — awaiting publish" : "Scheduled"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Past */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Past Draws</h2>
          {past.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">🎯</p>
              <p className="text-sm">No draws published yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {past.map((draw) => {
                const myWin = draw.draw_winners.find((w) => w.user_id === user.id);
                const month = new Date(draw.month).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
                const totalPool = Number(draw.prize_pool_total) + Number(draw.jackpot_carried);
                const allWinners = draw.draw_winners.length;
                return (
                  <div key={draw.id} className={`bg-white rounded-2xl border shadow-sm p-6 ${myWin ? "border-emerald-300 ring-1 ring-emerald-200" : "border-gray-100"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">{month}</h3>
                          {myWin && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">You won!</span>}
                        </div>
                        <p className="text-xs text-gray-400 capitalize">
                          {draw.mode} draw · {allWinners} winner{allWinners !== 1 ? "s" : ""} · {fmt(totalPool)} pool
                        </p>
                      </div>
                      {draw.published_at && (
                        <p className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(draw.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Drawn Numbers</p>
                      <div className="flex gap-2 flex-wrap">
                        {draw.drawn_numbers.map((n) => (
                          <span key={n} className="w-10 h-10 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center shadow-sm">{n}</span>
                        ))}
                      </div>
                    </div>

                    {myWin ? (
                      <div className="mt-4 bg-emerald-50 rounded-xl px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-emerald-800">{TIER_LABEL[myWin.match_tier]}</p>
                          <p className="text-xs text-emerald-600 mt-0.5">Prize: {fmt(Number(myWin.prize_amount))} · {myWin.payment_status}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${myWin.verification_status === "approved" ? "bg-green-100 text-green-700" : myWin.verification_status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {myWin.verification_status.replace("_", " ")}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-gray-400">You didn&apos;t win this draw.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
