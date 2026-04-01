"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  Loader2,
  Code2,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/lib/cn";

interface Problem {
  id: string;
  title: string;
  titleSlug: string;
  difficulty_bucket: "easy" | "medium" | "hard";
  tags: string[];
}

interface PageData {
  data: Problem[];
  total: number;
  page: number;
  pageSize: number;
}

interface CodingMassConfig {
  title: string;
  timeLimit: number | null;
  isMassInterview: boolean;
}

function isValidConfig(v: unknown): v is CodingMassConfig {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.title === "string";
}

const PAGE_SIZE = 15;

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-accent border-accent/30 bg-accent/10",
  medium: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  hard: "text-destructive border-destructive/30 bg-destructive/10",
};

export default function PickQuestionsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<CodingMassConfig | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<"" | "easy" | "medium" | "hard">("");
  const [page, setPage] = useState(1);

  // Data state
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [fetching, setFetching] = useState(false);

  // Selection state
  const [selected, setSelected] = useState<Map<string, Problem>>(new Map());

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Load config from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("codingMassConfig");
    if (!raw) {
      router.replace("/create-interview");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isValidConfig(parsed)) {
        router.replace("/create-interview");
        return;
      }
      setConfig(parsed);
    } catch {
      router.replace("/create-interview");
    }
  }, [router]);

  // Fetch problems
  const fetchProblems = useCallback(async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams({
        problem_format: "leetcode",
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (search.trim()) params.set("search", search.trim());
      if (difficulty) params.set("difficulty", difficulty);

      const res = await fetch(`/api/leetcode?${params.toString()}`);
      const json = (await res.json()) as {
        success: boolean;
        data: Problem[];
        total: number;
        page: number;
        pageSize: number;
      };
      if (json.success) {
        setPageData({
          data: json.data,
          total: json.total,
          page: json.page,
          pageSize: json.pageSize,
        });
      }
    } catch {
      toast.error("Failed to load problems");
    } finally {
      setFetching(false);
    }
  }, [page, search, difficulty]);

  useEffect(() => {
    if (config) fetchProblems();
  }, [config, fetchProblems]);

  // Reset to page 1 when filters change
  const applySearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const applyDifficulty = useCallback((value: "" | "easy" | "medium" | "hard") => {
    setDifficulty(value);
    setPage(1);
  }, []);

  function toggleProblem(problem: Problem) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(problem.id)) {
        next.delete(problem.id);
      } else {
        next.set(problem.id, problem);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Map());
  }

  async function handleSubmit() {
    if (!config || selected.size === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/coding-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: config.title,
          timeLimit: config.timeLimit,
          isMassInterview: config.isMassInterview,
          customProblemIds: Array.from(selected.keys()),
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create interview");
      }

      sessionStorage.removeItem("codingMassConfig");
      toast.success(
        `Coding interview created with ${selected.size} problem${selected.size !== 1 ? "s" : ""}`,
      );
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!config) return null;

  const totalPages = pageData ? Math.ceil(pageData.total / PAGE_SIZE) : 0;
  const selectedArray = Array.from(selected.values());

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Code2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Pick Questions</h1>
            <p className="text-sm text-muted-foreground">{config.title}</p>
          </div>
        </div>

        <Button
          size="lg"
          disabled={submitting || selected.size === 0}
          onClick={handleSubmit}
          className="gap-2 shrink-0"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Code2 className="h-4 w-4" />
              Create Interview
              {selected.size > 0 && (
                <span className="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-semibold">
                  {selected.size}
                </span>
              )}
            </>
          )}
        </Button>
      </div>

      {/* Selected chip strip */}
      {selectedArray.length > 0 && (
        <Card className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              {selected.size} selected:
            </span>
            {selectedArray.slice(0, 8).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProblem(p)}
                className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
              >
                {p.title}
                <X className="h-3 w-3" />
              </button>
            ))}
            {selectedArray.length > 8 && (
              <span className="text-xs text-muted-foreground">
                +{selectedArray.length - 8} more
              </span>
            )}
            <button
              type="button"
              onClick={clearSelection}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search problems..."
            value={search}
            onChange={(e) => applySearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          {(["", "easy", "medium", "hard"] as const).map((d) => (
            <button
              key={d || "all"}
              type="button"
              onClick={() => applyDifficulty(d)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                difficulty === d
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {d === "" ? "All" : DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Problem list */}
      <Card className="overflow-hidden">
        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !pageData || pageData.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Code2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No problems found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pageData.data.map((problem) => {
              const isSelected = selected.has(problem.id);
              return (
                <button
                  key={problem.id}
                  type="button"
                  onClick={() => toggleProblem(problem)}
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors",
                    isSelected ? "bg-primary/5" : "hover:bg-muted/40",
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all",
                      isSelected ? "border-primary bg-primary" : "border-border bg-background",
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>

                  {/* Title */}
                  <span className="flex-1 text-sm text-foreground truncate">{problem.title}</span>

                  {/* Difficulty badge */}
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      DIFFICULTY_COLORS[problem.difficulty_bucket] ?? "",
                    )}
                  >
                    {DIFFICULTY_LABELS[problem.difficulty_bucket] ?? problem.difficulty_bucket}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {pageData
              ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, pageData.total)} of ${pageData.total} problems`
              : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || fetching}
              onClick={() => setPage((p) => p - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-xs text-muted-foreground px-1">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || fetching}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {selected.size === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Select at least one problem to create the interview.
        </p>
      )}
    </div>
  );
}
