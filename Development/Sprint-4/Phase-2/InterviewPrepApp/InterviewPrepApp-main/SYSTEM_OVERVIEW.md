# InterviewPrepApp - Complete System Overview

## 1. WHAT IS THIS APP?

**InterviewPrepApp** is an AI-powered platform for conducting technical and HR interviews with adaptive question selection, real-time voice AI, and automated candidate scoring.

### Key Use Cases:

1. **Self-Study:** Individuals practice interviews with adaptive difficulty
2. **Team Hiring:** Organizations conduct interviews with multiple candidates and compare results
3. **Mass Interviews:** Share interviews via public links for bulk candidate screening
4. **Custom Interviews:** Fixed question sets or adaptive pools

---

## 2. CORE FEATURES

### A. Live Voice Interviews

- **Voice AI Interviewer:** Deepgram Voice Agent (real-time conversation)
- **Question Types:**
  - **Technical:** Adaptive difficulty based on correctness/depth/communication scores
  - **HR:** Behavioral screening (communication, confidence, clarity)
  - **Coding:** LeetCode-style problems with live code execution
- **Fixed vs. Adaptive:**
  - Fixed: Exact question order (for standardized interviews)
  - Adaptive: Question difficulty dynamically adjusted based on performance

### B. Question Pools & Sampling

- Upload question bank or use pre-loaded pools
- **Sampling Strategy:** 80/20 distribution (80% commonly tested + 20% rare topics)
- Questions grouped by difficulty buckets (easy, medium, hard)
- Adaptive selection: Next question chosen based on:
  - Previous answer scores
  - Current difficulty level
  - Topic coverage

### C. Candidate Scoring

- **Technical Scoring (0-5 each):**
  - Correctness: How well answer matches expected response
  - Depth: Thoroughness and examples provided
  - Communication: Clarity and articulation
- **HR Scoring (0-5 each):**
  - Communication: Verbal fluency and engagement
  - Confidence: Poise and composure
  - Clarity: Topic focus and conciseness
- **Overall Score:** Weighted average across dimensions
- **Category Mapping:** Very Low, Borderline, Acceptable, Strong

### D. Team & Organization Management

- Multi-tenant org structure (Clerk Organizations)
- Team members with roles: org:admin, org:member, org:viewer
- Seat limits based on plan (free=5, business=unlimited)
- Custom branding per organization

### E. Interview Sharing

- Generate shareable interview links (unique token per session)
- Candidates answer without login
- Responses saved as "Candidate Sessions"
- Comparison dashboard for hiring teams

### F. Reporting & Analytics

- Per-candidate feedback report
- Aggregate team analytics (score distributions, pass rates)
- CSV/PDF exports
- Admin dashboards for global metrics

---

## 3. TECHNOLOGY STACK

### Frontend

- **Framework:** Next.js 15 (React 19)
- **Styling:** Tailwind CSS + Radix UI components
- **Audio Handling:** Web Audio API (native createAudioBuffer, AudioContext)
- **WebSocket:** Deepgram SDK + custom context
- **Charts:** Recharts (analytics dashboards)

### Backend

- **Runtime:** Node.js 20+
- **Framework:** Next.js API Routes
- **Database:** MongoDB (Mongoose ODM)
- **Auth:** Clerk (user identity + org management)
- **Billing:** Stripe (subscription + usage tracking)
- **Voice AI:** Deepgram Voice Agent v1 (WebSocket)
- **LLM:** OpenAI GPT-4o (scoring, analysis)
- **Code Execution:** Piston API
- **Document Parsing:** Mammoth (Word), pdf-parse (PDF)

### Deployment

- Docker (standalone output)
- GKE (Google Kubernetes Engine)
- Environment: `.env.local` (secrets), `.env.development` (public)

---

## 4. DATA MODELS & RELATIONSHIPS

### A. User

