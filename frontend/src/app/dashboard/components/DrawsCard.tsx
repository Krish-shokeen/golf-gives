/**
 * DrawsCard — draw participation summary and upcoming draws.
 * Requirement 8.4
 */

import Link from "next/link";
import type { DashboardData } from "../page";

interface Props {
  draws: DashboardData["draws"];
}

export default function DrawsCard({ draws }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🎯</span>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Draws</h2>
      </div>

      <p className="text-3xl font-bold text-gray-900 mb-1">{draws.drawsEntered}</p>
      <p className="text-sm text-gray-500 mb-5">draws entered</p>

      {draws.upcomingDraws.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Upcoming</p>
          <ul className="space-y-2 mb-4">
            {draws.upcomingDraws.map((draw) => {
              const month = new Date(draw.month).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
              const pool = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(draw.prizePoolTotal + draw.jackpotCarried);
              return (
                <li key={draw.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">{month}</span>
                  <span className="text-emerald-600 font-semibold">{pool}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-4">No upcoming draws scheduled.</p>
      )}

      <Link href="/draws" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
        View all draws →
      </Link>
    </div>
  );
}
