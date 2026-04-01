import { NextResponse } from "next/server";
import { getAuthUserId } from "app/lib/auth";
import { getStripe } from "app/lib/stripe";
import { getUserWithTier } from "app/lib/subscription/gate";

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserWithTier(userId);

  if (!user.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found. Please subscribe to a plan first." },
      { status: 400 },
    );
  }

  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
