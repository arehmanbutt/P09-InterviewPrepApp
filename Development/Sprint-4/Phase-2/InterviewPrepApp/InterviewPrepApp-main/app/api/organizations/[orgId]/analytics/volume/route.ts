import { NextResponse } from "next/server";
import { getAuthContext } from "app/lib/auth";
import { canViewAnalytics } from "app/lib/permissions";
import { connectDB } from "app/lib/mongodb";
import Interview from "app/models/Interview";

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { userId, orgId: activeOrgId, orgRole } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;
  if (activeOrgId !== orgId || !canViewAnalytics(orgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const days = Math.min(Number(url.searchParams.get("days")) || 30, 365);
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  await connectDB();

  const data = await Interview.aggregate([
    { $match: { organizationId: orgId, createdAt: { $gte: from } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", count: 1, completed: 1 } },
  ]);

  return NextResponse.json(data);
}
