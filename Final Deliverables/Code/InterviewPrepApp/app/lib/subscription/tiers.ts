import type { SubscriptionTier } from "app/models/User";

export interface TierFeatures {
  voiceInterviewsPerMonth: number;
  codingProblemsPerMonth: number;
  pdfReports: boolean;
  resumeParsing: boolean;
  massInterviews: boolean;
  priorityVoice: boolean;
  teamSeats: boolean;
  candidateComparison: boolean;
  analyticsDashboard: boolean;
  customBranding: boolean;
  apiAccess: boolean;
}

export type FeatureFlag = keyof {
  [K in keyof TierFeatures as TierFeatures[K] extends boolean ? K : never]: true;
};

export type UsageLimitKey = keyof {
  [K in keyof TierFeatures as TierFeatures[K] extends number ? K : never]: true;
};

export const TIER_CONFIG: Record<SubscriptionTier, TierFeatures> = {
  free: {
    voiceInterviewsPerMonth: 3,
    codingProblemsPerMonth: 10,
    pdfReports: false,
    resumeParsing: false,
    massInterviews: false,
    priorityVoice: false,
    teamSeats: false,
    candidateComparison: false,
    analyticsDashboard: false,
    customBranding: false,
    apiAccess: false,
  },
  pro: {
    voiceInterviewsPerMonth: Infinity,
    codingProblemsPerMonth: Infinity,
    pdfReports: true,
    resumeParsing: true,
    massInterviews: false,
    priorityVoice: true,
    teamSeats: false,
    candidateComparison: false,
    analyticsDashboard: false,
    customBranding: false,
    apiAccess: false,
  },
  business: {
    voiceInterviewsPerMonth: Infinity,
    codingProblemsPerMonth: Infinity,
    pdfReports: true,
    resumeParsing: true,
    massInterviews: true,
    priorityVoice: true,
    teamSeats: true,
    candidateComparison: true,
    analyticsDashboard: true,
    customBranding: true,
    apiAccess: true,
  },
} as const;

/** Map usage record field names to tier config limit keys */
export const USAGE_FIELD_MAP: Record<string, UsageLimitKey> = {
  voiceInterviews: "voiceInterviewsPerMonth",
  codingProblems: "codingProblemsPerMonth",
};

/** Stripe price IDs from environment variables */
export function getStripePriceId(tier: "pro" | "business"): string | undefined {
  if (tier === "pro") return process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (tier === "business") return process.env.STRIPE_PRICE_BUSINESS_MONTHLY;
  return undefined;
}

/** Map a Stripe price ID back to a tier */
export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "pro";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS_MONTHLY) return "business";
  return null;
}
