"use client";

import { useState, useEffect, useCallback } from "react";
import type { TierFeatures } from "app/lib/subscription/tiers";
import type { SubscriptionTier, SubscriptionStatus } from "app/models/User";

interface UsageData {
  voiceInterviews: number;
  codingProblems: number;
  pdfReports: number;
  resumeParses: number;
}

interface LimitsData {
  voiceInterviewsPerMonth: number;
  codingProblemsPerMonth: number;
}

interface SubscriptionData {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  features: TierFeatures;
  usage: UsageData;
  limits: LimitsData;
}

interface UseSubscriptionReturn {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  features: TierFeatures;
  usage: UsageData;
  limits: LimitsData;
  cancelAtPeriodEnd: boolean;
  isLoading: boolean;
  error: string | null;
  isPro: boolean;
  isBusiness: boolean;
  isFree: boolean;
  refetch: () => void;
}

const DEFAULT_FEATURES: TierFeatures = {
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
};

export function useSubscription(): UseSubscriptionReturn {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/billing/subscription");
      if (!res.ok) {
        throw new Error("Failed to fetch subscription");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Refetch on window focus for fresh data
  useEffect(() => {
    const handleFocus = () => fetchSubscription();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchSubscription]);

  const tier = data?.tier ?? "free";

  return {
    tier,
    status: data?.status ?? "active",
    features: data?.features ?? DEFAULT_FEATURES,
    usage: data?.usage ?? { voiceInterviews: 0, codingProblems: 0, pdfReports: 0, resumeParses: 0 },
    limits: {
      voiceInterviewsPerMonth:
        data?.limits?.voiceInterviewsPerMonth === -1
          ? Infinity
          : (data?.limits?.voiceInterviewsPerMonth ?? 3),
      codingProblemsPerMonth:
        data?.limits?.codingProblemsPerMonth === -1
          ? Infinity
          : (data?.limits?.codingProblemsPerMonth ?? 10),
    },
    cancelAtPeriodEnd: data?.cancelAtPeriodEnd ?? false,
    isLoading,
    error,
    isPro: tier === "pro",
    isBusiness: tier === "business",
    isFree: tier === "free",
    refetch: fetchSubscription,
  };
}
