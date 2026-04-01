"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Star,
  Copy,
  Check,
  ArrowRight,
  Download,
  GitCompare,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
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
import { Card } from "@/app/components/ui/card";

interface CandidateRow {
  _id: string;
  candidateName: string;
  candidateEmail: string;
  status: "scheduled" | "in-progress" | "completed";
  overallScore: number | null;
  createdAt: string;
}

const statusVariant: Record<CandidateRow["status"], "scheduled" | "in-progress" | "completed"> = {
  scheduled: "scheduled",
  "in-progress": "in-progress",
  completed: "completed",
};

export default function CandidatesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/interviews/${id}/candidates`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCandidates(data);
      })
      .catch(() => {
        toast.error("Failed to load candidates");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopyLink = async () => {
    try {
      const res = await fetch(`/api/interviews/${id}`);
      const interview = await res.json();
      if (interview.shareToken) {
        await navigator.clipboard.writeText(
          `${window.location.origin}/join/${interview.shareToken}`,
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Invite link copied to clipboard");
      }
    } catch {
      toast.error("Failed to copy invite link");
    }
  };

  const toggleSelect = (candidateId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const completedIds = candidates
      .filter((c) => c.status === "completed" && c.overallScore !== null)
      .map((c) => c._id);
    if (selected.size === completedIds.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(completedIds));
    }
  };

  const handleCompare = () => {
    if (selected.size < 2) {
      toast.error("Select at least 2 candidates to compare");
      return;
    }
    router.push(`/interviews/${id}/compare?candidates=${Array.from(selected).join(",")}`);
  };

  const completedCount = candidates.filter(
    (c) => c.status === "completed" && c.overallScore !== null,
  ).length;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Candidates"
        description={`${candidates.length} candidate${candidates.length !== 1 ? "s" : ""}`}
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          {selected.size >= 2 && (
            <Button size="sm" onClick={handleCompare} className="gap-1.5">
              <GitCompare className="h-3.5 w-3.5" />
              Compare ({selected.size})
            </Button>
          )}
          <Button variant="secondary" size="sm" asChild>
            <a href={`/api/interviews/${id}/candidates/export?format=csv`} download>
              <Download className="h-3.5 w-3.5" />
              CSV
            </a>
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCopyLink} className="gap-1.5">
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-accent" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Invite Link
              </>
            )}
          </Button>
        </div>
      </PageHeader>

      {candidates.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={Users}
            title="No candidates yet"
            description="Share the invite link with candidates to get started."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  {completedCount > 0 && (
                    <input
                      type="checkbox"
                      checked={selected.size === completedCount && completedCount > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border bg-background accent-primary"
                    />
                  )}
                </TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((c) => {
                const canSelect = c.status === "completed" && c.overallScore !== null;
                return (
                  <TableRow key={c._id}>
                    <TableCell>
                      {canSelect && (
                        <input
                          type="checkbox"
                          checked={selected.has(c._id)}
                          onChange={() => toggleSelect(c._id)}
                          className="h-4 w-4 rounded border-border bg-background accent-primary"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm text-foreground">{c.candidateName}</p>
                      {c.candidateEmail && (
                        <p className="text-xs text-muted-foreground">{c.candidateEmail}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[c.status]}>
                        {c.status === "in-progress"
                          ? "In Progress"
                          : c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.overallScore !== null ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                          <span className="text-sm font-medium text-foreground">
                            {c.overallScore.toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">/5</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === "completed" && c.overallScore !== null && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="gap-1 text-primary hover:text-primary"
                        >
                          <Link href={`/interviews/${id}/candidates/${c._id}/feedback`}>
                            View Feedback
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
