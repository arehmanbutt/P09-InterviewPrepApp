import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "app/lib/mongodb";
import { getAuthUserId } from "app/lib/auth";
import Submission from "app/models/Submission";
import { withCache } from "app/lib/redis";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get("problemId");
    const statusMap = searchParams.get("statusMap");

    // Return a map of problemId -> best status for the problem browser
    if (statusMap === "true") {
      const map = await withCache<Record<string, string>>(
        `submissions:statusmap:${userId}`,
        60, // 60s — invalidated when a new submission is saved
        async () => {
          const submissions = await Submission.find({ userId }).select("problemId status").lean();
          const result: Record<string, string> = {};
          for (const sub of submissions) {
            if (result[sub.problemId] === "accepted") continue;
            result[sub.problemId] = sub.status === "accepted" ? "accepted" : "attempted";
          }
          return result;
        },
      );

      return NextResponse.json(map);
    }

    // Return submissions for a specific problem
    if (problemId) {
      const submissions = await withCache(
        `submissions:history:${userId}:${problemId}`,
        30, // 30s — short TTL since users submit frequently
        async () => Submission.find({ userId, problemId }).sort({ createdAt: -1 }).lean(),
      );

      return NextResponse.json(submissions);
    }

    return NextResponse.json({ error: "Provide problemId or statusMap=true" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}
