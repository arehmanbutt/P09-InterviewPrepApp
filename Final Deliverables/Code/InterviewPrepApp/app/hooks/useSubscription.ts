"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TierFeatures } from "app/lib/subscription/tiers";
import type { SubscriptionTier, SubscriptionStatus } from "app/models/User";

const STALE_TIME_MS = 2 * 60 * 1000; // 2 minutes
const LS_KEY = "sub_cache"; // localStorage key for instant-load seed

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

const LS_CACHE_TTL_MS = 5 * 60 * 1000; // localStorage seed expires after 5 min

interface CachedEntry {
  data: SubscriptionData;
  cachedAt: number;
}

function readLocalCache(): SubscriptionData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry;
    // Discard if stale — force a fresh fetch instead
    if (Date.now() - entry.cachedAt > LS_CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeLocalCache(data: SubscriptionData) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {
    // storage full or unavailable — ignore
  }
}

export function useSubscription(): UseSubscriptionReturn {
  // Seed from localStorage instantly so the nav renders on first paint
  // without waiting for the network. The fetch below will update it.
  const [data, setData] = useState<SubscriptionData | null>(() => {
    if (typeof window === "undefined") return null;
    return readLocalCache();
  });
  // If we have cached data we can skip the loading skeleton entirely.
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return readLocalCache() === null;
  });
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const lastFetchedAtRef = useRef<number>(0);

  const fetchSubscription = useCallback(async () => {
    lastFetchedAtRef.current = Date.now();
    try {
      setError(null);
      const res = await fetch("/api/billing/subscription");
      if (!res.ok) throw new Error("Failed to fetch subscription");
      const json = await res.json();
      setData(json);
      writeLocalCache(json); // keep localStorage in sync for next visit
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Refetch on window focus, but only when data is stale (> 2 min old).
  // This avoids nav links flashing every time the user switches tabs.
  useEffect(() => {
    const handleFocus = () => {
      if (Date.now() - lastFetchedAtRef.current > STALE_TIME_MS) {
        fetchSubscription();
      }
    };
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
