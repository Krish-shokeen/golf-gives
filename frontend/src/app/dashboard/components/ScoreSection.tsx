"use client";

/**
 * ScoreSection — score entry/edit form and current score log.
 * Requirement 8.2
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DashboardData } from "../page";

interface Props {
  scores: DashboardData["scores"];
}

interface ScoreRow {
  id: string;
  score: number;
  played_on: string;
  created_at: string;
}

const API_URL = ""; // use Next.js API routes (relative URLs)

async function getToken(): Promise<string | null> {
  // Token not needed — Next.js API routes use cookie-based auth
  return null;
}

export default function ScoreSection({ scores: initialScores }: Props) {
  const [scores, setScores] = useState<ScoreRow[]>(initialScores);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formScore, setFormScore] = useState("");
  const [formDate, setFormDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  function startEdit(row: ScoreRow) {
    setEditingId(row.id);
    setFormScore(String(row.score));
    setFormDate(row.played_on);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setFormScore("");
    setFormDate("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const scoreNum = parseInt(formScore, 10);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 45) {
      setError("Score must be a whole number between 1 and 45.");
      setLoading(false);
      return;
    }
    if (!formDate) {
      setError("Please select a date.");
      setLoading(false);
      return;
    }

    try {
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/scores/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: scoreNum, played_on: formDate }),
        });
      } else {
        res = await fetch(`/api/scores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: scoreNum, played_on: formDate }),
        });
      }

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      // Update local state with the returned scores list
      if (json.scores) {
        setScores(json.scores);
      } else if (json.score) {
        setScores((prev) =>
          prev.map((s) => (s.id === editingId ? json.score : s))
        );
      }

      cancelEdit();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
        Golf Scores
      </h2>

      {/* Score entry / edit form */}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 mb-6 items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="score-input" className="text-xs text-gray-500 font-medium">
            Stableford Score (1–45)
          </label>
          <input
            id="score-input"
            type="number"
            min={1}
            max={45}
            value={formScore}
            onChange={(e) => setFormScore(e.target.value)}
            placeholder="e.g. 32"
            className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="date-input" className="text-xs text-gray-500 font-medium">
            Date Played
          </label>
          <input
            id="date-input"
            type="date"
            max={today}
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {loading ? "Saving…" : editingId ? "Update Score" : "Add Score"}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={cancelEdit}
            className="rounded-lg border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </form>

      {error && (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {error}
        </p>
      )}

      {/* Score log */}
      {scores.length === 0 ? (
        <p className="text-sm text-gray-400">No scores yet. Add your first score above.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {scores.map((row) => {
            const dateLabel = new Date(row.played_on).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <li key={row.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="text-lg font-bold text-gray-900">{row.score}</span>
                  <span className="ml-2 text-sm text-gray-400">{dateLabel}</span>
                </div>
                <button
                  onClick={() => startEdit(row)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Edit
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Up to 5 scores are kept. Adding a 6th replaces the oldest.
      </p>
    </div>
  );
}
