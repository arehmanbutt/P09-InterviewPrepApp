import { NextResponse } from "next/server";
import { getAuthContext } from "app/lib/auth";
import { canViewAnalytics } from "app/lib/permissions";
import { connectDB } from "app/lib/mongodb";
import Interview from "app/models/Interview";

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

  const data = await Interview.aggregate([
    { $match: { organizationId: orgId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        status: "$_id",
        count: 1,
      },
    },
  ]);

  // Ensure all statuses are present
  const statusMap: Record<string, number> = {
    scheduled: 0,
    "in-progress": 0,
    completed: 0,
  };
  for (const item of data) {
    statusMap[item.status] = item.count;
  }

  return NextResponse.json(statusMap);
}
