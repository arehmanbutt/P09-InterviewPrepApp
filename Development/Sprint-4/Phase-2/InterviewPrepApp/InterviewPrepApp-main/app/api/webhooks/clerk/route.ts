import { NextResponse } from "next/server";
import { connectDB } from "app/lib/mongodb";
import Organization from "app/models/Organization";
import User from "app/models/User";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";

export async function POST(request: Request) {
  const body = await request.text();
  const headerPayload = await headers();

  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: WebhookEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Clerk webhook verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  await connectDB();

  switch (event.type) {
    case "user.created": {
      const { id, email_addresses } = event.data;
      const email = email_addresses?.[0]?.email_address ?? `${id}@unknown`;
      await User.findOneAndUpdate(
        { clerkId: id },
        { clerkId: id, email, subscription: { tier: "free", status: "active" } },
        { upsert: true },
      );
      break;
    }

    case "user.deleted": {
      const { id } = event.data;
      if (id) {
        await User.deleteOne({ clerkId: id });
      }
      break;
    }

    case "organization.created": {
      const { id } = event.data;
      await Organization.findOneAndUpdate({ clerkOrgId: id }, { clerkOrgId: id }, { upsert: true });
      break;
    }

    case "organization.deleted": {
      const { id } = event.data;
      if (id) {
        await Organization.deleteOne({ clerkOrgId: id });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
