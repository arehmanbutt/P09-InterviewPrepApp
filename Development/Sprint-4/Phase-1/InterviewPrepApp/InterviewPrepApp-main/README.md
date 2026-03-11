# InterviewPrepApp

AI-powered interview preparation platform — practice with real questions via real-time voice interaction, get adaptive difficulty scaling, and receive instant AI-generated feedback.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [For Developers](#for-developers)

---

## Overview

InterviewPrepApp is a full-stack voice interview simulator built with Next.js. It uses **Deepgram** for real-time speech-to-text and text-to-speech, **OpenAI GPT-4o** for intelligent conversation and feedback analysis, and **MongoDB** for persistent storage. Users create interviews by providing a job title, company, and description — the system automatically generates relevant questions from a question bank (or via AI), then conducts an adaptive voice interview that adjusts difficulty based on candidate performance.

The platform supports two modes:

- **Individual interviews** — a single user practices and receives personal feedback.
- **Mass interviews** — an interviewer creates a session and shares a link with multiple candidates, then reviews all results from a dashboard.

---

## Features

### Voice Interview Engine

- Real-time bidirectional voice interaction via Deepgram WebSocket streaming
- Speech-to-text using Deepgram Nova-3
- Text-to-speech with selectable voices (Asteria, Orion, Luna, Arcas)
- Natural conversational flow powered by GPT-4o function calling

### Adaptive Difficulty

- Questions scale from level 1 (basic) to level 5 (expert)
- Response quality assessment (excellent / good / partial / poor) drives difficulty adjustment
- Topic-aware selection avoids repeating similar areas within recent questions
- Bell-curve difficulty distribution (10% / 20% / 35% / 25% / 10% across levels 1-5)

### Intelligent Question Selection

- Extracts keywords from job descriptions to find relevant questions
- Matches against a MongoDB question bank with tag-based search and alias normalization
- Falls back to OpenAI generation when the question bank has insufficient coverage

### AI-Generated Feedback

- Full transcript analysis after each interview
- Overall score (1-5) with summary assessment
- Category breakdowns: Technical Knowledge, Communication, Problem Solving, Depth of Understanding
- Per-question scoring with individual assessments
- Identified strengths and areas for improvement
- Downloadable PDF reports with cover page, executive summary, and detailed breakdown

### Mass Interview Campaigns

- Create a session and share a unique join link with candidates
- Each candidate gets their own adaptive interview instance
- Dashboard view of all candidate results, scores, and transcripts
- Individual PDF report generation per candidate

### Dashboard

- View all interviews with status tracking (Scheduled / In Progress / Completed)
- Search and filter by title, company, or status
- Sort by date or name
- Edit interview details before starting
- Delete interviews with confirmation

---

## Tech Stack

| Layer          | Technology                                                         |
| -------------- | ------------------------------------------------------------------ |
| Framework      | Next.js 15 (App Router), React 19, TypeScript                      |
| Voice AI       | Deepgram SDK (Nova-3 STT, Aura TTS, Agent API)                     |
| LLM            | OpenAI GPT-4o (interview logic, question generation, feedback)     |
| Database       | MongoDB Atlas + Mongoose 9                                         |
| Authentication | Clerk (sign-up/sign-in, session management, middleware protection) |
| Styling        | Tailwind CSS 3, SASS                                               |
| PDF Generation | PDFKit                                                             |
| UI             | Lucide React (icons), Sonner (toasts), Lottie (animations)         |

---

## Architecture

```
app/
├── (dashboard)/                  # Protected routes (requires auth)
│   ├── create-interview/         # Interview creation form
│   ├── dashboard/                # Main dashboard with interview list
│   ├── feedback/[id]/            # Feedback display page
│   ├── interview/[id]/           # Live voice interview session
│   ├── interviews/[id]/candidates/  # Mass interview candidate list
│   └── layout.tsx                # Shared dashboard layout + nav
│
├── api/                          # Backend API routes
│   ├── authenticate/             # Deepgram token endpoint
│   ├── interviews/               # Interview CRUD + join + reports
│   └── candidate-sessions/       # Candidate session management + reports
│
├── components/                   # React components
│   ├── landing/                  # Landing page sections
│   ├── App.js                    # Core voice interaction component
│   ├── FeedbackDisplay.tsx       # Feedback visualization
│   ├── InterviewTranscript.tsx   # Transcript viewer
│   └── EditInterviewModal.tsx    # Interview edit form
│
├── context/                      # React context providers
│   ├── VoiceBotContextProvider   # Voice bot state (reducer-based)
│   ├── DeepgramContextProvider   # Deepgram SDK connection
│   └── MicrophoneContextProvider # Browser microphone access
│
├── lib/                          # Server-side utilities
│   ├── auth.ts                   # Clerk auth helper
│   ├── mongodb.ts                # MongoDB connection singleton
│   ├── openai.ts                 # OpenAI: question generation + feedback
│   ├── questionSelection.ts      # Question bank querying + keyword extraction
│   ├── scoring.ts                # Candidate ranking + topic matching
│   ├── sampling.ts               # Adaptive question selection algorithm
│   ├── constants.ts              # Interview configs + voice definitions
│   └── types.ts                  # Shared TypeScript interfaces
│
├── models/                       # Mongoose schemas
│   ├── Interview.ts              # Interview document
│   ├── CandidateSession.ts       # Mass interview candidate session
│   └── Question.ts               # Question bank entry
│
├── utils/                        # Client-side utilities
│   ├── deepgramUtils.ts          # WebSocket config builders
│   └── audioUtils.js             # Audio processing helpers
│
├── join/                         # Public route for mass interview candidates
├── sign-in/                      # Clerk sign-in page
├── sign-up/                      # Clerk sign-up page
├── page.tsx                      # Landing page
└── layout.tsx                    # Root layout (ClerkProvider)

scripts/
├── data/                         # Question bank JSON data
└── seed-questions.ts             # DB seed script

middleware.ts                     # Clerk route protection
```

### Database Models

**Interview** — Stores interview configuration, adaptive state, transcript, and AI feedback. Supports both individual and mass interview modes via `isMassInterview` and `shareToken` fields.

**CandidateSession** — Tracks each candidate's progress in a mass interview. Contains its own copy of the adaptive state, transcript, and feedback, independent from the parent interview template.

**Question** — Question bank entries with `question_text`, `answer_text`, `tags`, `difficulty_score` (1-5), and `rank_value` for relevance ordering.

---

## How It Works

### End-to-End Interview Flow

1. **Sign up / Sign in** via Clerk. Authenticated users are redirected to the dashboard.

2. **Create an interview** — provide a position title, company name, and job description. The server extracts keywords from the description, queries the MongoDB question bank for relevant matches (using tag aliases and fuzzy matching), and falls back to OpenAI generation if fewer than 3 relevant questions are found. A pool of questions and a difficulty sampling plan are persisted.

3. **Start the interview** — a Deepgram WebSocket connection is established for real-time voice. The AI interviewer ("Alex") greets the candidate and begins asking questions via function calling. After each answer, the LLM assesses response quality and suggests topics, which feeds into the adaptive selection algorithm to pick the next question.

4. **Adaptive selection** — the scoring engine ranks remaining questions by topic relevance (matching LLM-suggested topics against question tags) and difficulty fit (how close the question's difficulty is to the current target). A diversity penalty discourages repeating recent topics.

5. **Interview ends** — when all target questions are asked, the agent wraps up. The full transcript is sent to OpenAI for structured feedback generation (overall score, category breakdowns, per-question assessments, strengths, improvements).

6. **View feedback** — the results page shows scores, charts, and detailed breakdowns. Users can download a PDF report.

### API Endpoints

| Method   | Endpoint                                     | Description                                                  |
| -------- | -------------------------------------------- | ------------------------------------------------------------ |
| `POST`   | `/api/interviews`                            | Create a new interview (generates questions + sampling plan) |
| `GET`    | `/api/interviews`                            | List all interviews for the authenticated user               |
| `GET`    | `/api/interviews/[id]`                       | Get interview details                                        |
| `PATCH`  | `/api/interviews/[id]`                       | Update interview (status, fields, feedback)                  |
| `DELETE` | `/api/interviews/[id]`                       | Delete an interview                                          |
| `GET`    | `/api/interviews/[id]/report`                | Download PDF report                                          |
| `GET`    | `/api/interviews/[id]/candidates`            | List candidates for a mass interview                         |
| `GET`    | `/api/interviews/join/[token]`               | Check join status for a mass interview                       |
| `POST`   | `/api/interviews/join/[token]`               | Create a candidate session                                   |
| `GET`    | `/api/candidate-sessions/[sessionId]`        | Get candidate session details                                |
| `PATCH`  | `/api/candidate-sessions/[sessionId]`        | Update candidate session                                     |
| `GET`    | `/api/candidate-sessions/[sessionId]/report` | Download candidate PDF report                                |
| `POST`   | `/api/authenticate`                          | Get a Deepgram access token for WebSocket                    |

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) + [VS Code Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) **(recommended)**
- Or: [Node.js v20+](https://nodejs.org/) installed locally (via [nvm](https://github.com/nvm-sh/nvm))
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (or local MongoDB instance)

### External Service Accounts

You will need API keys from the following services:

| Service           | Purpose                            | Sign Up                                                               |
| ----------------- | ---------------------------------- | --------------------------------------------------------------------- |
| **Deepgram**      | Voice AI (STT + TTS + Agent API)   | [console.deepgram.com](https://console.deepgram.com/signup?jump=keys) |
| **OpenAI**        | LLM for interview logic + feedback | [platform.openai.com](https://platform.openai.com/)                   |
| **Clerk**         | User authentication                | [clerk.com](https://clerk.com/)                                       |
| **MongoDB Atlas** | Database                           | [mongodb.com/atlas](https://www.mongodb.com/atlas)                    |

### Option A: Dev Container (Recommended)

The fastest way to get started — provides a consistent Node 20 environment with all tools pre-configured.

```bash
# 1. Clone the repo
git clone https://github.com/ahmad4376/InterviewPrepApp.git
cd InterviewPrepApp

# 2. Create .env.local with your API keys (see Environment Variables below)

# 3. Open in VS Code → click "Reopen in Container" when prompted
#    (first time takes ~2 min to pull image and run npm install)

# 4. Start the app
npm run dev
```

### Option B: Local Setup

```bash
# Clone the repository
git clone https://github.com/ahmad4376/InterviewPrepApp.git
cd InterviewPrepApp

# Install dependencies
npm install

# Start the app
npm run dev
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Deepgram — requires "Member" role for key creation permissions
DEEPGRAM_API_KEY=your_deepgram_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# MongoDB
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/interview-prep

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

> `.env.local` is gitignored and never committed. Ask a team member for the shared dev keys.

### Seed the Question Bank (Optional)

The app can generate questions via OpenAI on the fly, but for better relevance you can seed MongoDB with a pre-built question bank:

```bash
npx tsx scripts/seed-questions.ts
```

This imports questions from `scripts/data/combined_2.json` and assigns difficulty scores heuristically based on tags.

### Run the App

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## For Developers

This section covers everything you need to know to contribute to or extend the codebase.

### Project Conventions

- **Framework**: Next.js 15 App Router with a mix of server components and client components (`"use client"` directive)
- **Language**: TypeScript throughout, with a few legacy `.js` files in `context/` and `utils/`
- **Styling**: Tailwind CSS utility classes. Global styles in `app/globals.css`. Green accent color (`#3ecf8e`) for primary actions.
- **State management**: React Context + `useReducer` for voice bot state (see `VoiceBotContextProvider` and `VoiceBotReducer`)
- **API routes**: Next.js Route Handlers in `app/api/`. All protected routes use `getAuthUserId()` from `app/lib/auth.ts`.
- **Database**: Mongoose models with a connection singleton in `app/lib/mongodb.ts`. Always call `await connectDB()` before queries.
- **Linting**: ESLint + Prettier. Run `npm run lint` to check.

### Key Architectural Patterns

**Adaptive Interview Algorithm** — The core interview logic lives in three files:

- `lib/scoring.ts` — ranks candidate questions by topic relevance and difficulty fit, applies diversity penalty
- `lib/sampling.ts` — builds the difficulty distribution plan, orchestrates `selectNextQuestion()`
- `lib/questionSelection.ts` — queries the question bank, extracts keywords, normalizes tags

The adaptive loop works client-side: Deepgram's agent calls `get_next_question` as a function call, the client intercepts it, runs `selectNextQuestion()` locally, and returns the next question text to the agent. This avoids a server round-trip for each question.

**Function Calling** — The voice agent uses two client-side function definitions:

- `get_next_question` — receives LLM analysis of the last answer, returns the next question or `{ action: "end" }`
- `end_interview` — signals the client to close the session and generate feedback

**PDF Report Generation** — uses PDFKit as a server-side streaming library. The Next.js config externalizes it via `serverComponentsExternalPackages` to avoid bundling issues.

### Running Locally

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build && npm start

# Production build (Docker)
docker build -t interview-prep-app .
docker run -p 3000:3000 --env-file .env.local interview-prep-app

# Lint check
npm run lint

# Format code
npm run format

# Type check
npm run typecheck
```

### Database Seeding

To populate or update the question bank:

```bash
npx tsx scripts/seed-questions.ts
```

The seed script reads from `scripts/data/combined_2.json` and assigns difficulty scores (1-5) based on tag heuristics. It uses upsert operations, so it is safe to run repeatedly.

### Environment Setup Notes

- **Deepgram API Key**: Must have `usage:write` permission. Select "Member" role when creating the key.
- **Clerk**: After creating a Clerk application, configure the sign-in/sign-up URLs in the Clerk dashboard to match the env vars above.
- **MongoDB**: The app connects via the `MONGO_URL` connection string. Ensure your IP is whitelisted in Atlas network access settings.

### Route Protection

Authentication is handled by Clerk middleware in `middleware.ts`:

- **Public routes**: `/`, `/sign-in(.*)`, `/sign-up(.*)`
- **Everything else** (dashboard, API routes, interview pages) requires authentication
- The `/join/[token]` route requires authentication but is accessible to any Clerk user (not just the interview creator)

### Adding a New API Route

1. Create the route file under `app/api/your-route/route.ts`
2. Import and call `getAuthUserId()` at the top for authentication
3. Import and call `connectDB()` before any database operations
4. Return `NextResponse.json(...)` for all responses

### Adding New Question Bank Topics

1. Add questions to `scripts/data/combined_2.json` following the existing schema:
   ```json
   {
     "question_id": "unique-id",
     "question_title": "Short title",
     "question_text": "The full question",
     "answer_text": "Expected answer",
     "tags": ["topic1", "topic2"],
     "rank_value": 0
   }
   ```
2. Run the seed script to import
3. Update tag alias maps in `lib/scoring.ts` if introducing new synonyms

### Extending the Adaptive Algorithm

- To change the difficulty distribution, modify `DIFFICULTY_WEIGHTS` in `lib/sampling.ts`
- To adjust how response quality maps to difficulty changes, modify `getTargetDifficulty()` in `lib/scoring.ts`
- To change topic matching behavior, update `tagsMatch()` and `TAG_ALIASES` in `lib/scoring.ts`
