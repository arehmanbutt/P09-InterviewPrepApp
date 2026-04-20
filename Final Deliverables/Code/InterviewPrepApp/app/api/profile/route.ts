import { NextResponse } from "next/server";
import { getAuthUserId } from "app/lib/auth";
import { getUserWithTier } from "app/lib/subscription/gate";
import { connectDB } from "app/lib/mongodb";
import User from "app/models/User";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserWithTier(userId);

  return NextResponse.json({
    email: user.email,
    resumeData: user.resumeData ?? null,
    tier: user.subscription.tier,
  });
}

export async function PATCH(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await connectDB();

  const update: Record<string, unknown> = {};

  // Allow updating resume data
  if ("resumeData" in body) {
    update.resumeData = body.resumeData ?? null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const user = await User.findOneAndUpdate({ clerkId: userId }, { $set: update }, { new: true });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    resumeData: user.resumeData ?? null,
  });
}
