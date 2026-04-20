import { NextResponse } from "next/server";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import User from "app/models/User";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const user = await User.findOne({ clerkId: userId }).select("jobTitle bio");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    jobTitle: user.jobTitle ?? "",
    bio: user.bio ?? "",
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

  if (typeof body.jobTitle === "string") {
    update.jobTitle = body.jobTitle.trim();
  }
  if (typeof body.bio === "string") {
    update.bio = body.bio.trim();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const user = await User.findOneAndUpdate(
    { clerkId: userId },
    { $set: update },
    { new: true },
  ).select("jobTitle bio");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    jobTitle: user.jobTitle ?? "",
    bio: user.bio ?? "",
  });
}
