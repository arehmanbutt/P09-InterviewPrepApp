import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "app/lib/mongodb";
import User from "app/models/User";
import UsageRecord from "app/models/UsageRecord";
import type { IUser, SubscriptionTier } from "app/models/User";
import { TIER_CONFIG, type FeatureFlag } from "app/lib/subscription/tiers";

function getCurrentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // "2026-03"
}

/**
 * Fetch or lazily create a User document for the given Clerk user.
 * Returns the Mongoose document so callers can read tier, usage, etc.
 */
export async function getUserWithTier(clerkId: string): Promise<IUser> {
  await connectDB();

  // Lazy provisioning — use upsert to avoid race conditions
  const clerk = await currentUser();
  const email = clerk?.emailAddresses?.[0]?.emailAddress ?? `${clerkId}@unknown`;

  const user = await User.findOneAndUpdate(
    { clerkId },
    {
      $setOnInsert: {
        clerkId,
        email,
        subscription: { tier: "free", status: "active" },
      },
    },
    { upsert: true, new: true },
  );

  return user;
}

/**
 * Check whether a boolean feature flag is enabled for the user's tier.
 */
export async function checkFeature(clerkId: string, feature: FeatureFlag): Promise<boolean> {
  const user = await getUserWithTier(clerkId);
  const tier = user.subscription.tier;
  return TIER_CONFIG[tier][feature] === true;
}

/**
 * Check whether the user is within their monthly usage limit.
 * Returns current usage count, the limit, and whether more usage is allowed.
 */
export async function checkUsageLimit(
  clerkId: string,
  usageType: "voiceInterviews" | "codingProblems",
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const user = await getUserWithTier(clerkId);
  const tier = user.subscription.tier;
  const limitKey =
    usageType === "voiceInterviews"
      ? ("voiceInterviewsPerMonth" as const)
      : ("codingProblemsPerMonth" as const);
  const limit = TIER_CONFIG[tier][limitKey];

  if (limit === Infinity) {
    return { allowed: true, used: 0, limit: Infinity };
  }

  await connectDB();
  const period = getCurrentPeriod();
  const record = await UsageRecord.findOne({ clerkId, period });
  const used = record?.[usageType] ?? 0;

  return { allowed: used < limit, used, limit };
}

/**
 * Atomically increment a usage counter for the current billing period.
 * Uses upsert so the first usage in a new month auto-creates the record.
 */
export async function incrementUsage(
  clerkId: string,
  usageType: "voiceInterviews" | "codingProblems" | "pdfReports" | "resumeParses",
): Promise<void> {
  await connectDB();
  const period = getCurrentPeriod();
  await UsageRecord.findOneAndUpdate(
    { clerkId, period },
    { $inc: { [usageType]: 1 } },
    { upsert: true },
  );
}

/**
 * Get the user's tier directly (for quick checks without full user fetch).
 */
export async function getUserTier(clerkId: string): Promise<SubscriptionTier> {
  const user = await getUserWithTier(clerkId);
  return user.subscription.tier;
}

/**
 * Get a summary of the user's subscription for the client.
 * Used by the /api/billing/subscription endpoint.
 */
export async function getSubscriptionSummary(clerkId: string) {
  const user = await getUserWithTier(clerkId);
  const tier = user.subscription.tier;
  const features = TIER_CONFIG[tier];

  await connectDB();
  const period = getCurrentPeriod();
  const record = await UsageRecord.findOne({ clerkId, period });

  return {
    tier,
    status: user.subscription.status,
    cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
    currentPeriodEnd: user.subscription.currentPeriodEnd,
    features,
    usage: {
      voiceInterviews: record?.voiceInterviews ?? 0,
      codingProblems: record?.codingProblems ?? 0,
      pdfReports: record?.pdfReports ?? 0,
      resumeParses: record?.resumeParses ?? 0,
    },
    limits: {
      voiceInterviewsPerMonth: isFinite(features.voiceInterviewsPerMonth)
        ? features.voiceInterviewsPerMonth
        : -1,
      codingProblemsPerMonth: isFinite(features.codingProblemsPerMonth)
        ? features.codingProblemsPerMonth
        : -1,
    },
  };
}
