import { createServerClient as createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function StatCard({ label, value, icon, sub }: { label: string; value: string | number; icon: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default async function AdminAnalyticsPage() {
  const supabase = createServiceClient();

  const [
    { count: totalUsers },
    { count: activeSubscribers },
    { data: draws },
    { data: winners },
    { data: charityProfiles },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("draws").select("id, month, mode, status, prize_pool_total, jackpot_carried, published_at").order("published_at", { ascending: false }).limit(5),
    supabase.from("draw_winners").select("prize_amount, payment_status, match_tier, verification_status"),
    supabase.from("profiles").select("charity_contribution_pct, charities(id, name)").not("charity_id", "is", null),
  ]);

  const totalPrizePool = (draws ?? []).reduce((s, d) => s + Number(d.prize_pool_total), 0);
  const totalPaidOut = (winners ?? []).filter(w => w.payment_status === "paid").reduce((s, w) => s + Number(w.prize_amount), 0);
  const pendingPayout = (winners ?? []).filter(w => w.payment_status === "pending").reduce((s, w) => s + Number(w.prize_amount), 0);

  // Charity breakdown
  type CharityRow = { id: string; name: string };
  const charityMap = new Map<string, { name: string; count: number; totalPct: number }>();
  for (const p of charityProfiles ?? []) {
    const c = (Array.isArray(p.charities) ? p.charities[0] : p.charities) as CharityRow | null;
    if (!c) continue;
    const existing = charityMap.get(c.id) ?? { name: c.name, count: 0, totalPct: 0 };
    charityMap.set(c.id, { name: c.name, count: existing.count + 1, totalPct: existing.totalPct + (p.charity_contribution_pct ?? 10) });
  }

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={totalUsers ?? 0} icon="👥" />
        <StatCard label="Active Subscribers" value={activeSubscribers ?? 0} icon="✅" />
        <StatCard label="Total Prize Pool" value={fmt(totalPrizePool)} icon="💰" />
        <StatCard label="Total Draws" value={(draws ?? []).length} icon="🎯" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Winners" value={(winners ?? []).length} icon="🏆" />
        <StatCard label="Total Paid Out" value={fmt(totalPaidOut)} icon="💸" />
        <StatCard label="Pending Payout" value={fmt(pendingPayout)} icon="⏳" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Winner Tiers</h2>
          {[5, 4, 3].map((tier) => {
            const count = (winners ?? []).filter(w => w.match_tier === tier).length;
            return (
              <div key={tier} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{tier}-Number Match</span>
                <span className="font-bold text-gray-900">{count}</span>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Charity Contributions</h2>
          {charityMap.size === 0 ? (
            <p className="text-sm text-gray-400">No charity data yet.</p>
          ) : (
            Array.from(charityMap.entries()).map(([id, c]) => (
              <div key={id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{c.name}</span>
                <span className="text-sm font-semibold text-emerald-600">{c.count} subscribers · avg {Math.round(c.totalPct / c.count)}%</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Recent Draws</h2>
        {(draws ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">No draws yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="pb-2 font-medium">Month</th>
              <th className="pb-2 font-medium">Mode</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium text-right">Prize Pool</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {(draws ?? []).map((d) => (
                <tr key={d.id}>
                  <td className="py-2 text-gray-900">{new Date(d.month).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</td>
                  <td className="py-2 capitalize text-gray-700">{d.mode}</td>
                  <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{d.status}</span></td>
                  <td className="py-2 text-right text-gray-700">{fmt(Number(d.prize_pool_total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