```
{
  clerkId: string (unique, from Clerk)
  email: string
  stripeCustomerId: string | null
  subscription: {
    tier: "free" | "pro" | "business"
    status: "active" | "canceled" | "past_due" | "trialing" | "unpaid"
    stripeSubscriptionId: string | null
    stripePriceId: string | null
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
  }
  resumeData: {
    name?: string
    email?: string
    phone?: string
    skills?: string[]
    experience?: Array<{ title, company, duration }>
    education?: Array<{ degree, school, year }>
    ...
  } | null
  teamId: string | null (Clerk org ID if member)
  teamRole: "owner" | "admin" | "member" | null
  createdAt: Date
  updatedAt: Date
}
```

### B. Interview

```
{
  userId: string (creator's clerkId, indexed)
  organizationId: string | null (Clerk org if team interview)
  title: string (job title)
  company: string
  description: string
  interviewType: "technical" | "hr"
  jobLevel: "associate" | "junior" | "mid" | "senior" | "lead" | null

  // Static questions (for fixed interviews)
  questions: Array<{ text: string, topic: string }>

  // Adaptive interview state
  questionPool: Array<{
    question_id: string
    question_title: string
    question_text: string
    answer_text: string (expected answer)
    tags: string[] (topics)
    difficulty_score: number
  }>
  samplingPlan: number[] (indices into questionPool, 80/20 distribution)
  currentQuestionId: string | null
  currentQuestionText: string
  currentExpectedAnswer: string
  questionsAsked: number
  totalQuestions: number
  currentPlanIndex: number

  // Results
  status: "scheduled" | "in-progress" | "completed"
  transcript: Array<{ role: "user" | "assistant", content: string }>
  feedback: {
    overallScore: number (0-100)
    summary: string
    aggregateScores: {
      correctness: number
      depth: number
      communication: number
    }
    questionScores: Array<{
      questionId: string
      scores: { correctness, depth, communication }
      overallScore: number
      category: "very_low" | "borderline" | "acceptable" | "strong"
      rationale: string
      userResponse: string
      expectedAnswer: string
    }>
    strengths: string[]
    improvements: string[]
    hrEvaluation?: { // For HR interviews
      communication: number
      culturalFit: number
      confidence: number
      clarity: number
      overallSuitability: number
      recommendation: "hire" | "consider" | "reject"
      structuredFeedback: string
    }
  } | null

  // Mass interview
  isMassInterview: boolean
  isCustomInterview: boolean
  shareToken: string | null (unique, for public link)
  resumeData: ResumeData | null
  createdAt: Date
  updatedAt: Date
}
```

### C. CandidateSession

```
{
  interviewId: ObjectId (ref to Interview)
  candidateUserId: string (Clerk ID if logged in, or auto-generated)
  candidateName: string
  candidateEmail: string
  jobLevel: string | null

  // Same adaptive state as Interview
  questionPool: Array<...>
  samplingPlan: number[]
  currentQuestionId: string | null
  currentQuestionText: string
  currentExpectedAnswer: string
  questionsAsked: number
  totalQuestions: number
  currentPlanIndex: number

  // Results
  status: "scheduled" | "in-progress" | "completed"
  transcript: Array<...>
  feedback: InterviewFeedback | null

  createdAt: Date
  updatedAt: Date
}
```

### D. Organization

```
{
  clerkOrgId: string (unique, from Clerk)
  plan: "free" | "business"
  seatLimit: number (free=5, business=unlimited)
  branding: {
    logoUrl: string | null
    primaryColor: string | null
    secondaryColor: string | null
    companyName: string | null
  }
  usageStats: {
    interviewsThisMonth: number (tracking for free tier limits)
    lastResetAt: Date
  }
  createdAt: Date
  updatedAt: Date
}
```

### E. CodingInterview

```
{
  userId: string
  organizationId: string | null
  leetcodeQuestionId: number (mapped to LeetCode problem)
  title: string (problem title)
  description: string
  difficulty: "easy" | "medium" | "hard"

  // Coding state
  code: string (current solution)
  language: string (python, javascript, etc.)
  status: "draft" | "submitted" | "completed"

  // Results
  submissionStatus: "accepted" | "wrong_answer" | "runtime_error" | "compile_error"
  testResults: Array<{ testCase: string, passed: boolean, actual: string, expected: string }>
  executionTime: number (milliseconds)
  memoryUsage: number (MB)

  feedback: {
    overallScore: number
    efficiency: number (time + space complexity)
    correctness: number
    codeQuality: number
  } | null

  createdAt: Date
  updatedAt: Date
}
```

