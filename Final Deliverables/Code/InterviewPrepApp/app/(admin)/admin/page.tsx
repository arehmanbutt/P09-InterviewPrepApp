"use client";

import { useState, useEffect } from "react";
import { Users, BarChart3, DollarSign, Activity, Building2, CreditCard } from "lucide-react";
import { StatCard } from "@/app/components/ui/stat-card";
import { Card } from "@/app/components/ui/card";
import { PageHeader } from "@/app/components/ui/page-header";
import { Skeleton } from "@/app/components/ui/skeleton";

interface Metrics {
  totalUsers: number;
  totalInterviews: number;
  completedInterviews: number;
  recentInterviews: number;
  totalOrganizations: number;
  activeSubscriptions: number;
  proCount: number;
  businessCount: number;
  mau: number;
  estimatedRevenue: number;
}

export default function AdminOverview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then((r) => {
        if (r.status === 403) throw new Error("Not authorized");
        return r.json();
      })
      .then(setMetrics)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader title="Platform Overview" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={metrics.totalUsers} icon={Users} />
        <StatCard
          label="Monthly Active Users"
          value={metrics.mau}
          subtitle="Last 30 days"
          icon={Activity}
        />
        <StatCard
          label="Total Interviews"
          value={metrics.totalInterviews}
          subtitle={`${metrics.recentInterviews} in last 30 days`}
          icon={BarChart3}
        />
        <StatCard
          label="Est. Monthly Revenue"
          value={`$${metrics.estimatedRevenue}`}
          subtitle={`${metrics.proCount} Pro + ${metrics.businessCount} Business`}
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CreditCard className="h-4 w-4" />
            <span className="text-sm">Active Subscriptions</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.activeSubscriptions}</p>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            <span>{metrics.proCount} Pro</span>
            <span>{metrics.businessCount} Business</span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Building2 className="h-4 w-4" />
            <span className="text-sm">Organizations</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.totalOrganizations}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">Completion Rate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {metrics.totalInterviews > 0
              ? `${Math.round((metrics.completedInterviews / metrics.totalInterviews) * 100)}%`
              : "—"}
          </p>
        </Card>
      </div>
    </div>
  );
}
