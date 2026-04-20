import { NextResponse } from "next/server";
import { requireAdmin } from "app/lib/admin";
import { connectDB } from "app/lib/mongodb";
import User from "app/models/User";
import Interview from "app/models/Interview";
import Organization from "app/models/Organization";
import { withCache } from "app/lib/redis";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const metrics = await withCache(
    "admin:metrics",
    300, // 5 min — admin metrics don't need to be real-time
    async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        totalInterviews,
        completedInterviews,
        recentInterviews,
        totalOrganizations,
        activeSubscriptions,
        proCount,
        businessCount,
        mauResult,
      ] = await Promise.all([
        User.countDocuments(),
        Interview.countDocuments(),
        Interview.countDocuments({ status: "completed" }),
        Interview.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        Organization.countDocuments(),
        User.countDocuments({
          "subscription.status": "active",
          "subscription.tier": { $ne: "free" },
        }),
        User.countDocuments({ "subscription.tier": "pro" }),
        User.countDocuments({ "subscription.tier": "business" }),
        Interview.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: "$userId" } },
          { $count: "mau" },
        ]),
      ]);

      return {
        totalUsers,
        totalInterviews,
        completedInterviews,
        recentInterviews,
        totalOrganizations,
        activeSubscriptions,
        proCount,
        businessCount,
        mau: mauResult[0]?.mau ?? 0,
        estimatedRevenue: proCount * 9 + businessCount * 49,
      };
    },
  );

  return NextResponse.json(metrics);
}
