"use client";

import { motion } from "framer-motion";

interface Entry { position: number; userId: string; name: string; bestScore: number }
interface Props { leaderboard: Entry[]; currentUserId: string | null }

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const POSITION_STYLES: Record<number, string> = {
  1: "bg-gradient-to-r from-yellow-400 to-amber-400 text-white shadow-lg shadow-amber-200",
  2: "bg-gradient-to-r from-slate-300 to-slate-400 text-white shadow-md",
  3: "bg-gradient-to-r from-orange-300 to-amber-500 text-white shadow-md",
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.05, ease: "easeOut" } }),
};

export default function LeaderboardClient({ leaderboard, currentUserId }: Props) {
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-10">
        <p className="text-xs font-semibold tracking-widest text-emerald-600 uppercase mb-2">Rankings</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">Leaderboard 🏆</h1>
        <p className="text-gray-500 text-sm">Top Stableford scores across all subscribers. Best single score per player.</p>
      </motion.div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">⛳</p>
          <p className="font-medium text-lg">No scores yet</p>
          <p className="text-sm mt-1">Be the first to add a score from your dashboard.</p>
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-3 mb-8">
              {/* 2nd place */}
              {top3[1] && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.45 }}
                  className="flex-1 max-w-[160px]">
                  <div className={`rounded-2xl p-4 text-center ${POSITION_STYLES[2]} h-28 flex flex-col items-center justify-center`}>
                    <p className="text-2xl mb-1">{MEDAL[2]}</p>
                    <p className="font-bold text-sm truncate w-full text-center">{top3[1].name}</p>
                    <p className="text-xl font-extrabold">{top3[1].bestScore}</p>
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-1">2nd</p>
                </motion.div>
              )}

              {/* 1st place */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.45 }}
                className="flex-1 max-w-[180px]">
                <div className={`rounded-2xl p-4 text-center ${POSITION_STYLES[1]} h-36 flex flex-col items-center justify-center`}>
                  <p className="text-3xl mb-1">{MEDAL[1]}</p>
                  <p className="font-bold text-sm truncate w-full text-center">{top3[0].name}</p>
                  <p className="text-2xl font-extrabold">{top3[0].bestScore}</p>
                </div>
                <p className="text-center text-xs text-gray-400 mt-1">1st</p>
              </motion.div>

              {/* 3rd place */}
              {top3[2] && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.45 }}
                  className="flex-1 max-w-[160px]">
                  <div className={`rounded-2xl p-4 text-center ${POSITION_STYLES[3]} h-24 flex flex-col items-center justify-center`}>
                    <p className="text-2xl mb-1">{MEDAL[3]}</p>
                    <p className="font-bold text-sm truncate w-full text-center">{top3[2].name}</p>
                    <p className="text-xl font-extrabold">{top3[2].bestScore}</p>
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-1">3rd</p>
                </motion.div>
              )}
            </div>
          )}

          {/* Full table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <span className="col-span-1">#</span>
              <span className="col-span-8">Player</span>
              <span className="col-span-3 text-right">Best Score</span>
            </div>

            {leaderboard.map((entry, i) => {
              const isMe = entry.userId === currentUserId;
              const medal = MEDAL[entry.position];
              return (
                <motion.div
                  key={entry.userId}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                  className={`grid grid-cols-12 px-5 py-4 items-center border-b border-gray-50 last:border-0 transition-colors ${isMe ? "bg-emerald-50" : "hover:bg-gray-50"}`}
                >
                  <span className="col-span-1 text-sm font-bold text-gray-400">
                    {medal ?? entry.position}
                  </span>
                  <div className="col-span-8 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isMe ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                      {entry.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isMe ? "text-emerald-700" : "text-gray-900"}`}>
                        {entry.name}
                        {isMe && <span className="ml-2 text-xs font-medium text-emerald-500 bg-emerald-100 px-1.5 py-0.5 rounded-full">You</span>}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className={`text-lg font-extrabold ${entry.position === 1 ? "text-amber-500" : entry.position === 2 ? "text-slate-500" : entry.position === 3 ? "text-orange-500" : "text-gray-800"}`}>
                      {entry.bestScore}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
