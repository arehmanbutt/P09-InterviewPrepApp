import { NextResponse } from "next/server";
import { connectDB } from "app/lib/mongodb";
import { Problem } from "app/models/LeetcodeQuestion";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const problem = await Problem.findOne({ id });

    if (!problem) {
      return NextResponse.json({ success: false, error: "Problem not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: problem }, { status: 200 });
  } catch (error) {
    console.error("Error fetching problem:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch problem" }, { status: 500 });
  }
}
