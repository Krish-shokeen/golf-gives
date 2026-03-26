/**
 * Deletes the broken admin user and recreates via Supabase Auth Admin API
 */
const PROJECT_REF = "acsrfbmpshottijprujw";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = "https://acsrfbmpshottijprujw.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjc3JmYm1wc2hvdHRpanBydWp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwODU3MywiZXhwIjoyMDkwMDg0NTczfQ.Yg3g7cp12MAjCS7gKDDKlJSSdW0Fb_pMaVXzqnMvTjI";

const ADMIN_EMAIL = "admin@golfgives.com";
const ADMIN_PASSWORD = "Admin@123456";

async function runSQL(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  return res.json();
}

// Step 1: Delete broken user via SQL
console.log("Removing broken admin user...");
const del = await runSQL(`DELETE FROM auth.users WHERE email = '${ADMIN_EMAIL}' RETURNING id;`);
console.log("  Deleted:", JSON.stringify(del));

// Step 2: Create user via Supabase Auth Admin API (uses service role key)
console.log("Creating admin via Auth API...");
const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Admin" },
  }),
});

const created = await createRes.json();
if (!createRes.ok) {
  console.error("Failed:", JSON.stringify(created));
  process.exit(1);
}
console.log("  Created user:", created.id);

// Step 3: Set admin role in profiles
console.log("Setting admin role...");
await runSQL(`
  INSERT INTO public.profiles (id, email, full_name, role, charity_contribution_pct)
  VALUES ('${created.id}', '${ADMIN_EMAIL}', 'Admin', 'admin', 10)
  ON CONFLICT (id) DO UPDATE SET role = 'admin';
`);

console.log(`
✅ Admin ready:
   Email:    ${ADMIN_EMAIL}
   Password: ${ADMIN_PASSWORD}
   Login:    http://localhost:3000/login
   Admin:    http://localhost:3000/admin
`);
