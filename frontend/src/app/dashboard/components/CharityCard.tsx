/**
 * CharityCard — displays selected charity and contribution percentage.
 * Requirement 8.3
 */

import type { DashboardData } from "../page";

interface Props {
  charity: DashboardData["charity"];
}

export default function CharityCard({ charity }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">💚</span>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Charity</h2>
      </div>

      {charity.name ? (
        <>
          <div className="flex items-center gap-3 mb-3">
            {charity.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={charity.imageUrl} alt={charity.name} className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-sm" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl">💚</div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{charity.name}</p>
              <p className="text-xs text-gray-400">Your chosen charity</p>
            </div>
          </div>
          <div className="bg-emerald-50 rounded-xl px-4 py-2.5 mt-3">
            <p className="text-sm text-gray-600">
              Contributing <span className="font-bold text-emerald-600 text-base">{charity.contributionPct}%</span> of your subscription
            </p>
          </div>
        </>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-3">No charity selected yet.</p>
          <a href="/charities" className="inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700 underline">
            Browse charities →
          </a>
        </div>
      )}

      <a href="/charities" className="inline-block mt-4 text-xs text-gray-400 hover:text-gray-600 underline">
        Change charity
      </a>
    </div>
  );
}
