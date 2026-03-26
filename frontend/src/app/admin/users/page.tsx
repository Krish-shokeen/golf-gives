import { createServerClient as createServiceClient } from "@/lib/supabase/server";
import UsersTable from "./UsersTable";

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  charity_contribution_pct: number;
  created_at: string;
  subscription: { status: string; plan: string | null; current_period_end: string | null } | null;
}

export default async function AdminUsersPage() {
  const supabase = createServiceClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, charity_contribution_pct, created_at")
    .order("created_at", { ascending: false });

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("user_id, status, plan, current_period_end")
    .order("created_at", { ascending: false });

  const subMap = new Map<string, { status: string; plan: string | null; current_period_end: string | null }>();
  for (const s of subscriptions ?? []) {
    if (!subMap.has(s.user_id)) subMap.set(s.user_id, { status: s.status, plan: s.plan, current_period_end: s.current_period_end });
  }

  const users: AdminUser[] = (profiles ?? []).map((p) => ({
    ...p,
    subscription: subMap.get(p.id) ?? null,
  }));

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <span className="text-sm text-gray-500">{users.length} total</span>
      </div>
      <UsersTable users={users} />
    </div>
  );
}
