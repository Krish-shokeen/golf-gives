"use client";

/**
 * /charities — Charity Directory Page
 * Queries Supabase directly (no backend required).
 * Requirements: 6.5, 6.6, 6.7
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface Charity {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_featured: boolean;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.07, ease: "easeOut" } }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

export default function CharitiesPage() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "featured">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check auth state for nav
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session));
  }, []);

  const fetchCharities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      let query = supabase.from("charities").select("id, name, description, image_url, is_featured").order("is_featured", { ascending: false }).order("name");

      if (filter === "featured") query = query.eq("is_featured", true);
      if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);

      const { data, error: dbError } = await query;
      if (dbError) throw dbError;
      setCharities(data ?? []);
    } catch {
      setError("Could not load charities. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const t = setTimeout(fetchCharities, 300);
    return () => clearTimeout(t);
  }, [fetchCharities]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-white text-gray-900">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">⛳</span>
            <span className="font-bold text-lg tracking-tight text-emerald-700">GolfGives</span>
          </Link>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full transition-colors">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Log in</Link>
                <Link href="/subscribe" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full transition-colors">
                  Subscribe
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-600 text-white py-14 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest text-emerald-200 uppercase mb-2">
              Charity directory
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold mb-3">
              Choose your cause 💚
            </motion.h1>
            <motion.p variants={fadeUp} className="text-emerald-100 max-w-xl text-base">
              Every subscription directs at least 10% to a charity you care about. Browse below and find yours.
            </motion.p>
          </motion.div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" aria-hidden>🔍</span>
            <input
              type="search"
              placeholder="Search charities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white shadow-sm"
              aria-label="Search charities"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "featured"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors ${filter === f ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
              >
                {f === "all" ? "All" : "⭐ Featured"}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-52 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">😕</p>
            <p className="text-red-500 font-medium">{error}</p>
            <button onClick={fetchCharities} className="mt-4 text-sm text-emerald-600 underline">Try again</button>
          </div>
        )}

        {!loading && !error && charities.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-medium">No charities found</p>
            <p className="text-sm mt-1">Try a different search term or filter.</p>
          </div>
        )}

        {!loading && !error && charities.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {charities.map((charity, i) => (
              <motion.div key={charity.id} variants={fadeUp} custom={i}>
                <Link
                  href={`/charities/${charity.id}`}
                  className="group block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden hover:-translate-y-1 duration-200"
                >
                  <div className="h-40 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center overflow-hidden relative">
                    {charity.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={charity.image_url} alt={charity.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <span className="text-5xl">💚</span>
                    )}
                    {charity.is_featured && (
                      <span className="absolute top-2 right-2 text-xs font-bold text-emerald-700 bg-white/90 px-2 py-0.5 rounded-full shadow-sm">
                        ⭐ Featured
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1 mb-1">
                      {charity.name}
                    </h2>
                    {charity.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{charity.description}</p>
                    )}
                    <p className="mt-3 text-xs font-semibold text-emerald-600 group-hover:underline">View profile →</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
