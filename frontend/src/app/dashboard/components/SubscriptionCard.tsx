/**
 * SubscriptionCard — displays subscription status and renewal date.
 * Requirement 8.1
 */

import type { DashboardData } from "../page";

interface Props {
  subscription: DashboardData["subscription"];
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  past_due: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  lapsed: "bg-gray-100 text-gray-600",
  inactive: "bg-gray-100 text-gray-600",
};

export default function SubscriptionCard({ subscription }: Props) {
  const badgeClass = STATUS_STYLES[subscription.status] ?? STATUS_STYLES.inactive;

  const renewalLabel = subscription.renewalDate
    ? new Date(subscription.renewalDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">💳</span>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Subscription</h2>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${badgeClass}`}>
          {subscription.status}
        </span>
        {subscription.plan && (
          <span className="text-sm text-gray-500 capitalize">{subscription.plan} plan</span>
        )}
      </div>

      {renewalLabel ? (
        <p className="text-sm text-gray-600">
          Renews on <span className="font-medium text-gray-900">{renewalLabel}</span>
        </p>
      ) : subscription.status !== "active" ? (
        <a href="/subscribe" className="inline-block mt-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 underline">
          Subscribe to participate in draws →
        </a>
      ) : null}
    </div>
  );
}
