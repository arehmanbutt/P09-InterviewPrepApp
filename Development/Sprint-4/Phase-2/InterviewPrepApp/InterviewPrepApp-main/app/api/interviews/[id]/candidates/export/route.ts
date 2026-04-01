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
  const format = url.searchParams.get("format") ?? "csv";

  if (format !== "csv") {
    return NextResponse.json({ error: "Only CSV export is currently supported" }, { status: 400 });
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
    interviewId: id,
    status: "completed",
  })
    .sort({ createdAt: -1 })
    .select("candidateName candidateEmail status feedback createdAt")
    .lean();

  // Build CSV
  const headers = [
    "Name",
    "Email",
    "Overall Score",
    "Correctness",
    "Depth",
    "Communication",
    "Status",
    "Date",
  ];

  const rows = sessions.map((s) => {
    const fb = s.feedback as InterviewFeedback | null;
    return [
      `"${s.candidateName.replace(/"/g, '""')}"`,
      `"${s.candidateEmail.replace(/"/g, '""')}"`,
      fb?.overallScore?.toFixed(1) ?? "",
      fb?.aggregateScores?.correctness?.toFixed(1) ?? "",
      fb?.aggregateScores?.depth?.toFixed(1) ?? "",
      fb?.aggregateScores?.communication?.toFixed(1) ?? "",
      s.status,
      new Date(s.createdAt).toISOString().split("T")[0],
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="candidates-${id}.csv"`,
    },
  });
}