### F. Question

```
{
  text: string
  topic: string (e.g., "closures", "async", "system-design")
  difficulty: number (1-5)
  expectedAnswer: string
  tags: string[]
  poolId: string | null (groups by interview type)
  createdAt: Date
}
```

### G. LeetcodeQuestion

```
{
  leetcodeId: number
  title: string
  slug: string
  difficulty: "Easy" | "Medium" | "Hard"
  categories: string[]
  description: string
  exampleCases: Array<{ input: string, output: string, explanation: string }>
  constraints: string
  codeSnippets: Array<{ language: string, code: string }>
  cached: true
}
```

---

## 5. CORE WORKFLOWS

### Workflow A: Individual Interview (Fixed Questions)

```
1. User authenticates via Clerk
2. User creates interview:
   - Job title, company, description
   - Upload resume (optional) → parsed into resumeData
   - Select job level
   - Choose "Fixed Questions" or "Adaptive Pool"
   - Add custom questions or select from pool
3. Deepgram Voice Agent initialized with config:
   - Greeting + numbered questions
   - Input: 16kHz linear16 PCM (from WebRTC mic)
   - Output: 24kHz linear16 PCM (streamed to speakers)
4. Live interview flow:
   - Agent asks question 1
   - Candidate responds via microphone
   - Deepgram transcribes speech → text
   - OpenAI scores response: correctness, depth, communication
   - Transcript + score saved to Interview.transcript
   - Agent acknowledges, asks next question
5. Interview ends when all questions answered
6. OpenAI generates summary feedback:
   - Overall score (0-100)
   - Aggregate scores
   - Per-question scores
   - Strengths/improvements
7. User reviews feedback on report page
```

### Workflow B: Adaptive Interview (Dynamic Questions)

```
1-2. Same as Fixed, but select "Adaptive Pool"
3. Adaptive config initialized:
   - Function calling enabled: get_next_question()
   - Agent doesn't know questions in advance
   - Must call function after EVERY answer
4. Live adaptive flow:
   - Agent says "Ready to start" (calls get_next_question with initial neutral scores)
   - Server-side questionSelection algorithm:
     a) Load question pool (bucketed by difficulty)
     b) Apply samplingPlan (80/20 distribution)
     c) Based on suggested_topics, select next difficulty:
        - If "move_on" → new topic (may shift difficulty)
        - If "go_deeper" → same topic, related question
        - If "clarify" → followup on same question
     d) Return { question, expectedAnswer, action }
   - Agent receives question, reads naturally to candidate
   - Candidate answers
   - Agent scores: correctness (0-5), depth (0-5), communication (0-5)
   - Agent suggests next_action + topics for adaptive selection
   - Agent calls get_next_question with scores
   - Process repeats
5. Interview ends when sampling plan exhausted or get_next_question returns { action: "end" }
6. OpenAI generates adaptive feedback (same as fixed)
```

### Workflow C: HR Screening Interview

```
Same as adaptive, but:
- interviewType = "hr"
- Scoring dimensions: communication, confidence, clarity (not correctness, depth)
- Agent persona: "Sarah" (warm, encouraging HR pro, not cold technical interviewer)
- Questions focus on: career goals, teamwork, conflict resolution, culture fit
- Expected answer field contains HR evaluation criteria (not technical answer)
- hrEvaluation object in feedback includes: recommendation (hire/consider/reject)
```

### Workflow D: Coding Interview

```
1. User selects coding interview type
2. User or system provides LeetCode problem (cached in LeetcodeQuestion)
3. Monaco editor displayed with code skeleton
4. Candidate writes solution in selected language
5. Submit → calls Piston API:
   - Sends code + language + test cases
   - Returns: testResults, executionTime, memoryUsage
   - Status: accepted, wrong_answer, runtime_error, etc.
6. OpenAI scores efficiency, correctness, code quality
7. Report shows test results + feedback
```

