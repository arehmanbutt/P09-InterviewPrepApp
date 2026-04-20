"use client";

import { Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/app/lib/cn";

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
}

export default function UsageMeter({ label, used, limit }: UsageMeterProps) {
  const isUnlimited = !isFinite(limit);

  if (isUnlimited) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className="flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1">
            <InfinityIcon className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold text-accent">Unlimited</span>
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold text-foreground">{used}</p>
        <p className="text-xs text-muted-foreground">used this month</p>
      </div>
    );
  }

  const percentage = Math.min((used / limit) * 100, 100);
  const remaining = Math.max(limit - used, 0);
  const isNearLimit = percentage >= 80;
  const isAtLimit = used >= limit;

  const accentClass = isAtLimit
    ? "text-destructive"
    : isNearLimit
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-accent";

  const barClass = isAtLimit ? "bg-destructive" : isNearLimit ? "bg-yellow-500" : "bg-accent";

  return (
    <div
      className={cn(
        "rounded-xl border border-border p-4",
        isAtLimit ? "bg-destructive/5" : "bg-card",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("text-xs font-medium", accentClass)}>{remaining} left</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground">{used}</span>
        <span className="text-sm text-muted-foreground">/ {limit}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
