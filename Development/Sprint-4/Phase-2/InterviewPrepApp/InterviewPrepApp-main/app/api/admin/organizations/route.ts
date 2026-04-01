import { NextResponse } from "next/server";
import { requireAdmin } from "app/lib/admin";
import { connectDB } from "app/lib/mongodb";
import Organization from "app/models/Organization";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const organizations = await Organization.find()
    .sort({ createdAt: -1 })
    .select("clerkOrgId plan seatLimit branding createdAt")
    .lean();

  return NextResponse.json({ organizations });
}
