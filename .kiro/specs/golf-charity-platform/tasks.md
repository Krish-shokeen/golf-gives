# Implementation Plan: Golf Charity Subscription Platform

## Overview

Incremental implementation starting with project scaffolding and core data layer, then building each feature module, and finishing with the admin dashboard, UI polish, and deployment configuration.

## Tasks

- [x] 1. Project scaffolding and configuration
  - Initialise Next.js 14 project with TypeScript, Tailwind CSS, and App Router
  - Install dependencies: `@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`, `razorpay`, `resend`, `framer-motion`, `vitest`, `fast-check`, `@vitejs/plugin-react`
  - Configure `vitest.config.ts` with jsdom environment
  - Set up `.env.local` template with all required environment variable keys (Supabase URL/anon/service keys, Razorpay keys, Resend key)
  - Create `src/lib/supabase/client.ts` (browser client) and `src/lib/supabase/server.ts` (server client using service role)
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 2. Database schema and Supabase setup
  - [x] 2.1 Write Supabase migration SQL for all tables
    - Create migration file with all tables: `profiles`, `subscriptions`, `scores`, `charities`, `charity_events`, `draws`, `draw_winners`, `donations`
    - Add CHECK constraint `score >= 1 AND score <= 45` on `scores.score`
    - Add Row Level Security policies: users can only read/write their own rows; admins bypass RLS via service role
    - _Requirements: 3.1, 5.1, 6.2, 12.3_

- [x] 3. Authentication module
  - [x] 3.1 Implement registration and login API routes
    - `POST /api/auth/register` — calls `supabase.auth.signUp()`, creates profile row, sends confirmation email via Resend
    - `POST /api/auth/login` — calls `supabase.auth.signInWithPassword()`, returns session token
    - Return structured error `{ error, code }` for duplicate email, invalid credentials
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 3.2 Implement Next.js middleware for session validation
    - `middleware.ts` — validates Supabase JWT on every protected route, redirects unauthenticated users to `/login`
    - Attach user role to request context for downstream authorization checks
    - _Requirements: 1.4, 1.5, 9.1_
  - [x] 3.3 Write property test for duplicate registration prevention
    - **Property 11: Duplicate registration prevention**
    - **Validates: Requirements 1.2**
  - [x] 3.4 Write property test for authentication token round-trip
    - **Property 10: Authentication token round-trip**
    - **Validates: Requirements 1.3, 1.4**

- [x] 4. Score engine — core logic and API
  - [x] 4.1 Implement `src/lib/score-engine.ts`
    - `validateScore(score: number, date: string): ValidationResult` — checks range 1–45 and date presence
    - `applyRollingWindow(scores: Score[], newScore: Score): Score[]` — enforces max 5 scores, replaces oldest
    - `sortScoresDescending(scores: Score[]): Score[]` — sorts by `played_on` descending
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7_
  - [x] 4.2 Write property test for score range validation
    - **Property 1: Score range validation**
    - **Validates: Requirements 3.1, 3.6**
  - [x] 4.3 Write property test for rolling 5-score window invariant
    - **Property 2: Rolling 5-score window invariant**
    - **Validates: Requirements 3.3, 3.4, 3.5**
  - [x] 4.4 Implement score API routes
    - `POST /api/scores` — validates, inserts score, calls `applyRollingWindow`, returns updated score list
    - `PUT /api/scores/[id]` — validates and updates score
    - `GET /api/scores` — returns authenticated user's scores ordered by date descending
    - _Requirements: 3.2, 3.8_
  - [x] 4.5 Write property test for score storage round-trip
    - **Property 3: Score storage round-trip**
    - **Validates: Requirements 3.2**

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Prize pool module
  - [x] 6.1 Implement `src/lib/prize-pool.ts`
    - `calculatePrizePool(activeSubscriberCount: number, monthlyFee: number, jackpotCarried: number): PrizePool` — returns `{ tier5, tier4, tier3, total }`
    - `distributePrizes(tierAmount: number, winnerCount: number): number` — returns per-winner share
    - `rolloverJackpot(currentPool: PrizePool, hasWinner: boolean): number` — returns amount to carry forward
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 6.2 Write property test for prize pool allocation invariant
    - **Property 4: Prize pool allocation invariant**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
  - [x] 6.3 Write property test for equal prize split
    - **Property 5: Equal prize split among multiple winners**
    - **Validates: Requirements 5.5**
  - [x] 6.4 Write property test for jackpot rollover accumulation
    - **Property 6: Jackpot rollover accumulation**
    - **Validates: Requirements 4.7, 5.6**

- [x] 7. Draw engine module
  - [x] 7.1 Implement `src/lib/draw-engine.ts`
    - `runRandomDraw(): number[]` — returns 5 unique random integers from the valid score range (1–45)
    - `runAlgorithmicDraw(allScores: number[]): number[]` — returns 5 numbers weighted by frequency in subscriber scores
    - `calculateMatchTier(drawnNumbers: number[], userScores: number[]): number | null` — returns 3, 4, 5, or null
    - _Requirements: 4.2, 4.3_
  - [x] 7.2 Write property test for draw match tier correctness
    - **Property 12: Draw match tier correctness**
    - **Validates: Requirements 4.3**
  - [x] 7.3 Implement draw admin API routes
    - `POST /api/admin/draws/simulate` — runs draw engine in preview mode, returns results without persisting
    - `POST /api/admin/draws/publish` — persists draw, calculates winners, triggers email notifications
    - Jackpot rollover: if no tier-5 winner, carry `tier5` amount to next draw's `jackpot_carried`
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