### Workflow E: Mass Interview (Sharing)

```
1. Interview creator sets isMassInterview = true
2. generateShareToken() → creates unique token
3. Creator shares interview link: /interviews/join/[token]
4. Candidate visits link (no login required):
   - Clerk redirect to sign-in/sign-up (OR allow anonymous)
   - Actually, verify: does it require auth or allow anonymous?
     → Check join/[token] route logic
5. For each candidate:
   - Create CandidateSession doc (interviewId, candidateUserId, candidateName, email)
   - Copy questionPool + samplingPlan from parent Interview
   - Run adaptive/fixed interview
   - Save feedback to CandidateSession
6. Creator views all candidateSessions:
   - List of candidates + scores
   - Comparison dashboard
   - Export as CSV/PDF
```

### Workflow F: Team Interview (Organization)

```
1. Admin creates interview → organizationId = org.clerkOrgId
2. Team members (org:admin, org:member) can:
   - View all interviews in org
   - Create interviews for org
   - Run interviews
   - View candidates
3. Org viewer (org:viewer):
   - View completed interviews only
4. Analytics aggregated per org:
   - Interview count, score distributions
   - Volume by job level
   - Candidate comparison
```

---

## 6. AUTHENTICATION & AUTHORIZATION

### A. Clerk Integration

- **User Identity:** Clerk SDK manages sign-in/sign-up
- **Organizations:** Clerk Orgs provide multi-tenant structure
- **Roles:** org:admin, org:member, org:viewer (configured in Clerk dashboard)
- **Webhooks:** /api/webhooks/clerk handles user/org events:
  - user.created → Create User doc
  - user.updated → Update User doc
  - organization.created → Create Organization doc

### B. Global Admin

- `ADMIN_USER_IDS` env var (comma-separated Clerk IDs)
- Can access `/api/admin/*` endpoints
- Override org permissions

### C. Permission Functions (app/lib/permissions.ts)

```typescript
canCreateInterview(orgRole) → org:admin || org:member
canViewInterviews(orgRole) → org:admin || org:member || org:viewer
canManageTeam(orgRole) → org:admin
canViewAnalytics(orgRole) → org:admin || org:member
canDeleteInterview(orgRole) → org:admin
canExportData(orgRole) → org:admin || org:member
```

### D. API Endpoint Protection

All `/api/*` routes:

1. Call getAuthContext() → { userId, orgId, orgRole, orgSlug }
2. Check permission based on endpoint (e.g., canCreateInterview for POST /interviews)
3. Return 403 Forbidden if unauthorized

---

## 7. EXTERNAL INTEGRATIONS

### A. Deepgram Voice Agent (WebSocket)

- **Protocol:** Deepgram Streaming Text-to-Speech (STS)
- **Connection:** `wss://agent.deepgram.com/agent`
- **Input Audio:** 16kHz linear16 PCM (microphone stream)
- **Output Audio:** 24kHz linear16 PCM (interview voice)
- **Configuration:**
  - Listen model: deepgram/nova-3 (speech-to-text)
  - Speak model: aura-asteria-en (text-to-speech)
  - Think model: gpt-4o (reasoning + function calling)
- **Available Voices:** Asteria, Orion, Luna, Arcas
- **Latency Mode:** "playback" (optimized for TTS streaming, not interactive)
- **Context:** DeepgramContextProvider manages connection lifecycle

### B. OpenAI GPT-4o

- **Scoring:** After candidate answers, prompt GPT-4o with:
  - Interview type (technical/hr)
  - Candidate's response
  - Expected answer (if applicable)
  - Scoring rubric
  - Request: scores (correctness, depth, communication), rationale
- **Feedback Generation:** After interview ends, compile feedback report
- **Cost:** Per API call (no batch processing yet)

### C. Stripe Billing

- **Plans:** free, pro, business
- **Features:**
  - free: 5 team members, limited interviews/month
  - pro: 20 interviews/month, $X/month
  - business: unlimited, custom branding, analytics
