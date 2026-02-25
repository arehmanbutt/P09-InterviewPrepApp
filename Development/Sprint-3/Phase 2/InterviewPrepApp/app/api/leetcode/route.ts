import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "app/lib/mongodb";
import { Problem } from "app/models/LeetcodeQuestion";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get("difficulty");
    const tag = searchParams.get("tag");

    const filter: Record<string, unknown> = {};
    if (difficulty) filter.difficulty_bucket = difficulty;
    if (tag) filter.tags = { $in: [tag] };

    const problems = await Problem.find(filter);

    return NextResponse.json({ success: true, data: problems }, { status: 200 });
  } catch (error) {
    console.error("Error fetching problems:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch problems" },
      { status: 500 },
    );
  }
}
