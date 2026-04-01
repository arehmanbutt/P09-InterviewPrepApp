import { NextResponse } from "next/server";
import { getAuthContext } from "app/lib/auth";
import { canViewInterviews } from "app/lib/permissions";
import { connectDB } from "app/lib/mongodb";
import Interview from "app/models/Interview";

export async function GET(_request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { userId, orgId: activeOrgId, orgRole } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  if (activeOrgId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canViewInterviews(orgRole)) {
    return NextResponse.json(
      { error: "You do not have permission to view interviews" },
      { status: 403 },
    );
  }

  await connectDB();

  // Viewers only see completed interviews
  const filter: Record<string, unknown> = { organizationId: orgId };
  if (orgRole === "org:viewer") {
    filter.status = "completed";
  }

  const interviews = await Interview.find(filter)
    .sort({ createdAt: -1 })
    .select(
      "title company status createdAt feedback isMassInterview shareToken interviewType userId",
    )
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
    createdBy: i.userId,
  }));

  return NextResponse.json(result);
}
