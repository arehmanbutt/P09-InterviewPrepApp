import { NextResponse } from "next/server";
import { requireAdmin } from "app/lib/admin";
import { connectDB } from "app/lib/mongodb";
import User from "app/models/User";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const search = url.searchParams.get("search") ?? "";
  const skip = (page - 1) * limit;

  await connectDB();

  // Escape regex metacharacters to prevent ReDoS attacks
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = escapedSearch ? { email: { $regex: escapedSearch, $options: "i" } } : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("clerkId email subscription teamId createdAt")
      .lean(),
    User.countDocuments(filter),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      clerkId: u.clerkId,
      email: u.email,
      tier: u.subscription?.tier ?? "free",
      status: u.subscription?.status ?? "active",
      createdAt: u.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
