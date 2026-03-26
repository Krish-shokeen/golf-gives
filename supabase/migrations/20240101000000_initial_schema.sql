-- ============================================================
-- Golf Charity Subscription Platform — Initial Schema
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- Charities (referenced by profiles, so created first)
CREATE TABLE charities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Charity Events
CREATE TABLE charity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id UUID NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  description TEXT
);

-- User Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'subscriber'
    CHECK (role IN ('subscriber', 'admin')),
  charity_id UUID REFERENCES charities(id) ON DELETE SET NULL,
  charity_contribution_pct INTEGER NOT NULL DEFAULT 10
    CHECK (charity_contribution_pct >= 10 AND charity_contribution_pct <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'lapsed', 'past_due')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Golf Scores
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
  played_on DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Draws
CREATE TABLE draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('random', 'algorithmic')),
  drawn_numbers INTEGER[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'simulated', 'published')),
  prize_pool_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  jackpot_carried NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Draw Winners
CREATE TABLE draw_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_tier INTEGER NOT NULL CHECK (match_tier IN (3, 4, 5)),
  prize_amount NUMERIC(12,2) NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending_proof'
    CHECK (verification_status IN ('pending_proof', 'pending_review', 'approved', 'rejected')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid')),
  proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donations (independent, not tied to subscription)
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  charity_id UUID NOT NULL REFERENCES charities(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_scores_user_id ON scores(user_id);
CREATE INDEX idx_scores_played_on ON scores(user_id, played_on DESC);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_draw_winners_draw_id ON draw_winners(draw_id);
CREATE INDEX idx_draw_winners_user_id ON draw_winners(user_id);
CREATE INDEX idx_charity_events_charity_id ON charity_events(charity_id);
CREATE INDEX idx_donations_charity_id ON donations(charity_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- The service role key bypasses RLS entirely, so admin operations
-- performed server-side (via service role) are unrestricted.
-- Client-side (anon/authenticated) access is governed by the
-- policies below.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
-- Users can read and update their own profile only
CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ---- subscriptions ----
CREATE POLICY "subscriptions: own read"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ---- scores ----
CREATE POLICY "scores: own read"
  ON scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "scores: own insert"
  ON scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scores: own update"
  ON scores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "scores: own delete"
  ON scores FOR DELETE
  USING (auth.uid() = user_id);

-- ---- charities (public read, admin write via service role) ----
CREATE POLICY "charities: public read"
  ON charities FOR SELECT
  USING (true);

-- ---- charity_events (public read) ----
CREATE POLICY "charity_events: public read"
  ON charity_events FOR SELECT
  USING (true);

-- ---- draws (published draws are public; drafts/simulated via service role) ----
CREATE POLICY "draws: published read"
  ON draws FOR SELECT
  USING (status = 'published');

-- ---- draw_winners ----
CREATE POLICY "draw_winners: own read"
  ON draw_winners FOR SELECT
  USING (auth.uid() = user_id);

-- ---- donations ----
CREATE POLICY "donations: own read"
  ON donations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "donations: own insert"
  ON donations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- UPDATED_AT TRIGGER for subscriptions
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