- **Webhooks:** /api/webhooks/stripe handles:
  - customer.subscription.updated
  - charge.failed
  - charge.succeeded
- **Dashboard:** Stripe portal for managing subscriptions

### D. Piston Code Execution API

- **Used For:** Coding interview problem execution
- **Input:** { language, source_code, stdin (test input) }
- **Output:** { output, stderr, compile_output, exit_code, signal, time, memory }
- **Cost:** API call per test case execution

### E. Document Parsing

- **Mammoth:** Convert .docx → text + structured content
- **pdf-parse:** Extract text from PDFs
- **ResumeParser:** Custom logic to extract name, email, skills, experience, education

---

## 8. SUBSCRIPTION & BILLING MODEL

### Plans

| Feature          | Free  | Pro           | Business  |
| ---------------- | ----- | ------------- | --------- |
| Team Members     | 5     | 5             | Unlimited |
| Interviews/Month | 50    | 100           | Unlimited |
| Interview Types  | Fixed | Adaptive + HR | All       |
| Sharing          | ✓     | ✓             | ✓         |
| Custom Branding  | ✗     | ✗             | ✓         |
| Analytics        | ✗     | Basic         | Advanced  |
| Price/Month      | $0    | $49           | Contact   |

### Usage Tracking

- Organization.usageStats.interviewsThisMonth (incremented on interview.created)
- Monthly reset: usageStats.lastResetAt
- Enforcement: Free plan blocked after limit exceeded (or soft limit warning)

---

## 9. INTERVIEW CONFIGURATIONS

All interviews use Deepgram Voice Agent with OpenAI GPT-4o backend.

### A. Fixed Interview Config

```typescript
{
  type: "Settings"
  audio: {
    input: { encoding: "linear16", sample_rate: 16000 }
    output: { encoding: "linear16", sample_rate: 24000, container: "none" }
  }
  agent: {
    listen: { provider: { type: "deepgram", model: "nova-3" } }
    speak: { provider: { type: "deepgram", model: "aura-asteria-en" } }
    think: { provider: { type: "open_ai", model: "gpt-4o" } }
    greeting: "Hi, I'm Alex. We have N questions today..."
    prompt: Numbered list of questions + instructions to ask once each
  }
}
```

### B. Adaptive Interview Config

```typescript
{
  // Same as fixed, plus:
  agent: {
    think: {
      prompt: "You don't know questions. Call get_next_question() after every answer..."
      functions: [
        {
          name: "get_next_question"
          parameters: { scores, next_action, suggested_topics, user_response_summary, rationale }
        },
        {
          name: "end_interview"
          parameters: {} (signals end)
        }
      ]
    }
  }
}
```

### C. HR Interview Config

```typescript
Same as adaptive, but:
- Agent name: "Sarah" (warm HR pro)
- Scoring: communication, confidence, clarity (not correctness, depth, communication)
- get_next_question returns expected answer field with HR evaluation criteria
- hrEvaluation in feedback includes: recommendation (hire/consider/reject)
```

---

## 10. ADMIN FEATURES

### Admin Access

- Controlled by `ADMIN_USER_IDS` env var (comma-separated Clerk IDs)
- Override all org permissions

### Admin API Endpoints

- `GET /api/admin/users` → List all users (paginated, searchable)
- `GET /api/admin/users/[userId]` → User details + subscription
- `GET /api/admin/metrics` → Global metrics (total interviews, users, revenue)
- `GET /api/admin/organizations` → List all orgs + usage

---

## 11. KEY ALGORITHMS

### A. Adaptive Question Selection (app/lib/questionSelection.ts)

```
Input:
  - previousScores: { correctness, depth, communication }
  - previousTopics: string[]
  - next_action: "move_on" | "go_deeper" | "clarify"
  - suggested_topics: string[]
  - questionPool: sorted by difficulty
  - samplingPlan: 80/20 distribution

Output:
  - nextQuestion: { question_text, expected_answer, difficulty }

Logic:
  1. If next_action == "clarify": return followup prompt for same question
  2. If next_action == "go_deeper": select related question (same difficulty, similar topic)
  3. If next_action == "move_on":
     a) Average previous scores → current performance level
     b) Map level to difficulty bucket (0-2=easy, 3=medium, 4-5=hard)
     c) Shift difficulty: if score < 2, go easier; if > 4, go harder
     d) Filter questionPool by (difficulty ± 1, topic NOT in previousTopics)
     e) Randomize within filtered set
     f) Return question + expected answer
```

