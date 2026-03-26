# Requirements Document

## Introduction

A subscription-driven web application combining golf performance tracking (Stableford scoring), a monthly draw-based prize engine, and charitable giving. Users subscribe, enter golf scores, participate in monthly draws, and direct a portion of their subscription to a charity of their choice. Administrators manage users, draws, charities, winner verification, and analytics through a dedicated dashboard.

## Glossary

- **Platform**: The Golf Charity Subscription web application
- **Subscriber**: A registered user with an active subscription
- **Visitor**: An unauthenticated or non-subscribing user browsing the platform
- **Administrator**: A privileged user with full control over the platform
- **Stableford_Score**: A golf score in Stableford format, an integer between 1 and 45 inclusive
- **Score_Log**: The rolling collection of the user's latest 5 Stableford scores, each with a date
- **Draw**: A monthly event that selects winning number combinations from the pool of subscriber scores
- **Prize_Pool**: The accumulated fund derived from subscriber fees, split across draw tiers
- **Jackpot**: The 5-Number Match prize tier that rolls over if unclaimed
- **Charity**: A registered charitable organisation listed on the platform
- **Contribution**: The portion of a subscriber's fee directed to their chosen charity
- **Subscription_Plan**: Either a monthly or yearly billing plan
- **Razorpay**: The PCI-compliant payment gateway used for subscription billing
- **Supabase**: The backend database and auth provider
- **Vercel**: The deployment platform for the frontend and serverless functions

---

## Requirements

### Requirement 1: User Authentication and Registration

**User Story:** As a visitor, I want to create an account and log in securely, so that I can access platform features.

#### Acceptance Criteria

1. WHEN a visitor submits a valid registration form, THE Platform SHALL create a new user account and send a confirmation email
2. WHEN a visitor submits a registration form with an already-registered email, THE Platform SHALL return a descriptive error and prevent duplicate account creation
3. WHEN a registered user submits valid credentials, THE Platform SHALL authenticate the user and issue a secure session token (JWT or session-based)
4. WHEN an authenticated request is received, THE Platform SHALL validate the session token on every request
5. IF a session token is invalid or expired, THEN THE Platform SHALL reject the request and return an authentication error
6. THE Platform SHALL enforce HTTPS on all authenticated endpoints

---

### Requirement 2: Subscription and Payment System

**User Story:** As a visitor, I want to subscribe to the platform on a monthly or yearly plan, so that I can access all features and participate in draws.

#### Acceptance Criteria

1. THE Platform SHALL offer a monthly subscription plan and a discounted yearly subscription plan
2. WHEN a user initiates a subscription, THE Platform SHALL process payment through Razorpay
3. WHEN a subscription payment succeeds, THE Platform SHALL activate the user's subscription and grant full access
4. WHEN a subscription payment fails, THE Platform SHALL notify the user and restrict access to subscriber-only features
5. WHILE a subscription is active, THE Platform SHALL validate subscription status on every authenticated request
6. WHEN a subscription is cancelled, THE Platform SHALL update the subscription state to cancelled and restrict access at the end of the billing period
7. WHEN a subscription lapses due to non-renewal, THE Platform SHALL update the subscription state to lapsed and restrict access
8. WHEN a subscription is due for renewal, THE Platform SHALL attempt automatic renewal via Razorpay and notify the user of the outcome
9. IF a non-subscriber attempts to access a subscriber-only feature, THEN THE Platform SHALL redirect the user to the subscription page

---

### Requirement 3: Golf Score Management

**User Story:** As a subscriber, I want to enter and manage my golf scores, so that I can participate in monthly draws.

#### Acceptance Criteria

1. WHEN a subscriber submits a new Stableford score, THE Platform SHALL validate that the score is an integer between 1 and 45 inclusive
2. WHEN a subscriber submits a new score with a valid date, THE Platform SHALL store the score and its associated date
3. WHILE a subscriber has fewer than 5 stored scores, THE Platform SHALL accept new scores up to the 5-score limit
4. WHEN a subscriber submits a 6th score, THE Platform SHALL replace the oldest stored score with the new score, maintaining exactly 5 scores
5. THE Platform SHALL display a subscriber's scores in reverse chronological order (most recent first)
6. IF a subscriber submits a score outside the range 1–45, THEN THE Platform SHALL reject the submission and return a descriptive validation error
7. IF a subscriber submits a score without a date, THEN THE Platform SHALL reject the submission and return a descriptive validation error
8. WHEN a subscriber edits an existing score, THE Platform SHALL validate and update the score using the same rules as submission

---

### Requirement 4: Monthly Draw System

**User Story:** As a subscriber, I want to participate in monthly draws based on my golf scores, so that I can win prizes.

#### Acceptance Criteria

1. THE Platform SHALL execute draws on a monthly cadence
2. THE Draw_Engine SHALL support two draw logic modes: random (standard lottery-style) and algorithmic (weighted by most/least frequent user scores)
3. THE Draw_Engine SHALL produce three match tiers: 5-Number Match, 4-Number Match, and 3-Number Match
4. WHEN an administrator configures a draw, THE Platform SHALL allow selection of draw logic mode before execution
5. WHEN an administrator runs a simulation, THE Platform SHALL execute the draw in preview mode without publishing results
6. WHEN an administrator publishes draw results, THE Platform SHALL make results visible to all subscribers
7. IF no subscriber achieves a 5-Number Match in a draw, THEN THE Platform SHALL roll the 5-Number Match prize pool (Jackpot) forward to the next month's draw
8. WHEN a draw is published, THE Platform SHALL notify all subscribers of the results via email

---

### Requirement 5: Prize Pool Logic

**User Story:** As a subscriber, I want to know how prizes are calculated and distributed, so that I can understand my potential winnings.

