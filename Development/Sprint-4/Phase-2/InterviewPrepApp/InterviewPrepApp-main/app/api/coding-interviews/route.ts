import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "app/lib/mongodb";
import { getAuthUserId } from "app/lib/auth";
import CodingInterview from "app/models/CodingInterview";
import { Problem } from "app/models/LeetcodeQuestion";

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const interviews = await CodingInterview.find({ userId }).sort({ createdAt: -1 }).lean();

    return NextResponse.json(interviews);
  } catch (error) {
    console.error("Error fetching coding interviews:", error);
    return NextResponse.json({ error: "Failed to fetch coding interviews" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      title,
      difficulty = "mixed",
      numProblems = 5,
      timeLimit = null,
      tags = [],
      isMassInterview = false,
      customProblemIds,
    } = body as {
      title: string;
      difficulty?: string;
      numProblems?: number;
      timeLimit?: number | null;
      tags?: string[];
      isMassInterview?: boolean;
      customProblemIds?: string[];
    };

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let problemIds: string[] = [];

    if (Array.isArray(customProblemIds) && customProblemIds.length > 0) {
      // Custom selection — validate IDs exist then use them directly
      const found = await Problem.find(
        { id: { $in: customProblemIds }, problem_format: "leetcode" },
        { id: 1 },
      ).lean();
      const foundIds = new Set(found.map((p: { id: string }) => p.id));
      // Preserve user's ordering
      problemIds = customProblemIds.filter((id) => foundIds.has(id));

      if (problemIds.length === 0) {
        return NextResponse.json(
          { error: "None of the selected problems were found" },
          { status: 400 },
        );
      }
    } else {
      // Random selection
      if (![3, 5, 10].includes(numProblems)) {
        return NextResponse.json({ error: "numProblems must be 3, 5, or 10" }, { status: 400 });
      }

      const filter: Record<string, unknown> = { problem_format: "leetcode" };
      if (tags.length > 0) filter.tags = { $in: tags };

      if (difficulty === "mixed") {
        const easyCount = Math.ceil(numProblems * 0.4);
        const mediumCount = Math.ceil(numProblems * 0.4);
        const hardCount = numProblems - easyCount - mediumCount;

        const [easy, medium, hard] = await Promise.all([
          Problem.aggregate([
            { $match: { ...filter, difficulty_bucket: "easy" } },
            { $sample: { size: easyCount } },
            { $project: { id: 1 } },
          ]),
          Problem.aggregate([
            { $match: { ...filter, difficulty_bucket: "medium" } },
            { $sample: { size: mediumCount } },
            { $project: { id: 1 } },
          ]),
          Problem.aggregate([
            { $match: { ...filter, difficulty_bucket: "hard" } },
            { $sample: { size: Math.max(hardCount, 1) } },
            { $project: { id: 1 } },
          ]),
        ]);

        problemIds = [
          ...easy.map((p: { id: string }) => p.id),
          ...medium.map((p: { id: string }) => p.id),
          ...hard.map((p: { id: string }) => p.id),
        ].slice(0, numProblems);
      } else {
        const problems = await Problem.aggregate([
          { $match: { ...filter, difficulty_bucket: difficulty } },
          { $sample: { size: numProblems } },
          { $project: { id: 1 } },
        ]);
        problemIds = problems.map((p: { id: string }) => p.id);
      }

      if (problemIds.length === 0) {
        return NextResponse.json({ error: "No problems found matching criteria" }, { status: 400 });
      }
    }

    const shareToken = isMassInterview ? crypto.randomUUID() : null;

    const interview = await CodingInterview.create({
      userId,
      title,
      difficulty,
      // Always use actual problem count — never the form's numProblems field
      numProblems: problemIds.length,
      timeLimit,
      tags,
      status: "scheduled",
      problems: problemIds,
      isMassInterview,
      shareToken,
      submissions: problemIds.map((pid) => ({
        problemId: pid,
        language: "javascript",
        code: "",
        status: "not_attempted",
        testsPassed: 0,
        testsTotal: 0,
        runtime: "N/A",
        submittedAt: null,
      })),
    });

    return NextResponse.json(interview, { status: 201 });
  } catch (error) {
    console.error("Error creating coding interview:", error);
    return NextResponse.json({ error: "Failed to create coding interview" }, { status: 500 });
  }
}
