"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface UpgradePromptProps {
  feature: string;
  requiredTier?: "pro" | "business";
}

export default function UpgradePrompt({ feature, requiredTier = "pro" }: UpgradePromptProps) {
  const tierLabel = requiredTier === "business" ? "Business" : "Pro";

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <ArrowUpRight className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-foreground">Upgrade to {tierLabel}</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        {feature} requires a {tierLabel} plan.
      </p>
      <Button asChild className="gap-2">
        <Link href="/billing">
          View Plans
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
