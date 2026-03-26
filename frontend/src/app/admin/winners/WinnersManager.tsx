"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Winner {
  id: string; match_tier: number; prize_amount: number;
  verification_status: string; payment_status: string;
  proof_url: string | null; created_at: string;
  profiles: { full_name: string | null; email: string } | null;
  draws: { month: string } | null;
}

const V_STYLES: Record<string, string> = {
  pending_proof: "bg-gray-100 text-gray-600",
  pending_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};
const P_STYLES: Record<string, string> = {
  unpaid: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
};

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function WinnersManager({ initialWinners }: { initialWinners: Winner[] }) {
  const [winners, setWinners] = useState(initialWinners);

  async function updateVerification(id: string, status: "approved" | "rejected") {
    const supabase = createClient();
    const updates: Record<string, string> = { verification_status: status };
    if (status === "approved") updates.payment_status = "pending";
    await supabase.from("draw_winners").update(updates).eq("id", id);
    setWinners((prev) => prev.map((w) => w.id === id ? { ...w, ...updates } : w));
  }

  async function markPaid(id: string) {
    const supabase = createClient();
    await supabase.from("draw_winners").update({ payment_status: "paid" }).eq("id", id);
    setWinners((prev) => prev.map((w) => w.id === id ? { ...w, payment_status: "paid" } : w));
  }

  if (winners.length === 0) return <p className="text-gray-400 text-sm">No winners yet.</p>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
            <th className="px-5 py-3 font-medium">Winner</th>
            <th className="px-5 py-3 font-medium">Draw</th>
            <th className="px-5 py-3 font-medium">Tier</th>
            <th className="px-5 py-3 font-medium">Prize</th>
            <th className="px-5 py-3 font-medium">Verification</th>
            <th className="px-5 py-3 font-medium">Payment</th>
            <th className="px-5 py-3 font-medium">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {winners.map((w) => {
              const profile = Array.isArray(w.profiles) ? w.profiles[0] : w.profiles;
              const draw = Array.isArray(w.draws) ? w.draws[0] : w.draws;
              return (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{profile?.full_name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{profile?.email}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-700 text-xs">
                    {draw ? new Date(draw.month).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-5 py-3 font-semibold text-gray-900">{w.match_tier}-Match</td>
                  <td className="px-5 py-3 font-semibold text-emerald-700">{fmt(Number(w.prize_amount))}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${V_STYLES[w.verification_status] ?? ""}`}>
                      {w.verification_status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${P_STYLES[w.payment_status] ?? ""}`}>
                      {w.payment_status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {w.verification_status === "pending_review" && (
                        <>
                          <button onClick={() => updateVerification(w.id, "approved")} className="text-xs text-green-600 hover:underline font-medium">Approve</button>
                          <button onClick={() => updateVerification(w.id, "rejected")} className="text-xs text-red-500 hover:underline font-medium">Reject</button>
                        </>
                      )}
                      {w.payment_status === "pending" && (
                        <button onClick={() => markPaid(w.id)} className="text-xs text-emerald-600 hover:underline font-medium">Mark Paid</button>
                      )}
                      {w.proof_url && (
                        <a href={w.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">View Proof</a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
