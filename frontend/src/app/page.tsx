"use client";

/**
 * Homepage (/)
 * Requirements: 10.2, 10.3, 10.4, 10.5
 * - Hero section with prominent subscribe CTA
 * - "How it works" section (score → draw → win → give)
 * - Charity impact section with featured charity spotlight
 * - Subtle Framer Motion animations and micro-interactions
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeaturedCharity {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

// ─── How it works steps ───────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    icon: "⛳",
    step: "01",
    title: "Enter Your Scores",
    desc: "Log your Stableford scores after each round. Your latest 5 scores form your draw entries.",
  },
  {
    icon: "🎯",
    step: "02",
    title: "Monthly Draw",
    desc: "Every month, 5 numbers are drawn. Match 3, 4, or all 5 of your scores to win a prize.",
  },
  {
    icon: "🏆",
    step: "03",
    title: "Win Prizes",
    desc: "Match all 5 and claim the Jackpot. Prizes roll over if unclaimed — the pot keeps growing.",
  },
  {
    icon: "💚",
    step: "04",
    title: "Give Back",
    desc: "A portion of every subscription goes directly to your chosen charity. Golf with purpose.",
  },
];

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "₹50L+", label: "Donated to charities" },
  { value: "1,200+", label: "Active subscribers" },
  { value: "₹12L", label: "Current jackpot" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [featuredCharity, setFeaturedCharity] = useState<FeaturedCharity | null>(null);
  const [authState, setAuthState] = useState<{ loggedIn: boolean; isAdmin: boolean } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setAuthState({ loggedIn: false, isAdmin: false }); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      const isAdmin = profile?.role === "admin";
      setAuthState({ loggedIn: true, isAdmin });
      // Auto-redirect logged-in users
      window.location.href = isAdmin ? "/admin" : "/dashboard";
    });
  }, []);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    fetch(`${apiUrl}/api/charities?featured=true&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        const charities: FeaturedCharity[] = data.charities ?? [];
        if (charities.length > 0) setFeaturedCharity(charities[0]);
      })
      .catch(() => null);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight text-emerald-700">
            GolfGives
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/charities"
              className="hidden sm:block text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Charities
            </Link>
            {authState?.loggedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  href={authState.isAdmin ? "/admin" : "/dashboard"}
                  className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full transition-colors"
                >
                  {authState.isAdmin ? "Admin Panel" : "Dashboard"}
                </Link>
                <button
                  onClick={async () => {
                    const { createClient } = await import("@/lib/supabase/client");
                    await createClient().auth.signOut();
                    window.location.reload();
                  }}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-2"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Log in
                </Link>
                <Link href="/subscribe" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full transition-colors">
                  Subscribe
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Background gradient blob */}
        <div
          aria-hidden
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-emerald-50 blur-3xl opacity-60 pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute bottom-0 -left-24 w-[400px] h-[400px] rounded-full bg-teal-50 blur-3xl opacity-50 pointer-events-none"
        />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-6"
          >
            <motion.span
              variants={fadeUp}
              custom={0}
              className="inline-block text-xs font-semibold tracking-widest text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-full"
            >
              Golf · Prizes · Charity
            </motion.span>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight"
            >
              Play golf.{" "}
              <span className="text-emerald-600">Win prizes.</span>
              <br />
              Change lives.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed"
            >
              Subscribe, log your Stableford scores, and enter monthly draws — all while
              directing a portion of your fee to a charity you believe in.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
            >
              <Link
                href="/subscribe"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base px-8 py-3.5 rounded-full shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95"
              >
                Start your subscription
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/charities"
                className="w-full sm:w-auto inline-flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900 px-6 py-3.5 rounded-full border border-gray-200 hover:border-gray-300 transition-colors"
              >
                Browse charities
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-16 grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto"
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{s.value}</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.p
              variants={fadeUp}
              className="text-xs font-semibold tracking-widest text-emerald-600 uppercase mb-2"
            >
              How it works
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold">
              Four simple steps
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                custom={i}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <p className="text-xs font-bold text-emerald-500 tracking-widest mb-1">
                  STEP {item.step}
                </p>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Charity impact ──────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.p
              variants={fadeUp}
              className="text-xs font-semibold tracking-widest text-emerald-600 uppercase mb-2"
            >
              Charity impact
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold">
              Golf with purpose
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-gray-500 mt-3 max-w-xl mx-auto"
            >
              Every subscription contributes at least 10% to a charity of your choice.
              Browse our directory and pick a cause that matters to you.
            </motion.p>
          </motion.div>

          {/* Featured charity spotlight */}
          {featuredCharity && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-emerald-50 rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6 mb-10"
            >
              {featuredCharity.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featuredCharity.image_url}
                  alt={featuredCharity.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-emerald-200 flex items-center justify-center text-3xl flex-shrink-0">
                  💚
                </div>
              )}
              <div className="text-center sm:text-left">
                <p className="text-xs font-semibold tracking-widest text-emerald-600 uppercase mb-1">
                  Featured charity
                </p>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{featuredCharity.name}</h3>
                {featuredCharity.description && (
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                    {featuredCharity.description}
                  </p>
                )}
                <Link
                  href={`/charities/${featuredCharity.id}`}
                  className="inline-block mt-3 text-sm font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                >
                  Learn more →
                </Link>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <Link
              href="/charities"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-6 py-3 rounded-full transition-colors"
            >
              Browse all charities
              <span aria-hidden>→</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-emerald-700">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center text-white"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Ready to play with purpose?
          </h2>
          <p className="text-emerald-100 mb-8 text-lg">
            Join over 1,200 golfers who are winning prizes and making a difference every month.
          </p>
          <Link
            href="/subscribe"
            className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold text-base px-8 py-3.5 rounded-full shadow-lg hover:bg-emerald-50 transition-all hover:scale-105 active:scale-95"
          >
            Get started today
            <span aria-hidden>→</span>
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-10 px-4 sm:px-6 border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p className="font-semibold text-gray-700">GolfGives</p>
          <div className="flex gap-6">
            <Link href="/charities" className="hover:text-gray-700 transition-colors">
              Charities
            </Link>
            {authState?.loggedIn ? (
              <Link href={authState.isAdmin ? "/admin" : "/dashboard"} className="hover:text-gray-700 transition-colors">
                {authState.isAdmin ? "Admin Panel" : "Dashboard"}
              </Link>
            ) : (
              <>
                <Link href="/subscribe" className="hover:text-gray-700 transition-colors">
                  Subscribe
                </Link>
                <Link href="/login" className="hover:text-gray-700 transition-colors">
                  Log in
                </Link>
              </>
            )}
          </div>
          <p>© {new Date().getFullYear()} GolfGives. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