### B. Sampling Plan (app/lib/sampling.ts)

```
Generates 80/20 distribution across question pool:

Input:
  - questionPool: Array of questions with difficulty scores
  - targetCount: total number of questions in interview

Output:
  - samplingPlan: Array of indices into questionPool

Logic:
  1. Sort questions by difficulty score
  2. Identify "commonly tested" (80%) vs "rare" (20%) topics
  3. For targetCount questions:
     - 80% from commonly tested (randomly shuffle)
     - 20% from rare (randomly shuffle)
  4. Return shuffled array of indices
```

### C. Scoring (app/lib/scoring.ts)

```
Input:
  - candidateResponse: string (from transcript)
  - expectedAnswer: string
  - interviewType: "technical" | "hr"

Output:
  - scores: { correctness, depth, communication } (0-5 each)
  - overallScore: number (0-100)
  - rationale: string
  - category: "very_low" | "borderline" | "acceptable" | "strong"

Logic:
  1. Prompt GPT-4o with scoring rubric
  2. Extract scores from response
  3. Calculate overall: (correctness * 0.4 + depth * 0.3 + communication * 0.3) * 20
  4. Bucket into category based on range (0-25=very_low, 25-50=borderline, etc.)
```

---

## 12. KEY DIRECTORIES & FILES

```
InterviewPrepApp/
├── app/
│   ├── api/                          # Next.js API routes
│   │   ├── admin/                    # Global admin endpoints
│   │   ├── authenticate/             # Clerk webhook + auth flow
│   │   ├── interviews/               # Interview CRUD + lifecycle
│   │   ├── candidate-sessions/       # Candidate responses (mass interview)
│   │   ├── coding-interviews/        # Coding interview logic
│   │   ├── leetcode/                 # LeetCode problem integration
│   │   ├── organizations/            # Org management
│   │   ├── profile/                  # User profile
│   │   ├── billing/                  # Stripe integration
│   │   └── webhooks/                 # Clerk + Stripe webhooks
│   │
│   ├── models/                       # MongoDB schemas
│   │   ├── User.ts
│   │   ├── Interview.ts
│   │   ├── CandidateSession.ts
│   │   ├── Organization.ts
│   │   ├── CodingInterview.ts
│   │   ├── Question.ts
│   │   └── LeetcodeQuestion.ts
│   │
│   ├── lib/                          # Shared utilities
│   │   ├── auth.ts                   # getAuthContext(), getAuthUserId()
│   │   ├── admin.ts                  # isAdmin(), requireAdmin()
│   │   ├── permissions.ts            # canCreateInterview(), etc.
│   │   ├── constants.ts              # Deepgram config builders
│   │   ├── mongodb.ts                # MongoDB connection
│   │   ├── questionSelection.ts      # Adaptive algorithm
│   │   ├── sampling.ts               # 80/20 distribution
│   │   ├── scoring.ts                # OpenAI scoring
│   │   ├── resumeParser.ts           # Resume parsing
│   │   ├── openai.ts                 # OpenAI client
│   │   ├── stripe.ts                 # Stripe client
│   │   ├── pricing.ts                # Tier definitions
│   │   └── types.ts                  # Shared TypeScript interfaces
│   │
│   ├── context/                      # React Context
│   │   ├── DeepgramContextProvider.js # WebSocket + Voice Agent lifecycle
│   │   └── MicrophoneContextProvider.js # Mic input (ScriptProcessorNode)
│   │
│   ├── components/                   # React components
│   │   ├── App.js                    # Main app container
│   │   ├── Conversation.tsx          # Live interview UI
│   │   ├── FeedbackDisplay.tsx       # Report display
│   │   ├── ResumeUpload.tsx          # Resume parser UI
│   │   ├── InterviewTranscript.tsx   # Transcript viewer
│   │   ├── Header.tsx                # Navigation
│   │   └── ... (20+ other components)
│   │
│   ├── utils/                        # Utilities
│   │   ├── audioUtils.js             # createAudioBuffer, playAudioBuffer
│   │   ├── deepgramUtils.ts          # Deepgram config builders
│   │   └── ... (other helpers)
│   │
│   └── (pages)                       # Next.js pages/app router
│       ├── page.tsx                  # Home
│       ├── dashboard/page.tsx        # User dashboard
│       ├── interviews/               # Interview pages
│       │   ├── [id]/page.tsx         # Interview detail
│       │   ├── join/[token]/page.tsx # Mass interview join
│       │   └── create/page.tsx       # Interview creation
│       ├── organizations/            # Org pages
│       ├── admin/                    # Admin dashboard
│       └── ... (other pages)
│
├── package.json                      # Dependencies
├── next.config.mjs                   # Next.js config (standalone output)
├── tailwind.config.ts                # Tailwind config
├── .eslintrc.json                    # ESLint rules
├── .prettierrc                        # Code formatting
├── .env.development                  # Example env (committed, no secrets)
├── .env.local                        # Real secrets (gitignored)
├── Dockerfile                        # Production Docker image
├── .nvmrc                            # Node 20
└── ...

```

