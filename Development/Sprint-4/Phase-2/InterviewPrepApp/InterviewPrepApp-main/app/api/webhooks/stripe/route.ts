import { NextResponse } from "next/server";
import { getStripe } from "app/lib/stripe";
import { connectDB } from "app/lib/mongodb";
import { getTierFromPriceId } from "app/lib/subscription/tiers";
import User from "app/models/User";
import type Stripe from "stripe";

/** Extract period dates from a subscription's first item */
function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  return {
    start: item ? new Date(item.current_period_start * 1000) : null,
    end: item ? new Date(item.current_period_end * 1000) : null,
  };
}

/** Check if an invoice is subscription-related and get the subscription ID */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const details = invoice.parent?.subscription_details;
  if (!details) return null;
  return typeof details.subscription === "string"
    ? details.subscription
    : (details.subscription?.id ?? null);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  await connectDB();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkId = session.metadata?.clerkId;
      if (!clerkId || !session.subscription) break;

      const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
      const priceId = subscription.items.data[0]?.price.id;
      const tier = priceId ? getTierFromPriceId(priceId) : null;
      const period = getSubscriptionPeriod(subscription);

      if (tier) {
        await User.findOneAndUpdate(
          { clerkId },
          {
            "subscription.tier": tier,
            "subscription.status": "active",
            "subscription.stripeSubscriptionId": subscription.id,
            "subscription.stripePriceId": priceId,
            "subscription.currentPeriodStart": period.start,
            "subscription.currentPeriodEnd": period.end,
            "subscription.cancelAtPeriodEnd": subscription.cancel_at_period_end,
          },
        );
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      const tier = priceId ? getTierFromPriceId(priceId) : null;
      const period = getSubscriptionPeriod(subscription);

      const statusMap: Record<string, string> = {
        active: "active",
        past_due: "past_due",
        canceled: "canceled",
        unpaid: "unpaid",
        trialing: "trialing",
      };

      const update: Record<string, unknown> = {
        "subscription.status": statusMap[subscription.status] ?? subscription.status,
        "subscription.currentPeriodStart": period.start,
        "subscription.currentPeriodEnd": period.end,
        "subscription.cancelAtPeriodEnd": subscription.cancel_at_period_end,
      };

      if (tier) {
        update["subscription.tier"] = tier;
        update["subscription.stripePriceId"] = priceId;
      }

      await User.findOneAndUpdate({ stripeCustomerId: subscription.customer as string }, update);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await User.findOneAndUpdate(
        { stripeCustomerId: subscription.customer as string },
        {
          "subscription.tier": "free",
          "subscription.status": "canceled",
          "subscription.stripeSubscriptionId": null,
          "subscription.stripePriceId": null,
          "subscription.cancelAtPeriodEnd": false,
        },
      );
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = getInvoiceSubscriptionId(invoice);
      if (subId) {
        await User.findOneAndUpdate(
          { stripeCustomerId: invoice.customer as string },
          { "subscription.status": "past_due" },
        );
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = getInvoiceSubscriptionId(invoice);
      if (subId) {
        await User.findOneAndUpdate(
          {
            stripeCustomerId: invoice.customer as string,
            "subscription.status": "past_due",
          },
          { "subscription.status": "active" },
        );
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
