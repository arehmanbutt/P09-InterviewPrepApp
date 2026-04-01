"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import ErrorBoundary from "../../components/ErrorBoundary";
import EditInterviewModal from "../../components/EditInterviewModal";
import {
  Plus,
  Trash2,
  Calendar,
  Building2,
  ArrowRight,
  Users,
  Copy,
  Check,
  Search,
  X,
  Pencil,
  Loader2,
  Code2,
  Timer,
  List,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { PageHeader } from "@/app/components/ui/page-header";
import { EmptyState } from "@/app/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/app/lib/cn";

interface Interview {
  _id: string;
  title: string;
  company: string;
  status: "scheduled" | "in-progress" | "completed";
  createdAt: string;
  hasFeedback?: boolean;
  isMassInterview?: boolean;
  shareToken?: string;
  interviewType?: "technical" | "hr";
}

interface CodingInterviewItem {
  _id: string;
  title: string;
  status: "scheduled" | "in-progress" | "completed";
  difficulty: string;
  numProblems: number;
  timeLimit: number | null;
  createdAt: string;
}

interface DashboardItem {
  _id: string;
  title: string;
  status: "scheduled" | "in-progress" | "completed";
  createdAt: string;
  type: "voice" | "coding";
  interviewType?: "technical" | "hr";
  company?: string;
  hasFeedback?: boolean;
  isMassInterview?: boolean;
  shareToken?: string;
  difficulty?: string;
  numProblems?: number;
  timeLimit?: number | null;
}

type StatusFilter =
  | "all"
  | "scheduled"
  | "in-progress"
  | "completed"
  | "technical"
  | "hr"
  | "coding";
type SortBy = "newest" | "oldest" | "a-z" | "z-a";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "technical", label: "Technical" },
  { value: "hr", label: "HR" },
  { value: "coding", label: "Coding" },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "a-z", label: "A-Z" },
  { value: "z-a", label: "Z-A" },
];

function SkeletonCard() {
  return (
    <Card className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </Card>
  );
}

