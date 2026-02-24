import { notFound } from "next/navigation";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import CandidateSession from "app/models/CandidateSession";
import Interview from "app/models/Interview";
import InterviewSession from "app/(dashboard)/interview/[id]/InterviewSession";
import type { AdaptiveState, IPoolQuestion } from "app/lib/types";
import { bucketByDifficulty } from "app/lib/sampling";

export default async function CandidateSessionPage({
  params,
}: {
  params: Promise<{ token: string; sessionId: string }>;
}) {
  const { token, sessionId } = await params;

  const userId = await getAuthUserId();
  if (!userId) notFound();

  await connectDB();

  const session = await CandidateSession.findOne({
    _id: sessionId,
    candidateUserId: userId,
  }).lean();

  if (!session) notFound();

  const interview = await Interview.findOne({ _id: session.interviewId })
    .select("title company")
    .lean();

  const pool = (session.questionPool as IPoolQuestion[]) || [];
  const buckets = bucketByDifficulty(pool);
  const currentQId = (session.currentQuestionId as string) || null;

  const initialAdaptiveState: AdaptiveState = {
    buckets,
    samplingPlan: (session.samplingPlan as number[]) || [],
    currentPlanIndex: (session.currentPlanIndex as number) || 0,
    questionsAsked: (session.questionsAsked as number) || 0,
    totalQuestions: (session.totalQuestions as number) || 0,
    currentQuestionId: currentQId,
    currentQuestionText: (session.currentQuestionText as string) || "",
    currentExpectedAnswer: (session.currentExpectedAnswer as string) || "",
    currentQuestionTags: [],
    topicsAsked: [],
    followupUsedForCurrentQuestion: false,
    questionScores: [],
  };

  return (
    <InterviewSession
      interviewId={sessionId}
      title={(interview?.title as string) || "Interview"}
      company={(interview?.company as string) || ""}
      questions={[]}
      initialStatus={session.status as string}
      totalQuestions={initialAdaptiveState.totalQuestions}
      initialAdaptiveState={initialAdaptiveState}
      apiBasePath="/api/candidate-sessions"
      backUrl={`/join/${token}`}
    />
  );
}
