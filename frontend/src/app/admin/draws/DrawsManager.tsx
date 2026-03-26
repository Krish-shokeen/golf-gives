"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DrawRecord } from "./page";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  simulated: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function randomNumbers(): number[] {
  const nums = new Set<number>();
  while (nums.size < 5) nums.add(Math.floor(Math.random() * 45) + 1);
  return Array.from(nums).sort((a, b) => a - b);
}

export default function DrawsManager({ draws: initial }: { draws: DrawRecord[] }) {
  const [draws, setDraws] = useState<DrawRecord[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [mode, setMode] = useState<"random" | "algorithmic">("random");
  const [prizePool, setPrizePool] = useState("50000");
  const [jackpot, setJackpot] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const { data, error: err } = await supabase
      .from("draws")
      .insert({
        month,
        mode,
        drawn_numbers: randomNumbers(),
        status: "draft",
        prize_pool_total: Number(prizePool),
        jackpot_carried: Number(jackpot),
      })
      .select()
      .single();

    if (err) { setError(err.message); setSaving(false); return; }
    setDraws((prev) => [data as DrawRecord, ...prev]);
    setShowForm(false);
    setSaving(false);
  }

  async function updateStatus(id: string, status: "simulated" | "published") {
    const supabase = createClient();
    const updates: Record<string, unknown> = { status };
    if (status === "published") updates.published_at = new Date().toISOString();
    await supabase.from("draws").update(updates).eq("id", id);
    setDraws((prev) => prev.map((d) => d.id === id ? { ...d, ...updates } as DrawRecord : d));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this draw?")) return;
    const supabase = createClient();
    await supabase.from("draws").delete().eq("id", id);
    setDraws((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setShowForm((s) => !s)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
      >
        {showForm ? "Cancel" : "+ Schedule Draw"}
      </button>

      {showForm && (
        <form onSubmit={handleSchedule} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-lg">
          <h2 className="font-semibold text-gray-900">Schedule New Draw</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Draw Month (first day)</label>
              <input type="date" required value={month} onChange={(e) => setMonth(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Draw Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as "random" | "algorithmic")}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="random">Random</option>
                <option value="algorithmic">Algorithmic</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Prize Pool (₹)</label>
              <input type="number" min={0} required value={prizePool} onChange={(e) => setPrizePool(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Jackpot Carried (₹)</label>
              <input type="number" min={0} value={jackpot} onChange={(e) => setJackpot(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-xs text-gray-400">Drawn numbers are auto-generated randomly and can be updated before publishing.</p>

          <button type="submit" disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            {saving ? "Scheduling…" : "Schedule Draw"}
          </button>
        </form>
      )}

      {/* Draw list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">All Draws</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Numbers</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Prize Pool</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {draws.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No draws yet. Schedule one above.</td></tr>
              )}
              {draws.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {new Date(d.month).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-700">{d.mode}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(d.drawn_numbers ?? []).map((n) => (
                        <span key={n} className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">{n}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[d.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmt(Number(d.prize_pool_total))}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {d.status === "draft" && (
                        <button onClick={() => updateStatus(d.id, "simulated")} className="text-xs text-yellow-600 hover:underline font-medium">Simulate</button>
                      )}
                      {(d.status === "draft" || d.status === "simulated") && (
                        <button onClick={() => updateStatus(d.id, "published")} className="text-xs text-emerald-600 hover:underline font-medium">Publish</button>
                      )}
                      {d.status !== "published" && (
                        <button onClick={() => handleDelete(d.id)} className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
