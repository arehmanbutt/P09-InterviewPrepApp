import { NextResponse } from "next/server";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import { generatePoolQuestions, generateHRQuestions } from "app/lib/openai";
import { selectQuestions } from "app/lib/questionSelection";
import { buildSamplingPlan } from "app/lib/sampling";
import Interview from "app/models/Interview";
import type { IPoolQuestion } from "app/lib/types";

const DEFAULT_QUESTIONS = 5;
const MAX_QUESTIONS = 20;
const POOL_MULTIPLIER = 4;
const MIN_DB_QUESTIONS = 3;

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("title" in body) ||
    !("company" in body) ||
    !("description" in body) ||
    typeof (body as { title: unknown }).title !== "string" ||
    typeof (body as { company: unknown }).company !== "string" ||
    typeof (body as { description: unknown }).description !== "string"
  ) {
    return NextResponse.json(
      { error: "title, company, and description are required strings" },
      { status: 400 },
    );
  }

  const { title, company, description } = body as {
    title: string;
    company: string;
    description: string;
  };
  const isMassInterview = !!(body as { isMassInterview?: boolean }).isMassInterview;

  // Validate interviewType
  const VALID_INTERVIEW_TYPES = ["technical", "hr"] as const;
  const rawInterviewType = (body as { interviewType?: string }).interviewType;
  const interviewType: "technical" | "hr" =
    typeof rawInterviewType === "string" &&
    VALID_INTERVIEW_TYPES.includes(rawInterviewType as "technical" | "hr")
      ? (rawInterviewType as "technical" | "hr")
      : "technical";

  // Validate jobLevel
  const VALID_JOB_LEVELS = ["associate", "junior", "mid", "senior", "lead"];
  const rawJobLevel = (body as { jobLevel?: string }).jobLevel;
  const jobLevel =
    typeof rawJobLevel === "string" && VALID_JOB_LEVELS.includes(rawJobLevel) ? rawJobLevel : "mid";

  // Validate numQuestions
  const rawNumQuestions = (body as { numQuestions?: unknown }).numQuestions;
  const numQuestions = Math.max(
    1,
    Math.min(MAX_QUESTIONS, Math.round(Number(rawNumQuestions) || DEFAULT_QUESTIONS)),
  );
  const poolSize = numQuestions * POOL_MULTIPLIER;

  if (!title.trim() || !company.trim() || !description.trim()) {
    return NextResponse.json(
      { error: "title, company, and description must not be empty" },
      { status: 400 },
    );
  }

  let questionPool: IPoolQuestion[] = [];

  if (interviewType === "hr") {
    // HR interviews use LLM-generated HR screening questions
    console.log("Generating HR screening questions via LLM");
    questionPool = await generateHRQuestions(title, description, poolSize);
  } else {
    // Technical interviews: Fetch questions from DB (pool is larger than what we'll ask)
    try {
      questionPool = await selectQuestions(title, description, poolSize);
      console.log(`Selected ${questionPool.length} questions from DB (wanted ${poolSize})`);
    } catch (err) {
      console.error("DB question selection failed, falling back to OpenAI:", err);
    }

    // If not enough relevant DB questions, discard them and use OpenAI generation
    if (questionPool.length < MIN_DB_QUESTIONS) {
      console.log(
        `Only ${questionPool.length} DB questions found (need ${MIN_DB_QUESTIONS}), using OpenAI generation`,
      );
      questionPool = await generatePoolQuestions(title, description, poolSize);
    }
  }

  const totalQuestions = Math.min(numQuestions, questionPool.length);

  // Build sampling plan using job level
  const samplingPlan = buildSamplingPlan(
    totalQuestions,
    jobLevel as "associate" | "junior" | "mid" | "senior" | "lead",
  );

  // Build display questions (simplified) from the pool
  const displayQuestions = questionPool.slice(0, totalQuestions).map((q) => ({
    text: q.question_text,
    topic: q.tags[0] || q.question_title || "General",
  }));

  await connectDB();

  const interview = await Interview.create({
    userId,
    title,
    company,
    description,
    jobLevel,
    interviewType,
    questions: displayQuestions,
    status: "scheduled",
    // Adaptive state
    questionPool,
    samplingPlan,
    currentQuestionId: null,
    currentQuestionText: "",
    currentExpectedAnswer: "",
    questionsAsked: 0,
    totalQuestions,
    currentPlanIndex: 0,
    // Mass interview
    isMassInterview,
    ...(isMassInterview ? { shareToken: crypto.randomUUID() } : {}),
  });

  return NextResponse.json(
    {
      interviewId: String(interview._id),
      questions: interview.questions as typeof displayQuestions,
      shareToken: (interview.shareToken as string | null) ?? undefined,
    },
    { status: 201 },
  );
}

export async function GET(_request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const interviews = await Interview.find({ userId })
    .sort({ createdAt: -1 })
    .select("title company status createdAt feedback isMassInterview shareToken interviewType")
    .lean();

  const result = interviews.map((i) => ({
    _id: i._id,
    title: i.title,
    company: i.company,
    status: i.status,
    createdAt: i.createdAt,
    hasFeedback: !!i.feedback,
    isMassInterview: !!i.isMassInterview,
    shareToken: i.shareToken ?? null,
    interviewType: i.interviewType ?? "technical",
  }));

  return NextResponse.json(result);
}
