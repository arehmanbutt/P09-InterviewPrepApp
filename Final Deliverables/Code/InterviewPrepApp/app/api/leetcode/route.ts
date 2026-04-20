import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "app/lib/mongodb";
import { Problem } from "app/models/LeetcodeQuestion";
import { withCache } from "app/lib/redis";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get("difficulty");
    const tag = searchParams.get("tag");
    const format = searchParams.get("format");
    const limitParam = searchParams.get("limit");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "0", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "0", 10);

    const filter: Record<string, unknown> = {};
    if (format) filter.problem_format = format;
    if (difficulty) filter.difficulty_bucket = difficulty;
    if (tag) filter.tags = { $in: [tag] };
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    // Random sampling: use $sample aggregation when limit is specified
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit) && limit > 0) {
        const problems = await Problem.aggregate([
          { $match: filter },
          { $sample: { size: limit } },
        ] as never[]);
        return NextResponse.json({ success: true, data: problems }, { status: 200 });
      }
    }

    // Paginated listing for problem browser
    if (pageSize > 0) {
      const skip = page > 0 ? (page - 1) * pageSize : 0;
      const projection = {
        id: 1,
        title: 1,
        titleSlug: 1,
        tags: 1,
        difficulty_bucket: 1,
        problem_format: 1,
      };

      const cacheKey = `problems:list:${page}:${difficulty ?? ""}:${tag ?? ""}:${format ?? ""}:${search ?? ""}:${pageSize}`;
      const result = await withCache(cacheKey, 3600, async () => {
        const [problems, total] = await Promise.all([
          Problem.find(filter, projection).sort({ title: 1 }).skip(skip).limit(pageSize).lean(),
          Problem.countDocuments(filter),
        ]);
        return { success: true, data: problems, total, page: page || 1, pageSize };
      });

      return NextResponse.json(result, { status: 200 });
    }

    const cacheKey = `problems:list:all:${difficulty ?? ""}:${tag ?? ""}:${format ?? ""}:${search ?? ""}`;
    const problems = await withCache(cacheKey, 3600, () => Problem.find(filter).lean());

    return NextResponse.json({ success: true, data: problems }, { status: 200 });
  } catch (error) {
    console.error("Error fetching problems:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch problems" },
      { status: 500 },
    );
  }
}
