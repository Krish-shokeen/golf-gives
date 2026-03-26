/**
 * seed-data.mjs
 * - Inserts "Krish Shokeen" charity (featured)
 * - Backfills profile rows for any auth users that don't have one yet
 *
 * Usage:
 *   $env:SUPABASE_ACCESS_TOKEN="sbp_cabed6b82e47b7b8afc2595f14af97cf6843a075"
 *   node scripts/seed-data.mjs
 */

const PROJECT_REF = "acsrfbmpshottijprujw";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("SUPABASE_ACCESS_TOKEN is required");
  process.exit(1);
}

async function runSQL(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

// 1. Insert charity
console.log("Inserting charity 'Krish Shokeen'...");
await runSQL(`
  INSERT INTO charities (name, description, is_featured)
  VALUES (
    'Krish Shokeen',
    'A charitable foundation dedicated to supporting underprivileged communities through education and sports.',
    true
  )
  ON CONFLICT DO NOTHING;
`);
console.log("  ✓ Charity inserted");

// 2. Backfill profiles for any existing auth users without a profile row
console.log("Backfilling missing profile rows...");
await runSQL(`
  INSERT INTO public.profiles (id, email, full_name, role, charity_contribution_pct)
  SELECT
    u.id,
    u.email,
    u.raw_user_meta_data->>'full_name',
    'subscriber',
    10
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL;
`);
console.log("  ✓ Profiles backfilled");

console.log("\nDone.");
