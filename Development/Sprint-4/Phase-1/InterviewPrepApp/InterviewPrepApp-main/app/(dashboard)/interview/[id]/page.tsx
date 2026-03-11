import { notFound } from "next/navigation";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import Interview from "app/models/Interview";
import InterviewSession from "./InterviewSession";
import type { AdaptiveState, IPoolQuestion } from "app/lib/types";
import { bucketByDifficulty } from "app/lib/sampling";

export default async function InterviewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const userId = await getAuthUserId();
  if (!userId) {
    notFound();
  }

  await connectDB();

  const interview = await Interview.findOne({ _id: id, userId }).lean();

  if (!interview) {
    notFound();
  }

  const questions = (interview.questions as { text: string; topic: string }[]).map((q) => ({
    text: q.text,
    topic: q.topic,
  }));

  // Build adaptive state from stored interview data
  const pool = (interview.questionPool as IPoolQuestion[]) || [];
  const buckets = bucketByDifficulty(pool);
  const currentQId = (interview.currentQuestionId as string) || null;

  const initialAdaptiveState: AdaptiveState = {
    buckets,
    samplingPlan: (interview.samplingPlan as number[]) || [],
    currentPlanIndex: (interview.currentPlanIndex as number) || 0,
    questionsAsked: (interview.questionsAsked as number) || 0,
    totalQuestions: (interview.totalQuestions as number) || questions.length,
    currentQuestionId: currentQId,
    currentQuestionText: (interview.currentQuestionText as string) || "",
    currentExpectedAnswer: (interview.currentExpectedAnswer as string) || "",
    currentQuestionTags: [],
    topicsAsked: [],
    followupUsedForCurrentQuestion: false,
    questionScores: [],
  };

  // Get interview type, default to 'technical' for backwards compatibility
  const interviewType = (interview.interviewType as "technical" | "hr") || "technical";

  return (
    <InterviewSession
      interviewId={id}
      title={interview.title as string}
      company={interview.company as string}
      questions={questions}
      initialStatus={interview.status as string}
      totalQuestions={initialAdaptiveState.totalQuestions}
      initialAdaptiveState={initialAdaptiveState}
      interviewType={interviewType}
    />
  );
}
