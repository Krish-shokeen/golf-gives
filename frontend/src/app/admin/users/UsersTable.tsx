"use client";

import type { AdminUser } from "./page";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  past_due: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
  lapsed: "bg-gray-100 text-gray-600",
};

export default function UsersTable({ users }: { users: AdminUser[] }) {
  if (users.length === 0) return <p className="text-gray-400 text-sm">No users yet.</p>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3 font-medium">Name / Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Subscription</th>
              <th className="px-5 py-3 font-medium">Charity %</th>
              <th className="px-5 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{u.full_name ?? "—"}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {u.subscription ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[u.subscription.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {u.subscription.status} · {u.subscription.plan ?? "—"}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">No subscription</span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-700">{u.charity_contribution_pct}%</td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {new Date(u.created_at).toLocaleDateString("en-GB")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
