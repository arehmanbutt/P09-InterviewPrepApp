import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import { generateFeedback, generateScoreSummary, evaluateHRInterview } from "app/lib/openai";
import { encryptField, decryptField } from "app/lib/encryption";
import type { QuestionScore } from "app/lib/types";
import Interview from "app/models/Interview";
import type { TranscriptEntry } from "app/models/Interview";

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid interview ID" }, { status: 400 });
  }

  await connectDB();

  const interview = await Interview.findOne({ _id: id, userId }).lean();

  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  // Decrypt sensitive fields before returning.
  // transcript / resumeData may be: encrypted string | plain array/object (pre-encryption rows) | null
  function safeDecryptJson<T>(raw: unknown, fallback: T): T {
    if (!raw || typeof raw !== "string") return fallback ?? (raw as T);
    const decrypted = decryptField(raw);
    if (!decrypted) return fallback;
    try {
      return JSON.parse(decrypted) as T;
    } catch {
      return fallback;
    }
  }

  const decryptedInterview = {
    ...interview,
    transcript: safeDecryptJson<TranscriptEntry[]>(
      interview.transcript as unknown as string,
      interview.transcript as unknown as TranscriptEntry[],
    ),
    resumeData: safeDecryptJson(interview.resumeData, interview.resumeData),
  };

  return NextResponse.json(decryptedInterview);
}

const ALLOWED_STATUSES = ["scheduled", "in-progress", "completed"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid interview ID" }, { status: 400 });
  }

  const body = await request.json();

  // Field edit path: update title/company/description (no status change)
  if (!body.status && (body.title || body.company || body.description)) {
    const { title, company, description } = body as {
      title?: string;
      company?: string;
      description?: string;
    };

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof company !== "string" ||
      !company.trim() ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return NextResponse.json(
        { error: "Title, company, and description are all required" },
        { status: 400 },
      );
    }

    await connectDB();

    const interview = await Interview.findOne({ _id: id, userId }).lean();
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    if ((interview as { status: string }).status !== "scheduled") {
      return NextResponse.json(
        { error: "Only scheduled interviews can be edited" },
        { status: 400 },
      );
    }

    await Interview.findOneAndUpdate(
      { _id: id, userId },
      { title: title.trim(), company: company.trim(), description: description.trim() },
    );

    return NextResponse.json({
      success: true,
      title: title.trim(),
      company: company.trim(),
      description: description.trim(),
    });
  }

  // Status update path
  const { status, transcript, questionScores } = body as {
    status: string;
    transcript?: TranscriptEntry[];
    questionScores?: QuestionScore[];
  };

  if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
    return NextResponse.json(
      { error: "Invalid status. Must be one of: scheduled, in-progress, completed" },
      { status: 400 },
    );
  }

  await connectDB();

  // If completing with transcript, generate feedback
  if (status === "completed" && Array.isArray(transcript) && transcript.length > 0) {
    const interview = await Interview.findOne({ _id: id, userId }).lean();
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

    const encryptedTranscript = encryptField(JSON.stringify(transcript));

    const updated = await Interview.findOneAndUpdate(
      { _id: id, userId },
      { status, transcript: encryptedTranscript, feedback },
      { new: true },
    );

    if (!updated) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, status: updated.status });
  }

  const updated = await Interview.findOneAndUpdate({ _id: id, userId }, { status }, { new: true });

  if (!updated) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, status: updated.status });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid interview ID" }, { status: 400 });
  }

  await connectDB();

  const deleted = await Interview.findOneAndDelete({ _id: id, userId });

  if (!deleted) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