function DashboardContent() {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [editingInterview, setEditingInterview] = useState<{
    _id: string;
    title: string;
    company: string;
    description: string;
  } | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

  const handleCopyLink = async (token: string) => {
    try {
      const url = `${window.location.origin}/join/${token}`;
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
      toast.success("Invite link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/interviews").then((r) => r.json()),
      fetch("/api/coding-interviews").then((r) => r.json()),
    ])
      .then(([voiceData, codingData]) => {
        const voiceItems: DashboardItem[] = (voiceData as Interview[]).map((i) => ({
          _id: i._id,
          title: i.title,
          status: i.status,
          createdAt: i.createdAt,
          type: "voice" as const,
          interviewType: i.interviewType ?? "technical",
          company: i.company,
          hasFeedback: i.hasFeedback,
          isMassInterview: i.isMassInterview,
          shareToken: i.shareToken,
        }));
        const codingItems: DashboardItem[] = (codingData as CodingInterviewItem[]).map((c) => ({
          _id: c._id,
          title: c.title,
          status: c.status,
          createdAt: c.createdAt,
          type: "coding" as const,
          difficulty: c.difficulty,
          numProblems: c.numProblems,
          timeLimit: c.timeLimit,
        }));
        setItems([...voiceItems, ...codingItems]);
      })
      .catch(() => {
        setItems([]);
        toast.error("Failed to load interviews");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, type: "voice" | "coding") => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    const endpoint = type === "coding" ? `/api/coding-interviews/${id}` : `/api/interviews/${id}`;
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i._id !== id));
        toast.success("Interview deleted");
      } else {
        toast.error("Failed to delete interview");
      }
    } catch {
      toast.error("Failed to delete interview");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditClick = async (item: DashboardItem) => {
    setLoadingEditId(item._id);
    try {
      const res = await fetch(`/api/interviews/${item._id}`);
      if (!res.ok) {
        toast.error("Failed to load interview details");
        return;
      }
      const full = await res.json();
      setEditingInterview({
        _id: full._id,
        title: full.title,
        company: full.company,
        description: full.description,
      });
    } catch {
      toast.error("Failed to load interview details");
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleEditSaved = (updated: {
    _id: string;
    title: string;
    company: string;
    description: string;
  }) => {
    setItems((prev) =>
      prev.map((i) =>
        i._id === updated._id ? { ...i, title: updated.title, company: updated.company } : i,
      ),
    );
    setEditingInterview(null);
    toast.success("Interview updated");
  };

  const filteredInterviews = useMemo(() => {
    return items
      .filter((i) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "coding") return i.type === "coding";
        if (statusFilter === "technical")
          return i.type === "voice" && i.interviewType === "technical";
        if (statusFilter === "hr") return i.type === "voice" && i.interviewType === "hr";
        return i.status === statusFilter;
      })
      .filter((i) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return i.title.toLowerCase().includes(q) || (i.company?.toLowerCase().includes(q) ?? false);
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "newest":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "a-z":
            return a.title.localeCompare(b.title);
          case "z-a":
            return b.title.localeCompare(a.title);
        }
      });
  }, [items, statusFilter, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={List}
          title="No interviews yet"
          description="Create your first mock interview to get started."
          action={
            <Button asChild>
              <Link href="/create-interview">
                <Plus className="h-4 w-4" />
                Create Interview
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Your Interviews">
        <Button asChild size="sm">
          <Link href="/create-interview">
            <Plus className="h-4 w-4" />
            New Interview
          </Link>
        </Button>
      </PageHeader>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Input
            startIcon={<Search />}
            endIcon={
              searchQuery ? (
                <button onClick={() => setSearchQuery("")} aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              ) : undefined
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or company..."
            className="flex-1"
          />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === opt.value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List or empty filter state */}
      {filteredInterviews.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No interviews match your filters"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredInterviews.map((item) => {
            const isConfirming = confirmDeleteId === item._id;
            const isDeleting = deletingId === item._id;
            const isLoadingEdit = loadingEditId === item._id;
            const isCoding = item.type === "coding";

            const statusVariant = {
              scheduled: "scheduled" as const,
              "in-progress": "in-progress" as const,
              completed: "completed" as const,
            }[item.status];

            return (
              <div key={`${item.type}-${item._id}`}>
                <Card className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-sm transition-shadow">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground truncate">{item.title}</h3>
                      <Badge variant={statusVariant}>
                        {item.status === "in-progress"
                          ? "In Progress"
                          : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                      <Badge
                        variant={
                          isCoding
                            ? "coding"
                            : ((item.interviewType as "technical" | "hr") ?? "technical")
                        }
                      >
                        {isCoding ? "Coding" : item.interviewType === "hr" ? "HR" : "Technical"}
                      </Badge>
                      {item.isMassInterview && (
                        <Badge variant="secondary">
                          <Users className="h-3 w-3" />
                          Mass
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {isCoding ? (
                        <>
                          <span className="inline-flex items-center gap-1">
                            <Code2 className="h-3.5 w-3.5" />
                            {item.numProblems} problems · {item.difficulty}
                          </span>
                          {item.timeLimit && (
                            <span className="inline-flex items-center gap-1">
                              <Timer className="h-3.5 w-3.5" />
                              {item.timeLimit} min
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {item.company}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isCoding ? (
                      <>
                        {item.status === "scheduled" && (
                          <Button asChild size="sm">
                            <Link href={`/coding-session/${item._id}`}>
                              Start <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                        {item.status === "in-progress" && (
                          <Button asChild size="sm" variant="secondary" className="text-yellow-500">
                            <Link href={`/coding-session/${item._id}`}>
                              Resume <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                        {item.status === "completed" && (
                          <Button asChild size="sm" variant="success">
                            <Link href={`/coding-results/${item._id}`}>
                              View Results <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                      </>
                    ) : item.isMassInterview ? (
                      <>
                        {item.shareToken && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleCopyLink(item.shareToken!)}
                          >
                            {copiedToken === item.shareToken ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-accent" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Copy Link
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="text-purple-400 hover:text-purple-300"
                        >
                          <Link href={`/interviews/${item._id}/candidates`}>
                            <Users className="h-3.5 w-3.5" />
                            Candidates
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        {item.status === "scheduled" && (
                          <Button asChild size="sm">
                            <Link href={`/interview/${item._id}`}>
                              Start <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                        {item.status === "in-progress" && (
                          <Button asChild size="sm" variant="secondary" className="text-yellow-500">
                            <Link href={`/interview/${item._id}`}>
                              Resume <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                        {item.status === "completed" && item.hasFeedback && (
                          <Button asChild size="sm" variant="success">
                            <Link href={`/feedback/${item._id}`}>
                              View Feedback <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                        {item.status === "completed" && !item.hasFeedback && (
                          <span className="px-3 py-2 text-sm text-muted-foreground">Completed</span>
                        )}
                      </>
                    )}

                    {!isCoding && item.status === "scheduled" && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEditClick(item)}
                        disabled={isLoadingEdit}
                        aria-label="Edit interview"
                      >
                        {isLoadingEdit ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setConfirmDeleteId(isConfirming ? null : item._id)}
                      disabled={isDeleting}
                      aria-label="Delete interview"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>

                {/* Delete confirmation */}
                {isConfirming && (
                  <div className="mt-1 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 flex items-center justify-between gap-4">
                    <p className="text-sm text-foreground">
                      Delete this interview? This cannot be undone.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item._id, item.type)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingInterview && (
        <EditInterviewModal
          interview={editingInterview}
          onClose={() => setEditingInterview(null)}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
