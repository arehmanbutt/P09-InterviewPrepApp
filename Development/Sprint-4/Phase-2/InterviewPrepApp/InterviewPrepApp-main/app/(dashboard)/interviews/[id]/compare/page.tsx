"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Star } from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { EmptyState } from "@/app/components/ui/empty-state";
import { PageHeader } from "@/app/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/data-table";

interface CandidateCompare {
  _id: string;
  candidateName: string;
  candidateEmail: string;
  overallScore: number | null;
  aggregateScores: {
    correctness: number;
    depth: number;
    communication: number;
  } | null;
  strengths: string[];
  improvements: string[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#ef4444", "#3b82f6"];

export default function ComparePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const candidateIds = searchParams.get("candidates")?.split(",") ?? [];

  const [candidates, setCandidates] = useState<CandidateCompare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (candidateIds.length === 0) return;
    fetch(`/api/interviews/${id}/candidates/compare?ids=${candidateIds.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          data.sort(
            (a: CandidateCompare, b: CandidateCompare) =>
              (b.overallScore ?? 0) - (a.overallScore ?? 0),
          );
          setCandidates(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, candidateIds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const radarData = ["Correctness", "Depth", "Communication"].map((dim) => {
    const key = dim.toLowerCase() as "correctness" | "depth" | "communication";
    const entry: Record<string, string | number> = { dimension: dim };
    candidates.forEach((c) => {
      entry[c.candidateName] = c.aggregateScores?.[key] ?? 0;
    });
    return entry;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Candidate Comparison"
        description={`${candidates.length} candidates selected`}
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/interviews/${id}/candidates`}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <a href={`/api/interviews/${id}/candidates/export?format=csv`} download>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </a>
          </Button>
        </div>
      </PageHeader>

      {candidates.length === 0 ? (
        <Card className="p-12">
          <EmptyState title="No completed candidates to compare" />
        </Card>
      ) : (
        <>
          {/* Radar Chart */}
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Score Comparison</h3>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  domain={[0, 5]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                />
                {candidates.map((c, i) => (
                  <Radar
                    key={c._id}
                    name={c.candidateName}
                    dataKey={c.candidateName}
                    stroke={COLORS[i % COLORS.length]}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Ranking Table */}
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Correctness</TableHead>
                  <TableHead>Depth</TableHead>
                  <TableHead>Communication</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c, i) => (
                  <TableRow key={c._id}>
                    <TableCell>
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: `${COLORS[i % COLORS.length]}20`,
                          color: COLORS[i % COLORS.length],
                        }}
                      >
                        {i + 1}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{c.candidateName}</p>
                      <p className="text-xs text-muted-foreground">{c.candidateEmail}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                        <span className="text-sm font-medium text-foreground">
                          {c.overallScore?.toFixed(1) ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.aggregateScores?.correctness?.toFixed(1) ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.aggregateScores?.depth?.toFixed(1) ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.aggregateScores?.communication?.toFixed(1) ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Strengths & Improvements per candidate */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c, i) => (
              <Card key={c._id} className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: `${COLORS[i % COLORS.length]}20`,
                      color: COLORS[i % COLORS.length],
                    }}
                  >
                    {i + 1}
                  </span>
                  <h4 className="text-sm font-medium text-foreground">{c.candidateName}</h4>
                </div>
                {c.strengths.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-medium text-accent">Strengths</p>
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      {c.strengths.slice(0, 3).map((s, j) => (
                        <li key={j}>+ {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {c.improvements.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      Areas to Improve
                    </p>
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      {c.improvements.slice(0, 3).map((s, j) => (
                        <li key={j}>- {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
