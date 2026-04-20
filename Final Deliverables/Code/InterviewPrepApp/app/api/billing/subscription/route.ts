import { NextResponse } from "next/server";
import { getAuthUserId } from "app/lib/auth";
import { getSubscriptionSummary } from "app/lib/subscription/gate";
import { withCache } from "app/lib/redis";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await withCache(`sub:${userId}`, 60, () => getSubscriptionSummary(userId));
  return NextResponse.json(summary);
}
