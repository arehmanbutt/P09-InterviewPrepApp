import { NextResponse } from "next/server";
import { getAuthContext } from "app/lib/auth";
import { canManageTeam } from "app/lib/permissions";
import { connectDB } from "app/lib/mongodb";
import Organization from "app/models/Organization";

export async function GET(_request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  await connectDB();
  const org = await Organization.findOne({ clerkOrgId: orgId });

  if (!org) {
    return NextResponse.json({ branding: null });
  }

  return NextResponse.json({ branding: org.branding });
}

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { userId, orgId: activeOrgId, orgRole } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;
  if (activeOrgId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canManageTeam(orgRole)) {
    return NextResponse.json({ error: "Only admins can update branding" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (typeof body.logoUrl === "string" || body.logoUrl === null) {
    update["branding.logoUrl"] = body.logoUrl;
  }
  if (typeof body.primaryColor === "string") {
    update["branding.primaryColor"] = body.primaryColor;
  }
  if (typeof body.secondaryColor === "string") {
    update["branding.secondaryColor"] = body.secondaryColor;
  }
  if (typeof body.companyName === "string") {
    update["branding.companyName"] = body.companyName;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid branding fields provided" }, { status: 400 });
  }

  await connectDB();

  const org = await Organization.findOneAndUpdate(
    { clerkOrgId: orgId },
    { $set: update },
    { new: true, upsert: true },
  );

  return NextResponse.json({ branding: org.branding });
}
