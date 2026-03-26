"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { DashboardData } from "../page";
import SubscriptionCard from "./SubscriptionCard";
import ScoreSection from "./ScoreSection";
import CharityCard from "./CharityCard";
import DrawsCard from "./DrawsCard";
import WinningsCard from "./WinningsCard";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.08, ease: "easeOut" } }),
};

interface Props { data: DashboardData }

export default function DashboardShell({ data }: Props) {
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();
  const { user, subscription, scores, charity, draws, winnings } = data;

  const initials = user.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  const displayName = user.fullName ?? user.email.split("@")[0];

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isActive = subscription.status === "active";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⛳</span>
            <span className="font-bold text-lg text-emerald-700 tracking-tight">GolfGives</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/charities" className="hidden sm:block text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Charities
            </Link>
            <Link href="/leaderboard" className="hidden sm:block text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Leaderboard
            </Link>
            <Link href="/draws" className="hidden sm:block text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Draws
            </Link>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full px-3 py-1.5 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                  {initials}
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                  {displayName}
                </span>
                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 bg-emerald-50">
                      <p className="text-xs text-gray-400 font-medium">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero header ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white">
        {/* Decorative blobs */}
        <div aria-hidden className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
        <div aria-hidden className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-teal-400/10 blur-2xl" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 relative">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            <motion.p variants={fadeUp} custom={0} className="text-emerald-200 text-sm font-medium mb-1">
              Welcome back 👋
            </motion.p>
            <motion.h1 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
              {displayName}
            </motion.h1>
            <motion.div variants={fadeUp} custom={2} className="flex flex-wrap items-center gap-3 mt-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isActive ? "bg-white/20 text-white" : "bg-white/10 text-emerald-200"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-300 animate-pulse" : "bg-gray-300"}`} />
                {isActive ? `Active · ${subscription.plan ?? "monthly"} plan` : "No active subscription"}
              </span>
              {!isActive && (
                <Link href="/subscribe" className="inline-flex items-center gap-1 bg-white text-emerald-700 text-xs font-bold px-3 py-1 rounded-full hover:bg-emerald-50 transition-colors">
                  Subscribe now →
                </Link>
              )}
            </motion.div>
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.45 }}
            className="grid grid-cols-3 gap-4 mt-8 max-w-sm"
          >
            {[
              { label: "Scores", value: scores.length, icon: "⛳" },
              { label: "Draws", value: draws.drawsEntered, icon: "🎯" },
              { label: "Wins", value: winnings.winCount, icon: "🏆" },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
                <p className="text-xl mb-0.5">{s.icon}</p>
                <p className="text-xl font-extrabold">{s.value}</p>
                <p className="text-xs text-emerald-200">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Top row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <SubscriptionCard subscription={subscription} />
          </motion.div>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            <CharityCard charity={charity} />
          </motion.div>
        </div>

        {/* Scores */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <ScoreSection scores={scores} />
        </motion.div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <DrawsCard draws={draws} />
          </motion.div>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
            <WinningsCard winnings={winnings} />
          </motion.div>
        </div>

        {/* Golf inspiration banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-5"
        >
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-800 to-slate-700 text-white p-7 flex flex-col justify-between gap-4">
            <div aria-hidden className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=60')", backgroundSize: "cover", backgroundPosition: "center" }} />
            <div className="relative">
              <p className="text-slate-300 text-xs mb-1">Keep playing</p>
              <h3 className="text-lg font-bold">Every round counts ⛳</h3>
              <p className="text-slate-300 text-sm mt-1">Your scores enter you into monthly draws.</p>
            </div>
            <Link href="/charities" className="relative self-start bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-colors">
              Browse charities →
            </Link>
          </div>

          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 text-white p-7 flex flex-col justify-between gap-4">
            <div>
              <p className="text-amber-100 text-xs mb-1">Community</p>
              <h3 className="text-lg font-bold">See how you rank 🏆</h3>
              <p className="text-amber-100 text-sm mt-1">Check the leaderboard and see where you stand against other players.</p>
            </div>
            <Link href="/leaderboard" className="self-start bg-white text-amber-600 font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-amber-50 transition-colors">
              View leaderboard →
            </Link>
          </div>
        </motion.div>      </main>
    </div>
  );
}
