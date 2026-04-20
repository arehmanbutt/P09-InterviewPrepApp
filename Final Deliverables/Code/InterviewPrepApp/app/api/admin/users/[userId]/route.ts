import { NextResponse } from "next/server";
import { requireAdmin } from "app/lib/admin";
import { connectDB } from "app/lib/mongodb";
import User from "app/models/User";
import Interview from "app/models/Interview";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  await connectDB();

  const user = await User.findOne({ clerkId: userId }).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const interviewCount = await Interview.countDocuments({ userId });

  return NextResponse.json({
    clerkId: user.clerkId,
    email: user.email,
    subscription: user.subscription,
    stripeCustomerId: user.stripeCustomerId,
    teamId: user.teamId,
    createdAt: user.createdAt,
    interviewCount,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await connectDB();

  const update: Record<string, unknown> = {};

  // Allow admins to override tier
  if (body.tier === "free" || body.tier === "pro" || body.tier === "business") {
    update["subscription.tier"] = body.tier;
  }

  if (body.status === "active" || body.status === "canceled" || body.status === "past_due") {
    update["subscription.status"] = body.status;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const user = await User.findOneAndUpdate(
    { clerkId: userId },
    { $set: update },
    { new: true },
  ).lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    clerkId: user.clerkId,
    email: user.email,
    subscription: user.subscription,
  });
}
