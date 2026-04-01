import { NextResponse } from "next/server";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import Interview from "app/models/Interview";
import CandidateSession from "app/models/CandidateSession";
import Organization from "app/models/Organization";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;

  await connectDB();

  const interview = await Interview.findOne({
    shareToken: token,
    isMassInterview: true,
  }).lean();

  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  // Block self-join
  if ((interview.userId as string) === userId) {
    return NextResponse.json({ error: "You are the creator of this interview" }, { status: 403 });
  }

  // Check if candidate already has a session
  const existing = await CandidateSession.findOne({
    interviewId: interview._id,
    candidateUserId: userId,
  }).lean();

  if (existing) {
    if ((existing.status as string) === "completed") {
      return NextResponse.json({
        status: "completed",
        sessionId: existing._id,
      });
    }
    return NextResponse.json({
      status: "resume",
      sessionId: existing._id,
    });
  }

  // Fetch org branding if the interview belongs to an organization
  let branding = null;
  if (interview.organizationId) {
    const org = await Organization.findOne({
      clerkOrgId: interview.organizationId,
    }).lean();
    if (org?.branding) {
      branding = org.branding;
    }
  }

  return NextResponse.json({
    status: "canJoin",
    interviewId: interview._id,
    title: interview.title,
    company: interview.company,
    description: interview.description,
    totalQuestions: interview.totalQuestions,
    branding,
  });
}

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;

  await connectDB();

  const interview = await Interview.findOne({
    shareToken: token,
    isMassInterview: true,
  }).lean();

  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  if ((interview.userId as string) === userId) {
    return NextResponse.json({ error: "You are the creator of this interview" }, { status: 403 });
  }

  // Get candidate info from Clerk
  const user = await currentUser();
  const candidateName = user?.fullName || user?.firstName || "Unknown Candidate";
  const candidateEmail = user?.primaryEmailAddress?.emailAddress || "";

  try {
    const session = await CandidateSession.create({
      interviewId: interview._id,
      candidateUserId: userId,
      candidateName,
      candidateEmail,
      jobLevel: interview.jobLevel ?? null,
      status: "scheduled",
      questionPool: interview.questionPool,
      samplingPlan: interview.samplingPlan,
      currentQuestionId: interview.currentQuestionId,
      currentQuestionText: interview.currentQuestionText,
      currentExpectedAnswer: interview.currentExpectedAnswer,
      questionsAsked: interview.questionsAsked,
      totalQuestions: interview.totalQuestions,
      currentPlanIndex: interview.currentPlanIndex,
    });

    return NextResponse.json({ sessionId: String(session._id) }, { status: 201 });
  } catch (err) {
    // Duplicate key = candidate already has a session
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      const existing = await CandidateSession.findOne({
        interviewId: interview._id,
        candidateUserId: userId,
      }).lean();

      return NextResponse.json({
        sessionId: existing?._id,
        status: existing?.status,
      });
    }
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
