"use client";

import { useState, useEffect, useRef } from "react";
import { useOrganization } from "@clerk/nextjs";
import { BarChart3, Users, CheckCircle, TrendingUp } from "lucide-react";
import VolumeChart from "app/components/analytics/VolumeChart";
import ScoreChart from "app/components/analytics/ScoreChart";
import PipelineChart from "app/components/analytics/PipelineChart";
import UpgradePrompt from "app/components/subscription/UpgradePrompt";
import { useSubscription } from "app/hooks/useSubscription";
import { StatCard } from "@/app/components/ui/stat-card";
import { Card } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { PageHeader } from "@/app/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { EmptyState } from "@/app/components/ui/empty-state";

interface SummaryData {
  totalInterviews: number;
  completedInterviews: number;
  recentInterviews: number;
  averageScore: number | null;
  completionRate: number;
  totalCandidates: number;
}

export default function AnalyticsPage() {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { isBusiness, isLoading: subLoading } = useSubscription();
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [volumeData, setVolumeData] = useState([]);
  const [scoreData, setScoreData] = useState([]);
  const [pipelineData, setPipelineData] = useState({
    scheduled: 0,
    "in-progress": 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!organization?.id) return;

    // Abort any in-flight request from a previous render
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    const orgId = organization.id;

    setLoading(true);

    (async () => {
      try {
        const [summaryRes, volumeRes, scoresRes, pipelineRes] = await Promise.all([
          fetch(`/api/organizations/${orgId}/analytics/summary`, { signal }),
          fetch(`/api/organizations/${orgId}/analytics/volume?days=${days}`, { signal }),
          fetch(`/api/organizations/${orgId}/analytics/scores?days=${days}`, { signal }),
          fetch(`/api/organizations/${orgId}/analytics/pipeline`, { signal }),
        ]);

        if (signal.aborted) return;

        const [s, v, sc, p] = await Promise.all([
          summaryRes.json(),
          volumeRes.json(),
          scoresRes.json(),
          pipelineRes.json(),
        ]);

        if (signal.aborted) return;

        setSummary(s);
        setVolumeData(v);
        setScoreData(sc);
        setPipelineData(p);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Failed to fetch analytics:", err);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [organization?.id, days]);

  if (!orgLoaded || subLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isBusiness) {
    return (
      <div className="mx-auto max-w-lg pt-20">
        <UpgradePrompt feature="Analytics dashboard" requiredTier="business" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="mx-auto max-w-lg pt-20">
        <EmptyState
          icon={BarChart3}
          title="No Organization Selected"
          description="Switch to an organization using the switcher in the sidebar to view analytics."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader title="Analytics" description={organization.name ?? undefined}>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Interviews"
              value={summary?.totalInterviews ?? 0}
              subtitle={`${summary?.recentInterviews ?? 0} in last 30 days`}
              icon={BarChart3}
            />
            <StatCard
              label="Completion Rate"
              value={`${summary?.completionRate ?? 0}%`}
              subtitle={`${summary?.completedInterviews ?? 0} completed`}
              icon={CheckCircle}
            />
            <StatCard
              label="Average Score"
              value={summary?.averageScore ?? "—"}
              subtitle="out of 5.0"
              icon={TrendingUp}
            />
            <StatCard
              label="Total Candidates"
              value={summary?.totalCandidates ?? 0}
              subtitle="from mass interviews"
              icon={Users}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">Interview Volume</h3>
              <VolumeChart data={volumeData} />
            </Card>
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">Average Scores</h3>
              <ScoreChart data={scoreData} />
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Interview Pipeline</h3>
            <div className="mx-auto max-w-md">
              <PipelineChart data={pipelineData} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