---

## 13. AUDIO PIPELINE

### Microphone Input (ScriptProcessorNode - Deprecated)

- Captures 16kHz PCM from WebRTC getUserMedia
- Sends chunks to Deepgram WebSocket in real-time

### Audio Playback (Web Audio API)

- Deepgram streams 24kHz PCM chunks over WebSocket
- `createAudioBuffer()` decodes PCM → AudioBuffer
- `playAudioBuffer()` schedules playback via AudioContext
- `latencyHint: "playback"` (optimized for low jitter, not ultra-low latency)

### Known Issues

- Audio stutter in dev mode due to React StrictMode double-rendering
- Test audio quality in production builds (`next build && next start`)

---

## 14. DEPLOYMENT

### Docker

```dockerfile
FROM node:20
WORKDIR /app
COPY . .
RUN npm ci --legacy-peer-deps
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup

- **GKE:** Deployed via Kubernetes (see CI workflow)
- **Secrets Management:** Env vars injected at runtime
- **CI/CD:** GitHub Actions (format → lint → typecheck → build)

---

## 15. KNOWN LIMITATIONS & FUTURE WORK

### Current Limitations

1. Microphone input uses deprecated ScriptProcessorNode (should migrate to AudioWorklet)
2. No batch scoring (OpenAI called per question, not per interview)
3. LeetCode integration is read-only (questions cached manually)
4. No real-time analytics (reports generated post-interview)

### Planned Features

1. Custom LeetCode sync (auto-fetch problem updates)
2. Batch interview scoring (OpenAI Batch API)
3. Real-time analytics dashboard (WebSocket updates)
4. Video recording (optional, for video interviews)
5. Mobile app (React Native)

---

## 16. SUMMARY TABLE

| Aspect              | Details                                                       |
| ------------------- | ------------------------------------------------------------- |
| **Primary Use**     | AI-powered interview platform with adaptive Q&A               |
| **User Types**      | Individual candidates, hiring teams, organizations            |
| **Interview Types** | Fixed, Adaptive, HR, Coding                                   |
| **Auth**            | Clerk (users + orgs)                                          |
| **Database**        | MongoDB (Mongoose)                                            |
| **Voice AI**        | Deepgram Voice Agent (WebSocket, real-time)                   |
| **Scoring**         | OpenAI GPT-4o (post-interview, API calls)                     |
| **Billing**         | Stripe (free, pro, business tiers)                            |
| **Deployment**      | Docker + GKE                                                  |
| **Frontend**        | Next.js 15 + React 19 + Tailwind                              |
| **Backend**         | Node.js 20 + Next.js API routes                               |
| **Key Features**    | Adaptive Q selection, team sharing, analytics, resume parsing |
