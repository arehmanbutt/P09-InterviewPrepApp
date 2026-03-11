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

  const interview = await Interview.findOne({
    _id: id,
    userId,
    isMassInterview: true,
  }).lean();

  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  const sessions = await CandidateSession.find({ interviewId: id })
    .sort({ createdAt: -1 })
    .select("candidateName candidateEmail status feedback createdAt")
    .lean();

  const result = sessions.map((s) => ({
    _id: s._id,
    candidateName: s.candidateName,
    candidateEmail: s.candidateEmail,
    status: s.status,
    overallScore: (s.feedback as InterviewFeedback | null)?.overallScore ?? null,
    createdAt: s.createdAt,
  }));

  return NextResponse.json(result);
}
