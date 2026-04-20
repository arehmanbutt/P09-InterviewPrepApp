import { NextResponse } from "next/server";
import { connectDB } from "app/lib/mongodb";
import { Problem } from "app/models/LeetcodeQuestion";
import { withCache } from "app/lib/redis";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;

    const problem = await withCache(
      `problem:${id}`,
      60 * 60 * 24 * 7, // 7 days — problem data never changes
      async () => {
        const doc =
          (await Problem.findOne({ titleSlug: id }).lean()) ??
          (await Problem.findOne({ id }).lean());
        return doc ?? null;
      },
    );

    if (!problem) {
      return NextResponse.json({ success: false, error: "Problem not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: problem }, { status: 200 });
  } catch (error) {
    console.error("Error fetching problem:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch problem" }, { status: 500 });
  }
}
