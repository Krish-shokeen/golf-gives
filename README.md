# Golf Gives — Golf Charity Subscription Platform

A full-stack platform where golfers subscribe monthly or yearly, compete on leaderboards, and a portion of every subscription goes to charity. Winners are drawn periodically and verified before prizes are awarded.

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS — deployed on Vercel
- **Backend**: Express.js + TypeScript — deployed on Render
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Payments**: Razorpay (subscriptions + webhooks)
- **Email**: Resend

---

## Project Structure

```
├── frontend/          # Next.js app (Vercel)
├── backend/           # Express API (Render)
├── supabase/
│   └── migrations/    # Database migrations
├── scripts/           # Admin utility scripts
├── vercel.json        # Vercel deployment config
└── DEPLOYMENT.md      # Full deployment guide
```

---

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Backend

```bash
cd backend
cp .env.example .env   # fill in your credentials
npm install
npm run dev            # runs on http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local   # fill in your credentials
npm install
npm run dev                  # runs on http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `RAZORPAY_KEY_ID` | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signing secret |
| `RESEND_API_KEY` | Resend API key |
| `PORT` | Server port (default: `4000`) |
| `FRONTEND_URL` | Frontend origin for CORS |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay key ID |
| `NEXT_PUBLIC_APP_URL` | Frontend URL |
| `NEXT_PUBLIC_API_URL` | Backend API URL |

---

## Deployment

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repo
3. Set:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Add all backend environment variables in Render's Environment tab

### Frontend → Vercel

1. Import repo on [Vercel](https://vercel.com)
2. Set Root Directory to `frontend` (or leave blank — `vercel.json` handles it)
3. Add these environment variables in Vercel's project settings:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_RAZORPAY_KEY_ID
NEXT_PUBLIC_APP_URL        → your Vercel URL
NEXT_PUBLIC_API_URL        → https://golf-gives.onrender.com
```

### Database

```bash
# Apply all migrations to your Supabase project
supabase link --project-ref <your-project-ref>
supabase db push
```

### Razorpay Webhook

Register `https://golf-gives.onrender.com/api/webhooks/razorpay` in the Razorpay dashboard under **Settings → Webhooks**. Select events:
- `payment.captured`
- `payment.failed`
- `subscription.charged`
- `subscription.cancelled`

Copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET` on Render.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/auth/*` | Auth routes |
| GET/POST | `/api/subscriptions/*` | Subscription management |
| GET/POST | `/api/donations/*` | Donations |
| GET | `/api/charities` | List charities |
| GET | `/api/scores` | Leaderboard scores |
| GET | `/api/dashboard` | User dashboard data |
| GET | `/api/winners` | Winners list |
| POST | `/api/webhooks/razorpay` | Razorpay webhook handler |
| GET/POST | `/api/admin/*` | Admin routes (admin role required) |

---

## Scripts

```bash
# Create an admin user
node scripts/create-admin.mjs

# Seed sample data
node scripts/seed-data.mjs

# Push migrations manually
node scripts/push-migrations.mjs
```

---

## Post-Deployment Checklist

- [ ] Supabase migrations applied
- [ ] `winner-proofs` storage bucket exists (created by migration)
- [ ] Razorpay webhook registered with correct URL and secret
- [ ] `FRONTEND_URL` on Render set to your Vercel URL
- [ ] `NEXT_PUBLIC_API_URL` on Vercel set to `https://golf-gives.onrender.com`
- [ ] Test a subscription flow with Razorpay test credentials
- [ ] Verify webhook delivery in Razorpay dashboard
