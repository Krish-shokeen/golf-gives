const PROJECT_REF = "acsrfbmpshottijprujw";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const ADMIN_EMAIL = "admin@golfgives.com";
const ADMIN_PASSWORD = "Admin@123456";

if (!ACCESS_TOKEN) { console.error("Set SUPABASE_ACCESS_TOKEN"); process.exit(1); }

async function runSQL(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

// Create auth user via SQL (Supabase stores passwords as bcrypt in auth.users)
console.log("Creating admin auth user...");
const createUser = await runSQL(`
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data,
    role, aud, created_at, updated_at,
    confirmation_token, recovery_token
  )
  VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    '${ADMIN_EMAIL}',
    crypt('${ADMIN_PASSWORD}', gen_salt('bf')),
    now(),
    '{"full_name":"Admin"}',
    'authenticated', 'authenticated',
    now(), now(), '', ''
  )
  ON CONFLICT DO NOTHING
  RETURNING id, email;
`);

console.log("  Auth result:", JSON.stringify(createUser));

// Promote to admin in profiles
console.log("Setting admin role...");
await runSQL(`
  INSERT INTO public.profiles (id, email, full_name, role, charity_contribution_pct)
  SELECT id, email, 'Admin', 'admin', 10
  FROM auth.users WHERE email = '${ADMIN_EMAIL}'
  ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Admin';
`);

console.log(`
Admin account ready:
  Email:    ${ADMIN_EMAIL}
  Password: ${ADMIN_PASSWORD}
  Login at: http://localhost:3000/login
  Admin at: http://localhost:3000/admin
`);
