"use client";

import type { SubscriptionTier } from "app/models/User";

interface TierBadgeProps {
  tier: SubscriptionTier;
}

const TIER_STYLES: Record<SubscriptionTier, { label: string; classes: string }> = {
  free: {
    label: "Free",
    classes: "bg-muted text-muted-foreground border-border",
  },
  pro: {
    label: "Pro",
    classes: "bg-accent/10 text-accent border-accent/30",
  },
  business: {
    label: "Business",
    classes: "bg-primary/10 text-primary border-primary/30",
  },
};

export default function TierBadge({ tier }: TierBadgeProps) {
  const { label, classes } = TIER_STYLES[tier];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
