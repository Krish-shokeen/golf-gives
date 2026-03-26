"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AdminLogout() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full text-left rounded-xl px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
    >
      Sign out
    </button>
  );
}
