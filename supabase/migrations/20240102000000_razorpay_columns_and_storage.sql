-- ============================================================
-- Migration: rename Stripe columns to Razorpay, add storage
-- bucket policy, and add missing profile insert policy
-- ============================================================

-- Rename stripe columns to razorpay in subscriptions table
ALTER TABLE subscriptions
  RENAME COLUMN stripe_subscription_id TO razorpay_subscription_id;

ALTER TABLE subscriptions
  RENAME COLUMN stripe_customer_id TO razorpay_customer_id;

-- Rename stripe payment intent column in donations table
ALTER TABLE donations
  RENAME COLUMN stripe_payment_intent_id TO razorpay_payment_id;

-- ============================================================
-- MISSING RLS POLICIES
-- ============================================================

-- Allow new users to insert their own profile on registration
CREATE POLICY "profiles: own insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to insert their own subscription record
CREATE POLICY "subscriptions: own insert"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own subscription
-- (needed for client-side status reads; writes go via service role)
CREATE POLICY "subscriptions: own update"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own draw_winner proof
CREATE POLICY "draw_winners: own update"
  ON draw_winners FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET for winner proof screenshots
-- ============================================================

-- Create the storage bucket (idempotent via DO block)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('winner-proofs', 'winner-proofs', false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "winner-proofs: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'winner-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own proofs
CREATE POLICY "winner-proofs: own read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'winner-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
