import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "app/lib/mongodb";
import { getAuthUserId } from "app/lib/auth";
import CodingInterview from "app/models/CodingInterview";
import { Problem } from "app/models/LeetcodeQuestion";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const interview = await CodingInterview.findById(id).lean();
    if (!interview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (interview.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Populate problem details
    const problems = await Problem.find({ id: { $in: interview.problems } }).lean();

    const problemMap = new Map(problems.map((p) => [p.id, p]));
    const orderedProblems = interview.problems.map((pid) => problemMap.get(pid)).filter(Boolean);

    return NextResponse.json({
      ...interview,
      problemDetails: orderedProblems,
    });
  } catch (error) {
    console.error("Error fetching coding interview:", error);
    return NextResponse.json({ error: "Failed to fetch coding interview" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const interview = await CodingInterview.findById(id);
    if (!interview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (interview.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Start the interview
    if (body.status === "in-progress" && interview.status === "scheduled") {
      interview.status = "in-progress";
      interview.startedAt = new Date();
    }

    // Complete the interview
    if (body.status === "completed" && interview.status === "in-progress") {
      interview.status = "completed";
      interview.completedAt = new Date();
    }

    // Update a submission
    if (body.submission) {
      const { problemId, language, code, status, testsPassed, testsTotal, runtime } =
        body.submission;
      const sub = interview.submissions.find((s) => s.problemId === problemId);
      if (sub) {
        sub.language = language;
        sub.code = code;
        sub.status = status;
        sub.testsPassed = testsPassed;
        sub.testsTotal = testsTotal;
        sub.runtime = runtime;
        sub.submittedAt = new Date();
      }
    }

    await interview.save();

    return NextResponse.json(interview);
  } catch (error) {
    console.error("Error updating coding interview:", error);
    return NextResponse.json({ error: "Failed to update coding interview" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const interview = await CodingInterview.findById(id);
    if (!interview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (interview.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await CodingInterview.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting coding interview:", error);
    return NextResponse.json({ error: "Failed to delete coding interview" }, { status: 500 });
  }
}
