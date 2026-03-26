import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createServerClient as createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminLogout from "./AdminLogout";

const NAV_LINKS = [
  { href: "/admin", label: "📊 Analytics", exact: true },
  { href: "/admin/users", label: "👥 Users" },
  { href: "/admin/draws", label: "🎯 Draws" },
  { href: "/admin/charities", label: "💚 Charities" },
  { href: "/admin/winners", label: "🏆 Winners" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  // Check admin role via service client
  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-60 bg-white border-b md:border-b-0 md:border-r border-gray-100 shadow-sm flex flex-row md:flex-col py-3 md:py-8 px-4 gap-1 md:shrink-0 overflow-x-auto md:overflow-visible">
        <div className="hidden md:flex items-center gap-2 px-3 mb-6">
          <span className="text-xl">⛳</span>
          <span className="font-bold text-emerald-700">GolfGives Admin</span>
        </div>
        <div className="flex flex-row md:flex-col gap-1 w-full">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors whitespace-nowrap">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="hidden md:block mt-auto pt-6 border-t border-gray-100">
          <AdminLogout />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