- [x] 8. Subscription and payment module
  - [x] 8.1 Implement Razorpay subscription session creation
    - `POST /api/subscriptions/create` — creates a Razorpay subscription/order for monthly or yearly plan, returns `{ subscriptionId, keyId }` for client-side checkout
    - Store `razorpay_customer_id` on profile after first checkout
    - _Requirements: 2.1, 2.2_
  - [x] 8.2 Implement Razorpay webhook handler
    - `POST /api/webhooks/razorpay` — verify Razorpay webhook signature, handle events:
      - `payment.captured` → set subscription status to `active`
      - `payment.failed` → set status to `past_due`, send notification email
      - `subscription.cancelled` → set status to `cancelled` or `lapsed`
      - `subscription.charged` (renewal) → update `current_period_end`, send success email
    - _Requirements: 2.3, 2.4, 2.6, 2.7, 2.8_
  - [x] 8.3 Implement subscription access guard
    - Middleware check: if route requires active subscription and user status is not `active`, redirect to `/subscribe`
    - _Requirements: 2.5, 2.9_
  - [x] 8.4 Write property test for subscription state machine validity
    - **Property 9: Subscription state machine validity**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7**

- [x] 9. Charity module
  - [x] 9.1 Implement charity API routes
    - `GET /api/charities` — paginated list with optional `search` and `filter` query params
    - `GET /api/charities/[id]` — individual charity profile with events
    - `POST /api/admin/charities` — create charity (admin only)
    - `PUT /api/admin/charities/[id]` — update charity
    - `DELETE /api/admin/charities/[id]` — delete charity
    - _Requirements: 6.5, 6.6, 9.6, 9.7_
  - [x] 9.2 Implement charity contribution logic
    - `PUT /api/profile/charity` — update `charity_id` and `charity_contribution_pct` (enforce min 10%)
    - Validate that `charity_contribution_pct >= 10` server-side
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 9.3 Write property test for charity contribution minimum enforcement
    - **Property 7: Charity contribution minimum enforcement**
    - **Validates: Requirements 6.2**
  - [x] 9.4 Write property test for charity contribution update round-trip
    - **Property 8: Charity contribution update round-trip**
    - **Validates: Requirements 6.3**
  - [x] 9.5 Implement independent donation endpoint
    - `POST /api/donations` — creates Razorpay order for one-off donation to a charity
    - _Requirements: 6.4_

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Winner verification module
  - [x] 11.1 Implement winner proof upload
    - `POST /api/winners/[id]/proof` — authenticated subscriber uploads proof screenshot to Supabase Storage, stores URL in `draw_winners.proof_url`, sets `verification_status` to `pending_review`
    - _Requirements: 7.1, 7.2_
  - [x] 11.2 Implement admin winner verification routes
    - `PUT /api/admin/winners/[id]/verify` — admin sets `verification_status` to `approved` or `rejected`; on approval set `payment_status` to `pending`; on rejection send notification email
    - `PUT /api/admin/winners/[id]/payout` — admin sets `payment_status` to `paid`
    - _Requirements: 7.3, 7.4, 7.5, 7.6_
  - [x] 11.3 Write property test for winner verification state transitions
    - **Property 13: Winner verification state transitions**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

- [x] 12. Email notifications
  - Implement `src/lib/email.ts` with Resend:
    - `sendConfirmationEmail(to, name)` — triggered on registration
    - `sendDrawResultsEmail(subscribers, drawId)` — triggered on draw publish
    - `sendWinnerAlertEmail(to, prizeAmount)` — triggered on winner identification
    - `sendSubscriptionEmail(to, event)` — triggered on renewal success/failure
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 13. User dashboard page
  - [x] 13.1 Implement `GET /api/dashboard` server route
    - Returns aggregated data: subscription status + renewal date, scores, charity + contribution %, upcoming draws, winnings summary
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 13.2 Build `/dashboard` page (Next.js App Router)
    - Subscription status card, score entry/edit form, charity card, draw participation summary, winnings overview
    - All data fetched server-side via `GET /api/dashboard`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 14. Admin dashboard pages
  - [x] 14.1 Implement `GET /api/admin/dashboard` analytics route
    - Returns: total users, total prize pool, charity contribution totals, draw statistics
    - _Requirements: 9.10_
  - [x] 14.2 Build `/admin` pages
    - `/admin/users` — user list with edit/subscription management
    - `/admin/draws` — draw configuration (mode select), simulation runner, publish button, results view
    - `/admin/charities` — charity CRUD with image upload
    - `/admin/winners` — winners list with verify/payout actions
    - `/admin/analytics` — reports and statistics
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

- [x] 15. Public pages and UI
  - [x] 15.1 Build homepage (`/`)
    - Hero section with prominent subscribe CTA
    - "How it works" section (score → draw → win → give)
    - Charity impact section with featured charity spotlight
    - Subtle Framer Motion animations and micro-interactions
    - _Requirements: 10.2, 10.3, 10.4, 10.5_
  - [x] 15.2 Build charity directory page (`/charities`)
    - Search input and filter controls wired to `GET /api/charities`
    - Individual charity profile pages (`/charities/[id]`)
    - _Requirements: 6.5, 6.6, 6.7_
  - [x] 15.3 Build subscription/pricing page (`/subscribe`)
    - Monthly and yearly plan cards with Razorpay checkout integration
    - _Requirements: 2.1, 2.2_
  - [x] 15.4 Apply mobile-first responsive Tailwind styles across all pages
    - _Requirements: 10.1_

- [x] 16. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Deployment configuration
  - Configure `vercel.json` with environment variable references
  - Ensure all Supabase RLS policies are applied via migration
  - Verify Razorpay webhook endpoint is registered and secret is set
  - Confirm all environment variables are set in Vercel project settings
  - _Requirements: 12.1, 12.2, 12.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests use fast-check with minimum 100 iterations each
- Unit tests cover boundary values, edge cases, and error conditions
