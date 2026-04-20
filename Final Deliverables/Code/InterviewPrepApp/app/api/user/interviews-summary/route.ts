import { NextResponse } from "next/server";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import Interview from "app/models/Interview";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const interviews = await Interview.find({ userId, status: "completed" })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("title createdAt feedback");

  const summary = interviews.map((iv) => ({
    id: iv._id.toString(),
    title: iv.title,
    createdAt: iv.createdAt,
    overallScore: iv.feedback?.overallScore ?? null,
  }));

  return NextResponse.json({ interviews: summary });
}
