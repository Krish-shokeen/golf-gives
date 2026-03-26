"use client";

/**
 * /subscribe — Subscription / Pricing Page
 * Requirements: 2.1, 2.2
 * - Monthly and yearly plan cards
 * - Razorpay checkout integration
 * - Unauthenticated users are redirected to login before payment
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = "monthly" | "yearly";

interface PlanConfig {
  id: Plan;
  label: string;
  price: string;
  period: string;
  priceNote: string;
  savings?: string;
  features: string[];
  highlighted: boolean;
}

// ─── Plan data ────────────────────────────────────────────────────────────────

const PLANS: PlanConfig[] = [
  {
    id: "monthly",
    label: "Monthly",
    price: "₹999",
    period: "/ month",
    priceNote: "Billed monthly. Cancel anytime.",
    features: [
      "Unlimited score entries",
      "Monthly draw participation",
      "Charity contribution (min 10%)",
      "Winner prize eligibility",
      "Email draw notifications",
    ],
    highlighted: false,
  },
  {
    id: "yearly",
    label: "Yearly",
    price: "₹8,999",
    period: "/ year",
    priceNote: "Billed annually.",
    savings: "Save 25% vs monthly",
    features: [
      "Everything in Monthly",
      "Priority draw entry",
      "Increased charity impact",
      "Exclusive yearly subscriber badge",
      "Early access to new features",
    ],
    highlighted: true,
  },
];

const PERKS = [
  { icon: "🏆", text: "Monthly prize draws with rolling jackpot" },
  { icon: "💚", text: "10%+ of your fee goes to your chosen charity" },
  { icon: "⛳", text: "Track your Stableford scores in one place" },
  { icon: "🔒", text: "Secure payments via Razorpay" },
];

// Plan amounts in paise (INR)
const PLAN_AMOUNTS: Record<Plan, number> = {
  monthly: 99900,   // ₹999
  yearly: 899900,   // ₹8,999
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubscribePage() {
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = checking

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setIsLoggedIn(false); return; }
      // Admins don't need subscriptions — send them to admin panel
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      if (profile?.role === "admin") {
        window.location.href = "/admin";
        return;
      }
      setIsLoggedIn(true);
    });
  }, []);

  async function handleSubscribe(plan: Plan) {
    setLoading(plan);
    setError(null);

    try {
      const supabase = createClient();

      // Always re-verify session fresh — don't rely on cached isLoggedIn state
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = `/login?redirectTo=/subscribe`;
        setLoading(null);
        return;
      }

      await loadRazorpayScript();

      const amount = PLAN_AMOUNTS[plan];
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!;

      const options = {
        key: keyId,
        amount,
        currency: "INR",
        name: "GolfGives",
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Subscription`,
        handler: async (response: { razorpay_payment_id: string }) => {
          // Record subscription via server-side API route (uses service role)
          await fetch("/api/subscriptions/record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan, paymentId: response.razorpay_payment_id }),
          });
          window.location.href = "/dashboard?subscribed=true";
        },
        prefill: { email: session.user.email },
        theme: { color: "#059669" },
        modal: {
          ondismiss: () => setLoading(null),
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight text-emerald-700">
            GolfGives
          </Link>
          {isLoggedIn ? (
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Go to Dashboard →
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Already a member? Log in
            </Link>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-semibold tracking-widest text-emerald-600 uppercase mb-2">
            Pricing
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            One subscription. Monthly draws. Charitable giving. Cancel anytime.
          </p>
        </motion.div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`relative rounded-3xl p-8 border-2 flex flex-col ${
                plan.highlighted
                  ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100"
                  : "border-gray-200 bg-white shadow-sm"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold tracking-widest text-white bg-emerald-600 px-4 py-1 rounded-full uppercase">
                  Best value
                </span>
              )}

              {plan.savings && (
                <span className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mb-3 self-start">
                  {plan.savings}
                </span>
              )}

              <h2 className="text-lg font-bold text-gray-900 mb-1">{plan.label}</h2>

              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                <span className="text-gray-400 text-sm mb-1">{plan.period}</span>
              </div>
              <p className="text-xs text-gray-400 mb-6">{plan.priceNote}</p>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null || isLoggedIn === null}
                className={`w-full py-3.5 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                  plan.highlighted
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200"
                    : "bg-gray-900 hover:bg-gray-800 text-white"
                }`}
              >
                {loading === plan.id
                  ? "Loading…"
                  : isLoggedIn === false
                  ? "Log in to subscribe"
                  : `Get ${plan.label} plan`}
              </button>
            </motion.div>
          ))}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-red-600 mb-8 bg-red-50 rounded-xl py-3 px-4"
          >
            {error}
          </motion.p>
        )}

        {/* Perks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12"
        >
          {PERKS.map((perk) => (
            <div key={perk.text} className="text-center p-4 bg-gray-50 rounded-2xl">
              <p className="text-2xl mb-2">{perk.icon}</p>
              <p className="text-xs text-gray-600 leading-snug">{perk.text}</p>
            </div>
          ))}
        </motion.div>

        {/* FAQ / reassurance */}
        <div className="text-center text-sm text-gray-400 space-y-1">
          <p>Payments are processed securely by Razorpay. We never store your card details.</p>
          <p>
            Questions?{" "}
            <a href="mailto:hello@golfgives.com" className="text-emerald-600 hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </main>

      {/* Razorpay script loaded dynamically */}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById("razorpay-script")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}
