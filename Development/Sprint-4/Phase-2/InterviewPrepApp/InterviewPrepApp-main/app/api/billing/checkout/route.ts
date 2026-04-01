import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getAuthUserId } from "app/lib/auth";
import { getStripe } from "app/lib/stripe";
import { getUserWithTier } from "app/lib/subscription/gate";
import { getStripePriceId } from "app/lib/subscription/tiers";
import User from "app/models/User";

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { tier?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tier = body.tier;
  if (tier !== "pro" && tier !== "business") {
    return NextResponse.json({ error: "tier must be 'pro' or 'business'" }, { status: 400 });
  }

  const priceId = getStripePriceId(tier);
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price not configured for ${tier} plan` },
      { status: 500 },
    );
  }

  const user = await getUserWithTier(userId);

  // Create or retrieve Stripe customer
  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const clerk = await currentUser();
    const email = clerk?.emailAddresses?.[0]?.emailAddress;

    const customer = await getStripe().customers.create({
      email: email ?? undefined,
      metadata: { clerkId: userId },
    });

    stripeCustomerId = customer.id;
    await User.findOneAndUpdate({ clerkId: userId }, { stripeCustomerId: customer.id });
  }

  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing?success=true`,
    cancel_url: `${origin}/billing?canceled=true`,
    metadata: { clerkId: userId },
  });

  return NextResponse.json({ url: session.url });
}
