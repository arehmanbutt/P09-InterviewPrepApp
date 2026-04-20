"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Code2,
  ChevronDown,
  ChevronRight,
  Calendar,
  Minus,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { EmptyState } from "@/app/components/ui/empty-state";
import { cn } from "@/app/lib/cn";

interface Submission {
  problemId: string;
  language: string;
  code: string;
  status: "accepted" | "wrong_answer" | "error" | "not_attempted";
  testsPassed: number;
  testsTotal: number;
  runtime: string;
  submittedAt: string | null;
}

interface ProblemDetail {
  id: string;
  title: string;
  difficulty_bucket: string;
}

interface CodingInterviewResult {
  _id: string;
  title: string;
  difficulty: string;
  numProblems: number;
  timeLimit: number | null;
  status: string;
  submissions: Submission[];
  problemDetails: ProblemDetail[];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

function getDifficultyClass(d: string) {
  switch (d.toLowerCase()) {
    case "easy":
      return "text-accent";
    case "medium":
      return "text-yellow-500";
    case "hard":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "accepted":
      return <CheckCircle2 className="h-4 w-4 text-accent" />;
    case "wrong_answer":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "error":
      return <XCircle className="h-4 w-4 text-orange-500" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "wrong_answer":
      return "Wrong Answer";
    case "error":
      return "Error";
    default:
      return "Not Attempted";
  }
}

function statusClass(status: string) {
  switch (status) {
    case "accepted":
      return "text-accent";
    case "not_attempted":
      return "text-muted-foreground";
    default:
      return "text-destructive";
  }
}

export default function CodingResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<CodingInterviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/coding-interviews/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto py-24">
        <EmptyState
          title="Results not found"
          action={
            <a href="/dashboard" className="text-sm text-primary hover:underline">
              Back to Dashboard
            </a>
          }
        />
      </div>
    );
  }

  const problemMap = new Map(data.problemDetails.map((p) => [p.id, p]));
  const solved = data.submissions.filter((s) => s.status === "accepted").length;

  const duration =
    data.startedAt && data.completedAt
      ? Math.round(
          (new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime()) / 1000,
        )
      : null;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 gap-1.5 text-muted-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <h1 className="text-2xl font-bold text-foreground mb-1">{data.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(data.createdAt).toLocaleDateString()}
          </span>
          <span className="inline-flex items-center gap-1 capitalize">
            <Code2 className="h-3.5 w-3.5" />
            {data.difficulty} · {data.numProblems} problems
          </span>
          {duration !== null && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(duration)}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-foreground">
            {solved}/{data.numProblems}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Problems Solved</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-foreground">
            {duration !== null ? formatDuration(duration) : "N/A"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Time Taken</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-foreground">
            {data.numProblems > 0 ? Math.round((solved / data.numProblems) * 100) : 0}%
          </p>
          <p className="text-sm text-muted-foreground mt-1">Score</p>
        </Card>
      </div>

      {/* Problems Table */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Problem Breakdown</h2>
        </div>

        <div className="divide-y divide-border/50">
          {data.submissions.map((sub, idx) => {
            const problem = problemMap.get(sub.problemId);
            const isExpanded = expandedProblem === sub.problemId;

            return (
              <div key={sub.problemId}>
                <button
                  onClick={() => setExpandedProblem(isExpanded ? null : sub.problemId)}
                  className="w-full px-5 py-3 flex items-center gap-4 hover:bg-muted/30 transition text-left"
                >
                  <span className="text-xs text-muted-foreground w-6">{idx + 1}</span>
                  <StatusIcon status={sub.status} />
                  <span className="flex-1 text-sm text-foreground truncate">
                    {problem?.title ?? sub.problemId}
                  </span>
                  {problem && (
                    <span
                      className={cn(
                        "text-xs font-medium",
                        getDifficultyClass(problem.difficulty_bucket),
                      )}
                    >
                      {problem.difficulty_bucket}
                    </span>
                  )}
                  <span className={cn("text-xs font-medium", statusClass(sub.status))}>
                    {statusLabel(sub.status)}
                  </span>
                  {sub.testsTotal > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {sub.testsPassed}/{sub.testsTotal}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{sub.runtime}</span>
                  {sub.code ? (
                    isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )
                  ) : (
                    <span className="w-3.5" />
                  )}
                </button>

                {isExpanded && sub.code && (
                  <div className="px-5 pb-4">
                    <div className="rounded-lg bg-[#0d1117] border border-border overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                        <span className="text-xs text-muted-foreground font-mono capitalize">
                          {sub.language}
                        </span>
                      </div>
                      <pre className="text-xs text-gray-300 font-mono p-4 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre leading-relaxed">
                        {sub.code}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
