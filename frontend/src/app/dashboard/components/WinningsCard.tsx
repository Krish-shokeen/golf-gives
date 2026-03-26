/**
 * WinningsCard — total winnings and latest payment status.
 * Requirement 8.5
 */

import type { DashboardData } from "../page";

interface Props {
  winnings: DashboardData["winnings"];
}

const PAYMENT_LABELS: Record<string, { label: string; className: string }> = {
  unpaid: { label: "Unpaid", className: "text-gray-500" },
  pending: { label: "Pending payout", className: "text-yellow-600" },
  paid: { label: "Paid", className: "text-green-600" },
};

const VERIFICATION_LABELS: Record<string, string> = {
  pending_proof: "Awaiting proof upload",
  pending_review: "Under review",
  approved: "Approved",
  rejected: "Rejected — resubmit proof",
};

export default function WinningsCard({ winnings }: Props) {
  const formattedTotal = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(winnings.totalWon);

  const paymentInfo = winnings.latestPaymentStatus
    ? PAYMENT_LABELS[winnings.latestPaymentStatus]
    : null;

  const verificationLabel = winnings.latestVerificationStatus
    ? VERIFICATION_LABELS[winnings.latestVerificationStatus]
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Winnings
      </h2>

      <p className="text-3xl font-bold text-gray-900 mb-1">{formattedTotal}</p>
      <p className="text-sm text-gray-500 mb-4">
        across {winnings.winCount} {winnings.winCount === 1 ? "win" : "wins"}
      </p>

      {paymentInfo && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Latest win status
          </p>
          <p className={`text-sm font-medium ${paymentInfo.className}`}>{paymentInfo.label}</p>
          {verificationLabel && winnings.latestVerificationStatus !== "approved" && (
            <p className="text-xs text-gray-400 mt-1">{verificationLabel}</p>
          )}
        </div>
      )}

      {winnings.winCount === 0 && (
        <p className="text-sm text-gray-400">No wins yet — keep playing!</p>
      )}
    </div>
  );
}
