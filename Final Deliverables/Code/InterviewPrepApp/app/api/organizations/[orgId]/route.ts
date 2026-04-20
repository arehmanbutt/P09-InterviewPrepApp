import { NextResponse } from "next/server";
import { getAuthContext } from "app/lib/auth";
import { canManageTeam } from "app/lib/permissions";
import { connectDB } from "app/lib/mongodb";
import Organization from "app/models/Organization";
import { withCache, getRedis } from "app/lib/redis";

export async function GET(_request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { userId, orgId: activeOrgId, orgRole } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  // User must be in the org they're requesting
  if (activeOrgId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  // Lazy provisioning must run unconditionally — only the shaped response is cached
  let org = await Organization.findOne({ clerkOrgId: orgId });
  if (!org) {
    org = await Organization.create({ clerkOrgId: orgId });
  }

  const data = await withCache(`org:${orgId}`, 120, async () => ({
    clerkOrgId: org!.clerkOrgId,
    plan: org!.plan,
    seatLimit: org!.seatLimit,
    branding: org!.branding,
    usageStats: org!.usageStats,
  }));

  return NextResponse.json({ ...data, role: orgRole });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { userId, orgId: activeOrgId, orgRole } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  if (activeOrgId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canManageTeam(orgRole)) {
    return NextResponse.json(
      { error: "Only admins can update organization settings" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await connectDB();

  const allowedUpdates: Record<string, unknown> = {};

  // Allow updating branding fields
  if (body.branding && typeof body.branding === "object") {
    const b = body.branding as Record<string, unknown>;
    if (typeof b.companyName === "string") allowedUpdates["branding.companyName"] = b.companyName;
    if (typeof b.primaryColor === "string")
      allowedUpdates["branding.primaryColor"] = b.primaryColor;
    if (typeof b.secondaryColor === "string")
      allowedUpdates["branding.secondaryColor"] = b.secondaryColor;
    if (typeof b.logoUrl === "string") allowedUpdates["branding.logoUrl"] = b.logoUrl;
  }

  if (Object.keys(allowedUpdates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const org = await Organization.findOneAndUpdate(
    { clerkOrgId: orgId },
    { $set: allowedUpdates },
    { new: true, upsert: true },
  );

  try {
    await getRedis().del(`org:${orgId}`);
  } catch {
    /* Redis unavailable */
  }

  return NextResponse.json({
    clerkOrgId: org.clerkOrgId,
    plan: org.plan,
    branding: org.branding,
  });
}
