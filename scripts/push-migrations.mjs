/**
 * push-migrations.mjs
 * Runs all SQL migration files against the Supabase project
 * using the Supabase Management API.
 *
 * Usage: node scripts/push-migrations.mjs
 *
 * Requires SUPABASE_ACCESS_TOKEN env var (your personal access token
 * from https://supabase.com/dashboard/account/tokens)
 * and SUPABASE_PROJECT_REF (your project ref, e.g. acsrfbmpshottijprujw)
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "acsrfbmpshottijprujw";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error(
    "\nError: SUPABASE_ACCESS_TOKEN is required.\n" +
    "Get your token from: https://supabase.com/dashboard/account/tokens\n" +
    "Then run:\n" +
    "  $env:SUPABASE_ACCESS_TOKEN='your_token_here'\n" +
    "  node scripts/push-migrations.mjs\n"
  );
  process.exit(1);
}

const migrationsDir = join(__dirname, "..", "supabase", "migrations");

// Get all .sql files sorted by filename (chronological order)
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Found ${files.length} migration files:\n`);
files.forEach((f) => console.log(`  - ${f}`));
console.log();

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  console.log(`Running: ${file} ...`);

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

  if (!res.ok) {
    console.error(`  ✗ Failed (${res.status}):`, JSON.stringify(body, null, 2));
    // Continue with remaining migrations rather than stopping
  } else {
    console.log(`  ✓ Done`);
  }
}

console.log("\nAll migrations processed.");
