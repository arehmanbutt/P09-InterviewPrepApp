import { NextResponse } from "next/server";
import { getAuthUserId } from "app/lib/auth";
import { getSubscriptionSummary } from "app/lib/subscription/gate";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getSubscriptionSummary(userId);
  return NextResponse.json(summary);
}