#### Acceptance Criteria

1. THE Platform SHALL allocate 40% of the total prize pool to the 5-Number Match tier
2. THE Platform SHALL allocate 35% of the total prize pool to the 4-Number Match tier
3. THE Platform SHALL allocate 25% of the total prize pool to the 3-Number Match tier
4. THE Platform SHALL calculate each tier's pool automatically based on the active subscriber count and subscription fee
5. WHEN multiple subscribers win the same tier, THE Platform SHALL split the tier prize equally among all winners
6. WHEN the Jackpot rolls over, THE Platform SHALL add the unclaimed 5-Number Match amount to the next month's 5-Number Match pool

---

### Requirement 6: Charity System

**User Story:** As a subscriber, I want to select a charity and contribute a portion of my subscription, so that I can support causes I care about.

#### Acceptance Criteria

1. WHEN a user registers, THE Platform SHALL prompt the user to select a charity from the charity directory
2. THE Platform SHALL enforce a minimum charity contribution of 10% of the subscription fee
3. WHEN a subscriber increases their charity contribution percentage, THE Platform SHALL update the contribution and apply it from the next billing cycle
4. THE Platform SHALL provide an independent donation option not tied to gameplay or subscription
5. THE Platform SHALL display a charity listing page with search and filter functionality
6. THE Platform SHALL display individual charity profiles including description, images, and upcoming events
7. THE Platform SHALL display a featured/spotlight charity section on the homepage

---

### Requirement 7: Winner Verification System

**User Story:** As an administrator, I want to verify draw winners before releasing prizes, so that I can ensure payout integrity.

#### Acceptance Criteria

1. WHEN a subscriber is identified as a draw winner, THE Platform SHALL initiate a verification process for that subscriber
2. WHEN a winner uploads a screenshot of their scores from the golf platform, THE Platform SHALL store the proof submission
3. WHEN an administrator reviews a proof submission, THE Platform SHALL allow the administrator to approve or reject the submission
4. WHEN a submission is approved, THE Platform SHALL update the payment state to Pending
5. WHEN an administrator marks a payout as completed, THE Platform SHALL update the payment state to Paid
6. IF a submission is rejected, THEN THE Platform SHALL notify the winner and allow resubmission

---

### Requirement 8: User Dashboard

**User Story:** As a subscriber, I want a personal dashboard, so that I can manage my account and track my participation.

#### Acceptance Criteria

1. THE User_Dashboard SHALL display the subscriber's current subscription status (active, inactive, or renewal date)
2. THE User_Dashboard SHALL provide a score entry and edit interface
3. THE User_Dashboard SHALL display the subscriber's selected charity and current contribution percentage
4. THE User_Dashboard SHALL display a participation summary including draws entered and upcoming draws
5. THE User_Dashboard SHALL display a winnings overview including total amount won and current payment status

---

### Requirement 9: Admin Dashboard

**User Story:** As an administrator, I want a comprehensive admin panel, so that I can manage all aspects of the platform.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL allow administrators to view and edit user profiles
2. THE Admin_Dashboard SHALL allow administrators to edit golf scores on behalf of users
3. THE Admin_Dashboard SHALL allow administrators to manage user subscriptions
4. THE Admin_Dashboard SHALL allow administrators to configure draw logic (random vs. algorithmic)
5. THE Admin_Dashboard SHALL allow administrators to run draw simulations and publish results
6. THE Admin_Dashboard SHALL allow administrators to add, edit, and delete charity listings
7. THE Admin_Dashboard SHALL allow administrators to manage charity content and media
8. THE Admin_Dashboard SHALL display a full winners list with verification status and payout state
9. THE Admin_Dashboard SHALL allow administrators to verify winner submissions and mark payouts as completed
10. THE Admin_Dashboard SHALL display reports and analytics including total users, total prize pool, charity contribution totals, and draw statistics

---

### Requirement 10: UI/UX and Frontend

**User Story:** As a visitor or subscriber, I want a modern, emotionally engaging interface, so that the platform feels inspiring rather than like a traditional golf website.

#### Acceptance Criteria

1. THE Platform SHALL implement a mobile-first, fully responsive design
2. THE Platform SHALL avoid traditional golf visual clichés as the primary design language
3. THE Platform SHALL include subtle animations and micro-interactions throughout the interface
4. THE Platform SHALL display a prominent and persuasive subscribe CTA on the homepage
5. THE Platform SHALL clearly communicate what the user does, how they win, and the charity impact on the homepage
6. THE Platform SHALL optimise assets and minimise blocking resources for fast page load performance

---

### Requirement 11: Notifications and Email

**User Story:** As a subscriber, I want to receive email notifications for important events, so that I stay informed about my account and draws.

#### Acceptance Criteria

1. WHEN a user registers, THE Platform SHALL send a confirmation email
2. WHEN a draw is published, THE Platform SHALL send draw result notifications to all subscribers
3. WHEN a user wins a draw, THE Platform SHALL send a winner alert email to the winner
4. WHEN a subscription renewal succeeds or fails, THE Platform SHALL send a notification email to the subscriber

---

### Requirement 12: Technical and Scalability

**User Story:** As a developer, I want the codebase to be structured for scalability and future expansion, so that the platform can grow without major rewrites.

#### Acceptance Criteria

1. THE Platform SHALL use secure authentication with JWT or session-based tokens and enforce HTTPS
2. THE Platform SHALL be deployed on a new Vercel account with properly configured environment variables
3. THE Platform SHALL use a new Supabase project as the backend database with a proper schema
4. THE Platform SHALL structure the architecture to support multi-country expansion
5. THE Platform SHALL structure the codebase to support a future mobile app version
6. THE Platform SHALL be extensible to support team and corporate accounts in the future
