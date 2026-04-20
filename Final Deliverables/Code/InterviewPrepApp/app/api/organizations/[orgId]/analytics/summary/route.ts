import { NextResponse } from "next/server";
import { getAuthContext } from "app/lib/auth";
import { canViewAnalytics } from "app/lib/permissions";
import { connectDB } from "app/lib/mongodb";
import Interview from "app/models/Interview";
import { withCache } from "app/lib/redis";

export async function GET(_request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { userId, orgId: activeOrgId, orgRole } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;
  if (activeOrgId !== orgId || !canViewAnalytics(orgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const summary = await withCache(`analytics:${orgId}:summary:0`, 300, async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalInterviews,
      completedInterviews,
      recentInterviews,
      avgScoreResult,
      totalCandidates,
    ] = await Promise.all([
      Interview.countDocuments({ organizationId: orgId }),
      Interview.countDocuments({ organizationId: orgId, status: "completed" }),
      Interview.countDocuments({
        organizationId: orgId,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      Interview.aggregate([
        {
          $match: {
            organizationId: orgId,
            status: "completed",
            "feedback.overallScore": { $exists: true },
          },
        },
        { $group: { _id: null, avg: { $avg: "$feedback.overallScore" } } },
      ]),
      // Count total candidates across all mass interviews in this org
      Interview.aggregate([
        { $match: { organizationId: orgId, isMassInterview: true } },
        {
          $lookup: {
            from: "candidatesessions",
            localField: "_id",
            foreignField: "interviewId",
            as: "candidates",
          },
        },
        { $group: { _id: null, total: { $sum: { $size: "$candidates" } } } },
      ]),
    ]);

    const completionRate =
      totalInterviews > 0 ? Math.round((completedInterviews / totalInterviews) * 100) : 0;

    return {
      totalInterviews,
      completedInterviews,
      recentInterviews,
      averageScore: avgScoreResult[0]?.avg ? Math.round(avgScoreResult[0].avg * 10) / 10 : null,
      completionRate,
      totalCandidates: totalCandidates[0]?.total ?? 0,
    };
  });

  return NextResponse.json(summary);
}
