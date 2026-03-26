-- ============================================================
-- Auto-create a profile row when a new auth user is created.
-- This ensures profiles exist regardless of registration path
-- (direct Supabase Auth signup or backend API registration).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, charity_contribution_pct)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    'subscriber',
    10
  )
  ON CONFLICT (id) DO NOTHING; -- safe to re-run; won't overwrite existing profiles
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
