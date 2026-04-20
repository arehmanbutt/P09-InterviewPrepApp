import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { Card } from "./card";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label?: string };
  className?: string;
}

function StatCard({ label, value, subtitle, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3 flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
            {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
          </div>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.value >= 0 ? "text-accent" : "text-destructive",
              )}
            >
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
              {trend.label ?? "vs last period"}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </Card>
  );
}

export { StatCard };
