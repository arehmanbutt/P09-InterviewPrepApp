# InterviewPrep

AI-powered interview preparation platform — practice with real questions via real-time voice interaction, solve coding challenges with live code execution, get adaptive difficulty scaling, and receive instant AI-generated feedback.

**[Live Demo](https://www.interviewprep.studio)** &nbsp;|&nbsp; [GitHub](https://github.com/ahmad4376/InterviewPrepApp)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Subscription Tiers](#subscription-tiers)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [For Developers](#for-developers)

---

## Overview

InterviewPrep is a full-stack AI interview platform built with Next.js 15. It supports three distinct interview modes under one product:

- **Technical Voice Interviews** — real-time bidirectional voice conversation powered by Deepgram and GPT-4o. Candidates speak their answers; the AI interviewer listens, evaluates, and adapts the next question based on response quality.
- **HR / Behavioural Voice Interviews** — the same real-time voice engine configured for soft-skills assessment: communication, cultural fit, confidence, clarity, and overall suitability are scored by a dedicated GPT-4o evaluation model.
- **Coding Interviews** — LeetCode-style challenges with a Monaco editor, multi-language execution (JavaScript, Python, C++), visible test cases, and hidden test case grading.

The platform supports both **individual practice** and **mass interview campaigns**: interviewers share a unique link or send branded email invites to candidates, then review all results, scores, and transcripts from a single dashboard. A Stripe-backed subscription model controls access: Free, Pro ($9/mo), and Business ($49/mo).

---

## Features

### Voice Interview Engine

- Real-time bidirectional voice interaction via Deepgram Voice Agent WebSocket API
- Speech-to-text using Deepgram Nova-3 (state-of-the-art accuracy)
- Text-to-speech with selectable AI voices (Asteria, Orion, Luna, Arcas)
- Natural conversational flow powered by GPT-4o function calling
- Resume upload (PDF/DOCX) parsed by AI to personalise interview questions based on the candidate's background

### Technical Interview Mode

- Adaptive difficulty scaling from level 1 (introductory) to level 5 (expert)
- Response quality assessment after each answer (excellent / good / partial / poor) drives real-time difficulty adjustment
- Topic-aware question selection avoids repeating similar areas within recent questions
- Bell-curve difficulty distribution (10% / 20% / 35% / 25% / 10% across levels 1–5)
- Per-question scoring across three dimensions: Technical Correctness, Depth, and Communication
- Post-interview AI feedback: overall score, category breakdowns, individual question assessments, strengths, and improvements

### HR / Behavioural Interview Mode

- Dedicated HR question bank targeting soft skills, motivation, and behavioural competencies
- Dedicated GPT-4o evaluation model scores five dimensions: Communication, Cultural Fit, Confidence, Clarity, and Overall Suitability
- Structured hire/no-hire recommendation with justification
- Identical voice interface to technical mode — no UX context-switch for candidates

### Coding Interview Module

- LeetCode-style problem workspace with Monaco editor (the VS Code engine)
- Multi-language support: JavaScript, Python, C++
- Code execution via a self-hosted [Piston](https://github.com/engineer-man/piston) engine — sandboxed, no external dependency at runtime
- Run code against visible test cases with real output and execution time displayed in a console panel
- Submit to run hidden test cases; pass/fail summary shown separately
- Solution tab hidden during interview mode — visible only in practice mode
- Submission history per problem, persisted to MongoDB
- Resizable split-panel layout (problem description + editor + console)
- Code persistence across browser sessions per problem per language

### Intelligent Question Selection

- Extracts keywords from the job description to find topically relevant questions
- Matches against a MongoDB question bank with tag-based search and alias normalisation
- Falls back to OpenAI question generation when the question bank has insufficient coverage
- Optional custom question list: interviewers can hand-pick specific questions before starting

### AI-Generated Feedback & Reporting

- Full transcript analysis after each interview session
- Overall score (1–5) with a written summary assessment
- Category breakdowns: Technical Knowledge, Communication, Problem Solving, Depth of Understanding
- Per-question scores with individual written assessments
- Identified strengths and concrete areas for improvement
- Downloadable PDF reports with cover page, executive summary, and detailed section-by-section breakdown

### Mass Interview Campaigns

- Create a session and share a unique join link with any number of candidates
- **Email invite dialog** — enter a list of email addresses and send branded invitation emails via Resend (up to 50 per batch)
- Each candidate runs their own fully adaptive interview instance
- Dashboard view of all candidate results, scores, and transcripts
- Side-by-side candidate comparison and relative ranking
- Individual PDF report generation per candidate

### Analytics Dashboard

- Interview volume over time (daily / weekly / monthly charts via Recharts)
- Score distribution across completed interviews
- Pipeline funnel: scheduled → in progress → completed
- Organisation-level aggregate metrics for Business tier accounts

### Team & Organisation Management

- Multiple team seats under a shared organisation (via Clerk Organisations)
- Role-based access: admin and member roles
- Custom branding and white-label support for Business accounts (logo URL, primary and secondary colour)

### Performance & Security

- **Server-side Redis caching** (Upstash) on all cacheable routes — subscription data, problem lists, interview lists, analytics, organisation branding — with automatic cache invalidation on mutations
- **Client-side localStorage seeding** — dashboard and subscription data render instantly on revisits from a 1-minute client-side cache, eliminating the loading spinner on repeat visits
- **AES-256-GCM field-level encryption** — transcripts, resume data, and candidate emails are encrypted at rest in MongoDB before storage
- **Clerk production instance** — authentication runs on a production Clerk environment with custom domain (`clerk.interviewprep.studio`), eliminating the dev-mode handshake redirect chain
- **HTTP security headers** — applied globally via `next.config.mjs`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security` (1 year + subdomains), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (blocks camera and geolocation)
- **Input sanitisation** — HTML-escaped interview titles, company names, and join URLs in email invite templates to prevent HTML injection attacks
- **ReDoS protection** — admin user search escapes regex metacharacters before passing to MongoDB `$regex` to prevent pathological backtracking on crafted inputs

---

## Subscription Tiers

| Feature                           | Free       | Pro ($9/mo) | Business ($49/mo) |
| --------------------------------- | ---------- | ----------- | ----------------- |
| Voice interviews (technical + HR) | 3 / month  | Unlimited   | Unlimited         |
| Coding problems                   | 10 / month | Unlimited   | Unlimited         |
| Detailed feedback & scoring       | Basic      | Full        | Full              |
| PDF reports                       |            | Yes         | Yes               |
| Resume parsing                    |            | Yes         | Yes               |
| Mass interviews (shareable link)  |            |             | Yes               |
| Email invite campaigns            |            |             | Yes               |
| Team seats & role management      |            |             | Yes               |
| Candidate comparison & ranking    |            |             | Yes               |
| Analytics dashboard               |            |             | Yes               |
| Custom branding / white-label     |            |             | Yes               |

Billing is powered by Stripe. Users manage plans, view usage, and access the Stripe customer portal from the **Billing** page.

---

## Tech Stack

| Layer          | Technology                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------- |
| Framework      | Next.js 15 (App Router), React 19, TypeScript                                               |
| Voice AI       | Deepgram SDK v4 — Nova-3 STT, Aura TTS, Voice Agent API (WSS)                               |
| LLM            | OpenAI GPT-4o — interview orchestration, question generation, feedback, resume parsing      |
| Code Editor    | Monaco Editor (`@monaco-editor/react`)                                                      |
| Code Execution | Piston (self-hosted on GCP Compute Engine, Docker, sandboxed)                               |
| Database       | MongoDB Atlas + Mongoose 9                                                                  |
| Caching        | Upstash Redis (`@upstash/redis`) — server-side `withCache<T>()` + localStorage client cache |
| Encryption     | AES-256-GCM field-level encryption (Node.js `crypto`)                                       |
| Authentication | Clerk — sign-up/sign-in, organisations, production instance with custom domain              |
| Payments       | Stripe — subscriptions, usage limits, customer portal, webhooks                             |
| Email          | Resend — mass interview invitation emails with verified custom domain                       |
| Styling        | Tailwind CSS 3, Radix UI primitives, Framer Motion                                          |
| Fonts          | `next/font/google` — Inter + Fira Code, Latin subset, self-hosted at build time (~55 KB)    |
| PDF Generation | PDFKit (server-side streaming)                                                              |
| Charts         | Recharts                                                                                    |
| Deployment     | Docker → GHCR → Google Kubernetes Engine (GKE); CI/CD via GitHub Actions                    |

---

## Architecture

```
app/
├── (dashboard)/                        # Protected routes (requires auth)
│   ├── create-interview/               # Interview creation flow
│   │   ├── page.tsx                    # Step 1: type (technical/HR/coding), title, company, description
│   │   ├── pick-questions/             # Step 2: optional custom question selection
│   │   └── custom-questions/           # Step 3: add/edit custom questions
│   ├── dashboard/                      # Main dashboard with interview list
│   │   └── analytics/                  # Analytics charts (Business tier)
│   ├── interview/[id]/                 # Live voice interview session
│   ├── feedback/[id]/                  # Post-interview feedback display
│   ├── interviews/[id]/
│   │   ├── candidates/                 # Mass interview candidate list + email invite dialog
│   │   │   └── [sessionId]/feedback/  # Per-candidate feedback
│   │   └── compare/                    # Side-by-side candidate comparison
│   ├── coding-results/[id]/           # Coding interview results
│   ├── billing/                        # Subscription plans + usage meter
│   ├── profile/                        # User profile (avatar, bio, job title, recent activity)
│   └── team/                           # Team management + branding
│
├── (coding)/                           # Coding interview routes
│   └── coding-interview/[slug]/        # Coding workspace (Monaco + console)
│       ├── _components/                # CodingWorkspace, ResizablePanel, LeftPanel, CodeEditor
│       └── _lib/                       # Types, language templates, hooks
│
├── (admin)/                            # Internal admin panel (ADMIN_USER_IDS gated)
│   └── admin/
│       ├── page.tsx                    # Admin overview
│       ├── users/                      # User management
│       ├── organizations/              # Organisation management
│       └── metrics/                    # Platform-wide metrics
│
├── api/                                # Next.js Route Handlers
│   ├── authenticate/                   # Issues Deepgram access tokens for WebSocket
│   ├── interviews/                     # Interview CRUD, join, report, email invite
│   ├── candidate-sessions/             # Candidate session management + PDF reports
│   ├── coding-interviews/              # Coding interview management
│   ├── leetcode/                       # Problem list/detail fetch + code execution (Piston)
│   ├── submissions/                    # Submission history + status map
│   ├── billing/                        # Stripe checkout + customer portal
│   ├── user/                           # User profile + interview summary
│   ├── parse-resume/                   # PDF/DOCX → structured resume data (via GPT-4o-mini)
│   ├── organizations/                  # Org branding + analytics (4 sub-routes)
│   ├── admin/                          # Platform metrics
│   ├── webhooks/
│   │   ├── stripe/                     # Subscription lifecycle event handler
│   │   └── clerk/                      # User sync (create/update → MongoDB)
│   └── health/                         # Health check (Kubernetes readiness + liveness probe)
│
├── components/
│   ├── App.js                          # Core voice agent interaction component
│   ├── InviteByEmailDialog.tsx         # Mass interview email invite dialog (up to 50 emails)
│   ├── analytics/                      # VolumeChart, ScoreChart, PipelineChart
│   ├── subscription/                   # UpgradePrompt, UsageMeter, TierBadge
│   ├── ui/                             # Shared UI primitives (card, button, badge, etc.)
│   ├── landing/
│   │   ├── Logo.tsx                    # App logo (public/logo.png with Mic icon fallback)
│   │   └── Header.tsx                  # Landing page header
│   ├── FeedbackDisplay.tsx             # Post-interview feedback visualisation
│   ├── InterviewTranscript.tsx         # Scrollable transcript viewer
│   └── EditInterviewModal.tsx          # Interview edit form (title, company, description)
│
├── context/
│   ├── VoiceBotContextProvider.tsx     # Voice bot state machine (reducer-based)
│   ├── DeepgramContextProvider.js      # Deepgram SDK connection management
│   └── MicrophoneContextProvider.js   # Browser microphone access (getUserMedia)
│
├── hooks/
│   └── useSubscription.ts             # Subscription data with localStorage seeding + focus refresh
│
├── lib/                               # Server-side utilities
│   ├── auth.ts                        # Clerk auth helper (getAuthUserId)
│   ├── mongodb.ts                     # MongoDB connection singleton
│   ├── redis.ts                       # Upstash Redis singleton + withCache<T>() helper
│   ├── encryption.ts                  # AES-256-GCM field encrypt/decrypt
│   ├── openai.ts                      # OpenAI: question gen, feedback, HR evaluation, score summary
│   ├── questionSelection.ts           # Question bank querying + keyword extraction
│   ├── scoring.ts                     # Candidate ranking + topic matching
│   ├── sampling.ts                    # Adaptive question selection algorithm
│   ├── resumeParser.ts                # PDF/DOCX → structured ResumeData (via GPT-4o-mini)
│   ├── constants.ts                   # Interview configs + voice definitions
│   ├── subscription/                  # Tier definitions + usage gating helpers
│   └── types.ts                       # Shared TypeScript interfaces
│
├── models/                            # Mongoose schemas
│   ├── Interview.ts                   # Interview document (voice + coding + mass)
│   ├── CandidateSession.ts            # Mass interview candidate session
│   ├── Question.ts                    # Voice interview question bank entry
│   ├── LeetcodeQuestion.ts            # Coding problem (description, test cases, templates)
│   ├── Submission.ts                  # Code submission record
│   ├── Organization.ts                # Org branding + settings
│   └── User.ts                        # User + subscription tier + usage counters + profile fields
│
├── utils/
│   ├── deepgramUtils.ts               # WebSocket config builders
│   └── audioUtils.js                  # PCM audio buffering + scheduling helpers
│
├── join/[token]/session/[sessionId]/  # Public-facing candidate interview route
├── pricing/                           # Public pricing page
├── sign-in/                           # Clerk sign-in page (custom dark theme)
├── sign-up/                           # Clerk sign-up page (custom dark theme)
├── page.tsx                           # Landing page (ISR, revalidates every 1h)
└── layout.tsx                         # Root layout (ClerkProvider, ThemeProvider, Toaster)

scripts/
├── data/                              # Question bank JSON source data
├── seed-questions.ts                  # Seeds the MongoDB Question collection
└── sync-clerk-users.ts                # Backfills Clerk users → MongoDB (one-time use)

piston/
├── docker-compose.yml                 # Run Piston on a VPS (Docker + privileged mode)
└── install-runtimes.sh                # Installs JavaScript, Python, and C++ runtimes via Piston API

k8s/                                   # Kubernetes manifests (GKE deployment)
├── deployment.yaml                    # App deployment (2 replicas, rolling update, resource limits)
├── service.yaml                       # LoadBalancer service
├── namespace.yaml                     # interview-prep namespace
└── secrets.template.yaml              # Documents all required secret keys

middleware.ts                          # Clerk route protection
Dockerfile                             # Production container (Next.js standalone output)
```

### Database Models

**Interview** — Interview configuration, adaptive state, transcript (AES-256-GCM encrypted), and AI-generated feedback. Supports individual and mass interview modes via `isMassInterview` and `shareToken` fields. Stores `interviewType` (`technical` / `hr` / `coding`).

**CandidateSession** — Tracks each candidate's progress within a mass interview. Contains its own adaptive state, transcript (encrypted), feedback, and `candidateEmail` (encrypted).

**Question** — Question bank entries with `question_text`, `answer_text`, `tags`, `difficulty_score` (1–5), and `rank_value` for relevance ordering.

**LeetcodeQuestion** — Coding problem with description, examples, visible test cases, hidden test cases, per-language starter code templates, driver code, and difficulty bucket (`easy` / `medium` / `hard`).

**Submission** — Records each code submission: user, problem, language, code, pass/fail counts, and hidden test case summary.

**User** — Clerk user reference with subscription tier (`free` / `pro` / `business`), usage counters (monthly resets), Stripe customer and subscription IDs, and profile fields (`bio`, `jobTitle`, `resumeData`).

**Organization** — Clerk org reference with custom branding fields (`logoUrl`, `primaryColor`, `secondaryColor`, `companyName`).

**UsageRecord** — Tracks per-user monthly usage events (interview starts, code submissions) for billing and analytics. Enables server-side enforcement of tier limits with monthly resets.

---

## How It Works

### End-to-End Voice Interview Flow

1. **Sign up / Sign in** via Clerk. Authenticated users are redirected to the dashboard.

2. **Create an interview** — select an interview type (Technical, HR, or Coding), then provide a position title, company name, and job description. Optionally upload a resume (PDF or DOCX): the server extracts the raw text and uses GPT-4o-mini to parse it into structured data (skills, experience, projects, education), which is injected into the AI interviewer's system prompt for personalised questions. The server also extracts keywords from the job description, queries the MongoDB question bank for relevant matches, and falls back to OpenAI question generation if fewer than 3 relevant questions are found.

3. **Start the interview** — a Deepgram Voice Agent WebSocket connection is established for real-time voice. The AI interviewer greets the candidate and begins asking questions via GPT-4o function calling. After each answer, the LLM assesses response quality and suggests follow-up topics, which feeds the adaptive selection algorithm to pick the next question.

4. **Adaptive selection (technical mode)** — the scoring engine in `lib/scoring.ts` ranks remaining questions by topic relevance (matching LLM-suggested topics against question tags with tag alias normalisation) and difficulty fit. A diversity penalty discourages repeating recently covered topics.

5. **Interview ends** — when all target questions are answered, the agent wraps up. The transcript is sent to the appropriate feedback pipeline:

   - **HR interviews**: `evaluateHRInterview()` scores five dimensions (Communication, Cultural Fit, Confidence, Clarity, Overall Suitability) and returns a hire/no-hire recommendation.
   - **Technical interviews with per-question scores**: `generateScoreSummary()` aggregates the live scores and generates a written summary with `generateScoreSummary()`.
   - **Legacy fallback**: `generateFeedback()` runs a full transcript analysis when no per-question scores are available.

6. **View feedback** — the results page shows scores, charts, and detailed breakdowns. PDF reports can be downloaded.

### End-to-End Coding Interview Flow

1. A coding interview is created with a set of problems (fetched from the `LeetcodeQuestion` collection).
2. The candidate works in the Monaco editor, selecting JavaScript, Python, or C++.
3. **Run** executes visible test cases via the self-hosted Piston API and displays output, execution time, and errors in the console panel.
4. **Submit** runs both visible and hidden test cases. Visible results are shown in full; hidden test case results are summarised as pass/fail counts. Solution code is stripped from the API response during interview mode.
5. Submission history is persisted per user and problem and shown in the Submissions tab.

### Caching Layer

All cacheable routes use a `withCache<T>(key, ttlSeconds, fn)` helper backed by Upstash Redis. On a cache miss the function executes and the result is stored; on a hit the stored value is returned without touching MongoDB. Mutations call `getRedis().del(key)` to invalidate immediately.

| Route / Data              | Cache key                               | TTL    |
| ------------------------- | --------------------------------------- | ------ |
| Subscription data         | `sub:<clerkId>`                         | 60 s   |
| Interview list (per page) | `interviews:<scope>:page:<n>:limit:<n>` | 30 s   |
| Coding problem list       | `problems:list:...`                     | 1 hour |
| Coding problem detail     | `problem:<id>`                          | 7 days |
| Submission status map     | `submissions:statusmap:<userId>`        | 60 s   |
| Submission history        | `submissions:history:<userId>:<id>`     | 30 s   |
| Admin metrics             | `admin:metrics`                         | 5 min  |
| Organisation branding     | `org:<orgId>:branding`                  | 5 min  |
| Analytics (4 routes)      | `org:<orgId>:analytics:*`               | 5 min  |

The landing page uses Next.js `export const revalidate = 3600` for edge-level ISR caching.

The `useSubscription` hook seeds its initial state from `localStorage` (1-minute TTL) so the UI renders instantly on revisit, then refreshes in the background and on window focus.

### API Endpoints

| Method   | Endpoint                                     | Description                                                 |
| -------- | -------------------------------------------- | ----------------------------------------------------------- |
| `POST`   | `/api/interviews`                            | Create interview (generates questions + sampling plan)      |
| `GET`    | `/api/interviews`                            | List interviews (paginated, Redis cached)                   |
| `GET`    | `/api/interviews/[id]`                       | Get interview details (transcript decrypted)                |
| `PATCH`  | `/api/interviews/[id]`                       | Update interview (status, fields, feedback generation)      |
| `DELETE` | `/api/interviews/[id]`                       | Delete an interview                                         |
| `GET`    | `/api/interviews/[id]/report`                | Stream PDF report download                                  |
| `GET`    | `/api/interviews/[id]/candidates`            | List candidates for a mass interview                        |
| `GET`    | `/api/interviews/[id]/candidates/compare`    | Side-by-side candidate comparison data                      |
| `GET`    | `/api/interviews/[id]/candidates/export`     | Export all candidate data as CSV                            |
| `POST`   | `/api/interviews/[id]/invite`                | Send branded email invites via Resend (up to 50 addresses)  |
| `GET`    | `/api/interviews/join/[token]`               | Validate join token for a mass interview                    |
| `POST`   | `/api/interviews/join/[token]`               | Create a candidate session                                  |
| `GET`    | `/api/candidate-sessions/[sessionId]`        | Get candidate session details (transcript decrypted)        |
| `PATCH`  | `/api/candidate-sessions/[sessionId]`        | Update candidate session (status, transcript, feedback)     |
| `GET`    | `/api/candidate-sessions/[sessionId]/report` | Stream per-candidate PDF report                             |
| `POST`   | `/api/authenticate`                          | Issue a short-lived Deepgram token for WebSocket connection |
| `POST`   | `/api/parse-resume`                          | Parse uploaded PDF/DOCX → structured ResumeData             |
| `GET`    | `/api/leetcode`                              | List coding problems (Redis cached, 1 h)                    |
| `GET`    | `/api/leetcode/[id]`                         | Get a single coding problem (Redis cached, 7 days)          |
| `POST`   | `/api/leetcode/execute`                      | Execute code via Piston, persist submission, bust caches    |
| `GET`    | `/api/submissions`                           | Submission history + status map for the authenticated user  |
| `GET`    | `/api/coding-interviews/[id]`                | Get coding interview metadata                               |
| `GET`    | `/api/user/profile`                          | Get user profile (bio, jobTitle)                            |
| `PATCH`  | `/api/user/profile`                          | Update user profile                                         |
| `GET`    | `/api/user/interviews-summary`               | Last 5 completed interviews (for profile page)              |
| `POST`   | `/api/billing/checkout`                      | Create a Stripe checkout session                            |
| `POST`   | `/api/billing/portal`                        | Open Stripe customer billing portal                         |
| `GET`    | `/api/billing/subscription`                  | Subscription tier + usage counters (Redis cached, 60 s)     |
| `POST`   | `/api/webhooks/stripe`                       | Handle Stripe subscription lifecycle events                 |
| `POST`   | `/api/webhooks/clerk`                        | Sync Clerk user create/update events → MongoDB              |
| `GET`    | `/api/health`                                | Health check (Kubernetes readiness and liveness probe)      |

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) + [VS Code Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) **(recommended — provides a consistent Node 20 environment)**
- Or: [Node.js v20+](https://nodejs.org/) installed locally (via [nvm](https://github.com/nvm-sh/nvm))
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (M0 free tier is sufficient for development)

### External Services Required

| Service           | Purpose                                         | Sign Up                                                               |
| ----------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| **Deepgram**      | Voice AI — STT, TTS, and Voice Agent API        | [console.deepgram.com](https://console.deepgram.com/signup?jump=keys) |
| **OpenAI**        | LLM — interview logic, feedback, resume parsing | [platform.openai.com](https://platform.openai.com/)                   |
| **Clerk**         | Authentication and organisations                | [clerk.com](https://clerk.com/)                                       |
| **MongoDB Atlas** | Primary database                                | [mongodb.com/atlas](https://www.mongodb.com/atlas)                    |
| **Upstash**       | Redis caching                                   | [upstash.com](https://upstash.com/)                                   |
| **Resend**        | Email invitations for mass interviews           | [resend.com](https://resend.com/)                                     |
| **Stripe**        | Subscription billing (optional for local dev)   | [stripe.com](https://stripe.com/)                                     |

### Option A: Dev Container (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/ahmad4376/InterviewPrepApp.git
cd InterviewPrepApp

# 2. Create .env.local with your API keys (see Environment Variables below)

# 3. Open in VS Code → click "Reopen in Container" when prompted
#    First-time setup takes ~2 minutes to pull the Node 20 image and run npm install

# 4. Start the development server
npm run dev
```

### Option B: Local Setup

```bash
git clone https://github.com/ahmad4376/InterviewPrepApp.git
cd InterviewPrepApp
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file in the project root:

```env
# ── Deepgram ─────────────────────────────────────────────────────────────────
# Requires "Member" role for key creation permissions in the Deepgram console.
DEEPGRAM_API_KEY=your_deepgram_api_key

# ── OpenAI ───────────────────────────────────────────────────────────────────
OPENAI_API_KEY=your_openai_api_key

# ── MongoDB ──────────────────────────────────────────────────────────────────
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/interview-prep

# ── Clerk ────────────────────────────────────────────────────────────────────
# For local development, use a Clerk development instance (pk_test_... / sk_test_...).
# For production, create a Clerk production instance (pk_live_... / sk_live_...).
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...         # From Clerk Dashboard → Webhooks → signing secret

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ── Admin panel ──────────────────────────────────────────────────────────────
# Comma-separated Clerk user IDs that can access /admin
ADMIN_USER_IDS=user_abc123,user_def456

# ── Upstash Redis ─────────────────────────────────────────────────────────────
# From upstash.com → create database → REST API tab
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# ── Field-level encryption ────────────────────────────────────────────────────
# Generate with: npx tsx app/lib/generateEncryptionKey.ts
ENCRYPTION_KEY=64_hex_characters

# ── Resend (email invitations) ────────────────────────────────────────────────
RESEND_API_KEY=re_...
# Optional: set a verified sender domain. Falls back to onboarding@resend.dev if unset.
RESEND_FROM_EMAIL=noreply@yourdomain.com

# ── Piston (code execution engine) ───────────────────────────────────────────
# Self-hosted — see piston/ directory. Defaults to http://localhost:2000 if unset.
PISTON_API_URL=http://your-vps-ip:2000

# ── Stripe (optional for local dev) ──────────────────────────────────────────
# Billing features are disabled if these are absent.
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ── App URL ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> `.env.local` is gitignored and never committed. Share real keys with team members via a secure channel.

### Generate an Encryption Key

```bash
npx tsx app/lib/generateEncryptionKey.ts
# Output: ENCRYPTION_KEY=<64 hex chars>
# Copy the output value into .env.local
```

### Add Your Logo

Place your logo at `public/logo.png`. It will automatically appear in the navigation bar, sidebar, and sign-in/sign-up pages. The app falls back gracefully to a Mic icon if the file is absent.

### Self-Host Piston (Code Execution Engine)

Piston runs on a separate server and handles sandboxed code execution for coding interviews. It requires Docker with privileged mode enabled.

```bash
# On your server
cd piston/
docker compose up -d

# Install language runtimes (JavaScript, Python, C++)
./install-runtimes.sh

# Verify runtimes are available
curl http://localhost:2000/runtimes

# Then set in your app environment:
# PISTON_API_URL=http://<your-server-ip>:2000
```

Open port 2000 on your server's firewall. If your app is running on a cloud host (e.g., Vercel), the Piston server must have a publicly reachable IP address — an internal VPC IP will not be accessible.

### Stripe Webhooks

**Local development** — use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the whsec_... signing secret → set as STRIPE_WEBHOOK_SECRET in .env.local
```

**Production** — register the endpoint in the Stripe Dashboard:

1. **Stripe Dashboard → Developers → Webhooks → Add endpoint**
2. URL: `https://your-domain.com/api/webhooks/stripe`
3. Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`
4. Copy the **Signing secret** → set as `STRIPE_WEBHOOK_SECRET` in your production environment

### Clerk Webhooks

**Production** — in the Clerk Dashboard for your production instance:

1. **Clerk Dashboard → Webhooks → Add endpoint**
2. URL: `https://your-domain.com/api/webhooks/clerk`
3. Events: `user.created`, `user.updated`
4. Copy the **Signing secret** → set as `CLERK_WEBHOOK_SECRET`

### Seed the Question Bank (Optional)

The app falls back to OpenAI-generated questions on the fly, but you can seed MongoDB with a pre-built question bank for improved relevance and consistency:

```bash
npx tsx scripts/seed-questions.ts
```

### Backfill Existing Clerk Users to MongoDB

If users signed up before the Clerk webhook was configured, run the backfill script to sync them to MongoDB:

```bash
npx tsx scripts/sync-clerk-users.ts
```

This paginates through all Clerk users and upserts them to MongoDB without overwriting existing subscription data.

---

## For Developers

### Project Conventions

- **Framework**: Next.js 15 App Router with server components by default; `"use client"` directive used for interactive components.
- **Language**: TypeScript throughout. A small number of legacy `.js` files remain in `context/` and `utils/`.
- **Styling**: Tailwind CSS utility classes. Global styles in `app/globals.css`. Green accent (`#3ecf8e`) for primary actions.
- **State management**: React Context + `useReducer` for voice bot state (`VoiceBotContextProvider`).
- **API routes**: Next.js Route Handlers in `app/api/`. Every protected handler calls `getAuthUserId()` from `app/lib/auth.ts` as its first action.
- **Database**: Mongoose models with a connection singleton in `app/lib/mongodb.ts`. Always `await connectDB()` before any query.
- **Caching**: Wrap DB reads with `withCache(key, ttlSeconds, fn)` from `app/lib/redis.ts`. Call `getRedis().del(key)` on any mutation that affects cached data.
- **Encryption**: Use `encryptField(plaintext)` / `decryptField(ciphertext)` from `app/lib/encryption.ts` for sensitive fields before writing to MongoDB. The `safeDecryptJson()` helper in the GET routes handles backward compatibility with pre-encryption rows.
- **Linting**: ESLint + Prettier with Husky pre-commit hooks and lint-staged. Run `npm run lint` before pushing.

### Key Architectural Patterns

**Adaptive Interview Algorithm** — spread across three files:

- `lib/scoring.ts` — ranks candidate questions by topic relevance (tag matching with alias normalisation) and difficulty fit; applies a diversity penalty to suppress recently covered topics.
- `lib/sampling.ts` — builds the difficulty distribution plan (bell-curve weights) and orchestrates `selectNextQuestion()`.
- `lib/questionSelection.ts` — queries the question bank, extracts keywords from job descriptions, normalises tags.

The adaptive loop runs client-side: Deepgram's agent calls `get_next_question` as a function call, the client intercepts it, executes `selectNextQuestion()` locally, and returns the next question text back to the agent — eliminating a server round-trip per question.

**GPT-4o Function Calling** — the voice agent is configured with two client-side function definitions:

- `get_next_question(topic_assessment, quality)` — receives the LLM's analysis of the last answer and returns either the next question or `{ action: "end" }` when all questions are exhausted.
- `end_interview()` — signals the client to gracefully close the session and trigger feedback generation.

**HR Evaluation Pipeline** — dedicated to behavioural interviews:

- `lib/openai.ts` → `evaluateHRInterview(transcript, title, company)` sends the full transcript to GPT-4o with a structured JSON schema that produces scores for Communication, Cultural Fit, Confidence, Clarity, and Overall Suitability, plus a hire/no-hire `recommendation` string and `structuredFeedback`.

**Resume Parsing Pipeline** — `lib/resumeParser.ts`:

1. Receives a `Buffer` and MIME type (PDF or DOCX).
2. Extracts raw text via `pdf-parse` (PDF) or `mammoth` (DOCX).
3. Sends the raw text to GPT-4o-mini with a structured JSON schema prompt.
4. Returns a typed `ResumeData` object (name, skills, experience, education, projects, certifications).
5. `formatResumeForPrompt()` converts this into an LLM-readable string injected into the interviewer system prompt.

**Subscription & Usage Gating** — the `useSubscription()` hook fetches the user's tier and usage counters with a `localStorage` seed (renders instantly on revisit) and a 2-minute stale window that refreshes on window focus. The `UpgradePrompt` component renders in-place when the user's usage exceeds their tier's limits. Counters are incremented server-side at the API layer before interviews start or code is submitted.

**PDF Report Generation** — PDFKit streams the PDF directly in the Route Handler response. Next.js externalises PDFKit via `serverExternalPackages` in `next.config.mjs` to prevent bundling issues.

**Field-Level Encryption** — `lib/encryption.ts` implements AES-256-GCM with a fresh random 96-bit IV per encryption operation. The format stored in MongoDB is `<iv_hex><authTag_hex><ciphertext_hex>` (all concatenated). Decryption is backward-compatible: if the stored value does not match this format (i.e., it is a pre-encryption plain value), it is returned unchanged.

### Running Locally

```bash
# Development server with hot reload
npm run dev

# Production build (Node.js)
npm run build && npm start

# Production build (Docker)
docker build -t interview-prep-app .
docker run -p 3000:3000 --env-file .env.local interview-prep-app

# Lint
npm run lint

# Format
npm run format

# Type check
npm run typecheck
```

### Adding a New API Route

1. Create `app/api/your-route/route.ts`
2. Call `getAuthUserId()` at the top of every handler; return 401 if null
3. Call `connectDB()` before any Mongoose operation
4. Wrap cacheable reads with `withCache(key, ttlSeconds, fn)`
5. Call `getRedis().del(key)` after any write that affects cached data
6. Return `NextResponse.json(...)` for all responses

### Testing

End-to-end tests are in `tests/` and run with [Playwright](https://playwright.dev/). To run them locally:

```bash
npx playwright install   # first-time only
npx playwright test
# HTML report written to test-results/
```

The CI pipeline does not run E2E tests automatically — they are intended for local verification before merging significant UI changes.

### CI / CD Pipeline

On every push to `main`, three jobs run sequentially:

1. **ci** — format check → lint → typecheck → build (using a dev Clerk publishable key so the build succeeds without production secrets)
2. **build-and-push** — builds the Docker image and pushes it to GHCR (`ghcr.io/ahmad4376/interviewprepapp:<sha>`)
3. **deploy** — authenticates to GCP, rebuilds the `interview-prep-secrets` Kubernetes secret from GitHub Secrets, applies `k8s/deployment.yaml` with the new image tag, and waits for the rolling update to complete

Pull requests run only the `ci` job — no image push or deployment.

All required secrets are documented in `k8s/secrets.template.yaml`. They must be added to **GitHub → Settings → Secrets and variables → Actions** before the deploy job will succeed. The GHCR package must be set to **Public** visibility so GKE can pull the image without a pull secret.

### Environment Setup Notes

| Variable                       | Notes                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `DEEPGRAM_API_KEY`             | Must be created with the "Member" role in the Deepgram console to have `usage:write` permission                               |
| `CLERK_SECRET_KEY`             | Use `sk_test_...` for local dev (development instance), `sk_live_...` for production (production instance)                    |
| `CLERK_WEBHOOK_SECRET`         | Each Clerk instance (dev and prod) has a separate signing secret — do not mix them                                            |
| `MONGO_URL`                    | Ensure your IP address is whitelisted in Atlas → Network Access                                                               |
| `UPSTASH_REDIS_REST_URL/TOKEN` | The app degrades gracefully if Redis is unavailable — requests fall through to MongoDB                                        |
| `ENCRYPTION_KEY`               | Must be a 64-character hex string (32 bytes). Generate with the included script. Once data is written, do not change this key |
| `PISTON_API_URL`               | Must be a publicly reachable URL if your app server is on a cloud host. GCP internal IPs are not reachable from Vercel        |
| `RESEND_FROM_EMAIL`            | Requires a verified sender domain in Resend. Omit to use `onboarding@resend.dev` (no domain verification required)            |
