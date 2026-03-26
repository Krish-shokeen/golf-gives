-- Add razorpay_customer_id column to profiles if it doesn't exist
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT;
