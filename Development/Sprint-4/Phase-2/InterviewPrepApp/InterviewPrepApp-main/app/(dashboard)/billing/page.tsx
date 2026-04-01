"use client";

import { useState } from "react";
import { useSubscription } from "app/hooks/useSubscription";
import UsageMeter from "app/components/subscription/UsageMeter";
import TierBadge from "app/components/subscription/TierBadge";
import { Check, Loader2, ExternalLink, Sparkles } from "lucide-react";
import type { SubscriptionTier } from "app/models/User";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { PageHeader } from "@/app/components/ui/page-header";
import { cn } from "@/app/lib/cn";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanCard {
  tier: SubscriptionTier;
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  highlighted?: boolean;
}

const PLANS: PlanCard[] = [
  {
    tier: "free",
    name: "Free",
    price: "$0",
    period: "",
    description: "Get started with AI interview practice",
    features: [
      { text: "3 voice interviews per month", included: true },
      { text: "10 coding problems per month", included: true },
      { text: "Basic feedback after each interview", included: true },
      { text: "PDF reports", included: false },
      { text: "Resume parsing", included: false },
      { text: "Mass interviews", included: false },
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    price: "$9",
    period: "/month",
    description: "For serious job seekers who want an edge",
    highlighted: true,
    features: [
      { text: "Unlimited voice interviews", included: true },
      { text: "Unlimited coding problems", included: true },
      { text: "Detailed feedback & scoring", included: true },
      { text: "PDF reports & downloads", included: true },
      { text: "Resume parsing for personalized Qs", included: true },
      { text: "Priority voice quality", included: true },
    ],
  },
  {
    tier: "business",
    name: "Business",
    price: "$49",
    period: "/month",
    description: "For teams screening candidates at scale",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Mass interviews with shareable links", included: true },
      { text: "Team seats & role management", included: true },
      { text: "Candidate comparison & ranking", included: true },
      { text: "Analytics dashboard", included: true },
      { text: "Custom branding & white-label", included: true },
    ],
  },
];

export default function BillingPage() {
  const { tier, usage, limits, cancelAtPeriodEnd, isLoading, isFree } = useSubscription();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleUpgrade(targetTier: "pro" | "business") {
    setLoadingTier(targetTier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: targetTier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
      }
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setLoadingTier(null);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Portal error:", data.error);
      }
    } catch (err) {
      console.error("Portal failed:", err);
    } finally {
      setPortalLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-36 rounded-xl" />
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Check for success/cancel URL params
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const showSuccess = params?.get("success") === "true";
  const showCanceled = params?.get("canceled") === "true";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader title="Billing & Plans" description="Manage your subscription and track usage">
        {!isFree && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageBilling}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Manage Billing
          </Button>
        )}
      </PageHeader>

      {/* Status banners */}
      {showSuccess && (
        <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          Subscription activated successfully! Your plan has been upgraded.
        </div>
      )}
      {showCanceled && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
          Checkout was canceled. No charges were made.
        </div>
      )}
      {cancelAtPeriodEnd && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
          Your subscription will be canceled at the end of the current billing period. You can
          resubscribe anytime.
        </div>
      )}

      {/* Current Plan & Usage */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-base font-semibold">Current Plan</h2>
          <TierBadge tier={tier} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <UsageMeter
            label="Voice Interviews"
            used={usage.voiceInterviews}
            limit={limits.voiceInterviewsPerMonth}
          />
          <UsageMeter
            label="Coding Problems"
            used={usage.codingProblems}
            limit={limits.codingProblemsPerMonth}
          />
        </div>
      </Card>

      {/* Pricing Cards */}
      <div>
        <h2 className="mb-4 text-base font-semibold">{isFree ? "Choose a Plan" : "Change Plan"}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.tier === tier;
            const isDowngrade =
              (tier === "business" && plan.tier !== "business") ||
              (tier === "pro" && plan.tier === "free");

            return (
              <div
                key={plan.tier}
                className={cn(
                  "relative rounded-xl border p-6 transition-all",
                  plan.highlighted ? "border-primary/40 bg-primary/5" : "border-border bg-card",
                  isCurrent && "ring-2 ring-primary",
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                </div>

                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 flex-shrink-0",
                          feature.included ? "text-accent" : "text-muted-foreground/30",
                        )}
                      />
                      <span
                        className={
                          feature.included ? "text-foreground/80" : "text-muted-foreground/50"
                        }
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">
                    Current Plan
                  </Button>
                ) : isDowngrade ? (
                  <Button
                    variant="ghost"
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    className="w-full"
                  >
                    Downgrade
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(plan.tier as "pro" | "business")}
                    disabled={loadingTier === plan.tier}
                    variant={plan.highlighted ? "default" : "secondary"}
                    className="w-full"
                  >
                    {loadingTier === plan.tier ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stripe test mode notice */}
      {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test") && (
        <p className="text-center text-xs text-muted-foreground">
          Stripe is in test mode. Use card 4242 4242 4242 4242 with any future date and CVC.
        </p>
      )}
    </div>
  );
}
