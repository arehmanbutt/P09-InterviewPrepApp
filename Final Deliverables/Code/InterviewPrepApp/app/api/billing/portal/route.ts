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

  // Prefer an explicit app URL env var so the return_url is correct even when
  // the `origin` header is stripped by a load balancer or reverse proxy.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";

  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
