import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import Interview from "app/models/Interview";
import CandidateSession from "app/models/CandidateSession";
import type { InterviewFeedback } from "app/models/Interview";

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid interview ID" }, { status: 400 });
  }

  const url = new URL(request.url);
  const ids = url.searchParams.get("ids")?.split(",").filter(Boolean) ?? [];

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Provide candidate session IDs via ?ids=id1,id2,id3" },
      { status: 400 },
    );
  }

  if (ids.some((i) => !isValidObjectId(i))) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  await connectDB();

  const interview = await Interview.findOne({
    _id: id,
    userId,
    isMassInterview: true,
  }).lean();

  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  const sessions = await CandidateSession.find({
    _id: { $in: ids },
    interviewId: id,
  })
    .select("candidateName candidateEmail status feedback createdAt")
    .lean();

  const result = sessions.map((s) => {
    const feedback = s.feedback as InterviewFeedback | null;
    return {
      _id: s._id,
      candidateName: s.candidateName,
      candidateEmail: s.candidateEmail,
      status: s.status,
      createdAt: s.createdAt,
      overallScore: feedback?.overallScore ?? null,
      aggregateScores: feedback?.aggregateScores ?? null,
      strengths: feedback?.strengths ?? [],
      improvements: feedback?.improvements ?? [],
      questionScores: feedback?.questionScores ?? [],
      hrEvaluation: feedback?.hrEvaluation ?? null,
    };
  });

  return NextResponse.json(result);
}
