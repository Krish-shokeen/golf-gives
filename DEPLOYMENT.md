# Deployment Guide — Golf Charity Subscription Platform

## Prerequisites

- [Vercel](https://vercel.com) account
- [Supabase](https://supabase.com) project (new project)
- [Razorpay](https://razorpay.com) account with live/test credentials
- [Resend](https://resend.com) account for transactional email

---

## 1. Supabase Setup

### Apply Migrations

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref <your-project-ref>

# Push all migrations
supabase db push
```

Migrations applied (in order):
1. `20240101000000_initial_schema.sql` — tables, indexes, RLS policies
2. `20240102000000_razorpay_columns_and_storage.sql` — Razorpay column names, storage bucket, missing RLS policies

### Storage Bucket

The migration creates a private `winner-proofs` bucket automatically. Verify it exists in your Supabase dashboard under **Storage**.

### Service Role Key

The backend uses the **service role key** (bypasses RLS) for all admin operations. Never expose this key to the browser.

---

## 2. Razorpay Webhook Setup

1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Settings → Webhooks → Add New Webhook**
3. Set the **Webhook URL** to:
   ```
   https://<your-backend-url>/api/webhooks/razorpay
   ```
4. Select the following events:
   - `payment.captured`
   - `payment.failed`
   - `subscription.charged`
   - `subscription.cancelled`
5. Copy the **Webhook Secret** and set it as `RAZORPAY_WEBHOOK_SECRET` in your backend environment

---

## 3. Environment Variables

### Backend (Express — deploy separately or as a Render/Railway service)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `RAZORPAY_KEY_ID` | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signing secret |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `PORT` | Server port (default: `4000`) |
| `FRONTEND_URL` | Frontend origin for CORS (e.g. `https://your-app.vercel.app`) |

### Frontend (Vercel — Next.js)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay key ID (used in checkout widget) |
| `NEXT_PUBLIC_APP_URL` | Full URL of the deployed frontend |
| `NEXT_PUBLIC_API_URL` | Full URL of the deployed backend API |

---

## 4. Vercel Deployment

### Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# From the repo root — Vercel will use vercel.json
vercel

# Set environment variables (repeat for each variable above)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_RAZORPAY_KEY_ID
vercel env add NEXT_PUBLIC_APP_URL
vercel env add NEXT_PUBLIC_API_URL
```

### Using Vercel Dashboard

1. Import the repository from GitHub/GitLab
2. Set **Root Directory** to `frontend`
3. Add all frontend environment variables under **Settings → Environment Variables**
4. Deploy

The `vercel.json` at the repo root configures the build command, output directory, and security headers automatically.

---

## 5. Backend Deployment

The Express backend is a separate Node.js service. Deploy it to any Node-compatible host:

- **Render**: Connect repo, set root to `backend`, build command `npm run build`, start command `npm start`
- **Railway**: Similar — set root directory to `backend`
- **Fly.io**: Use a `Dockerfile` in `backend/`

After deploying the backend, update `NEXT_PUBLIC_API_URL` in Vercel to point to the live backend URL, and update `FRONTEND_URL` in the backend environment to the Vercel deployment URL.

---

## 6. Post-Deployment Checklist

- [ ] Supabase migrations applied (`supabase db push`)
- [ ] `winner-proofs` storage bucket exists and is private
- [ ] Razorpay webhook URL registered and secret set as `RAZORPAY_WEBHOOK_SECRET`
- [ ] All backend environment variables set on the backend host
- [ ] All frontend environment variables set in Vercel project settings
- [ ] CORS `FRONTEND_URL` on backend matches the Vercel deployment URL
- [ ] HTTPS enforced (Vercel and Supabase enforce this by default)
- [ ] Test a subscription flow end-to-end with Razorpay test credentials
- [ ] Verify webhook delivery in Razorpay dashboard after a test payment
