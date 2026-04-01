import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import { generateFeedback, generateScoreSummary, evaluateHRInterview } from "app/lib/openai";
import type { QuestionScore } from "app/lib/types";
import CandidateSession from "app/models/CandidateSession";
import Interview from "app/models/Interview";
import type { TranscriptEntry } from "app/models/Interview";

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  if (!isValidObjectId(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  await connectDB();

  const session = await CandidateSession.findOne({ _id: sessionId }).lean();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Authorized: candidate themselves OR interview creator
  const isCandidate = (session.candidateUserId as string) === userId;
  let isCreator = false;
  if (!isCandidate) {
    const interview = await Interview.findOne({
      _id: session.interviewId,
      userId,
    }).lean();
    isCreator = !!interview;
  }

  if (!isCandidate && !isCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(session);
}

const ALLOWED_STATUSES = ["scheduled", "in-progress", "completed"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  if (!isValidObjectId(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const body = await request.json();
  const { status, transcript, questionScores } = body as {
    status: string;
    transcript?: TranscriptEntry[];
    questionScores?: QuestionScore[];
  };

  if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await connectDB();

  // Only the candidate can update their own session
  const session = await CandidateSession.findOne({
    _id: sessionId,
    candidateUserId: userId,
  }).lean();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Generate feedback when completing with transcript
  if (status === "completed" && Array.isArray(transcript) && transcript.length > 0) {
    const interview = await Interview.findOne({ _id: session.interviewId }).lean();
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Get interview type, default to 'technical' for backwards compatibility
    const interviewType = (interview.interviewType as "technical" | "hr") || "technical";

    let feedback = null;

    // HR Interview path: Use dedicated HR evaluation
    if (interviewType === "hr") {
      try {
        const hrEval = await evaluateHRInterview(
          transcript,
          interview.title as string,
          interview.company as string,
        );

        // Calculate overall score from HR dimensions
        const overallScore =
          (hrEval.communication +
            hrEval.culturalFit +
            hrEval.confidence +
            hrEval.clarity +
            hrEval.overallSuitability) /
          5;

        feedback = {
          overallScore,
          summary: hrEval.summary,
          aggregateScores: {
            // Map HR scores to the standard format for backwards compatibility
            correctness: hrEval.communication,
            depth: hrEval.confidence,
            communication: hrEval.clarity,
          },
          questionScores: questionScores ?? [],
          strengths: hrEval.strengths,
          improvements: hrEval.improvements,
          hrEvaluation: {
            communication: hrEval.communication,
            culturalFit: hrEval.culturalFit,
            confidence: hrEval.confidence,
            clarity: hrEval.clarity,
            overallSuitability: hrEval.overallSuitability,
            recommendation: hrEval.recommendation,
            structuredFeedback: hrEval.structuredFeedback,
          },
        };
      } catch (err) {
        console.error("HR evaluation failed:", err);
      }
    }

    // Technical interview path: per-question scores available → lightweight summary
    if (!feedback && Array.isArray(questionScores) && questionScores.length > 0) {
      try {
        const overallScore =
          questionScores.reduce((sum, qs) => sum + qs.overallScore, 0) / questionScores.length;
        const aggregateScores = {
          correctness:
            questionScores.reduce((sum, qs) => sum + qs.scores.correctness, 0) /
            questionScores.length,
          depth:
            questionScores.reduce((sum, qs) => sum + qs.scores.depth, 0) / questionScores.length,
          communication:
            questionScores.reduce((sum, qs) => sum + qs.scores.communication, 0) /
            questionScores.length,
        };

        const llmSummary = await generateScoreSummary(
          questionScores,
          interview.title as string,
          interview.company as string,
        );

        feedback = {
          overallScore,
          summary: llmSummary.summary,
          aggregateScores,
          questionScores,
          strengths: llmSummary.strengths,
          improvements: llmSummary.improvements,
        };
      } catch (err) {
        console.error("Score summary generation failed:", err);
      }
    }

    // Legacy fallback: no per-question scores → full transcript analysis
    if (!feedback) {
      try {
        feedback = await generateFeedback(
          transcript,
          interview.title as string,
          interview.company as string,
        );
      } catch (err) {
        console.error("Feedback generation failed:", err);
      }
    }

    await CandidateSession.findOneAndUpdate({ _id: sessionId }, { status, transcript, feedback });

    return NextResponse.json({ success: true, status });
  }

  await CandidateSession.findOneAndUpdate({ _id: sessionId }, { status });
  return NextResponse.json({ success: true, status });
}
