"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Minus,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Card } from "@/app/components/ui/card";
import { EmptyState } from "@/app/components/ui/empty-state";
import { cn } from "@/app/lib/cn";

interface ProblemListItem {
  id: string;
  title: string;
  titleSlug?: string;
  tags: string[];
  difficulty_bucket: string;
  problem_format: string;
}

type Difficulty = "easy" | "medium" | "hard" | undefined;
type SolveStatus = "accepted" | "attempted" | undefined;

const PAGE_SIZE = 20;

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

export default function ProblemBrowserPage() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>(undefined);
  const [statusMap, setStatusMap] = useState<Record<string, SolveStatus>>({});

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        format: "leetcode",
        pageSize: String(PAGE_SIZE),
        page: String(page),
      });
      if (search) params.set("search", search);
      if (difficulty) params.set("difficulty", difficulty);

      const res = await fetch(`/api/leetcode?${params}`);
      const data = await res.json();
      setProblems(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setProblems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, difficulty]);

  useEffect(() => {
    fetch("/api/submissions?statusMap=true")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data === "object" && !data.error) {
          setStatusMap(data);
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  useEffect(() => {
    setPage(1);
  }, [search, difficulty]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 gap-1.5 text-muted-foreground">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Practice Problems</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} problems available</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Input
            startIcon={<Search className="h-4 w-4" />}
            endIcon={
              search ? (
                <button
                  onClick={() => setSearch("")}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : undefined
            }
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title..."
            className="flex-1"
          />
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Difficulties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Problem List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : problems.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              title="No problems match your search"
              description="Try adjusting your filters."
            />
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden p-0">
              {/* Table Header */}
              <div className="grid grid-cols-[40px_1fr_100px_80px] gap-4 px-5 py-2.5 border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <span>Status</span>
                <span>Title</span>
                <span>Tags</span>
                <span className="text-right">Difficulty</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/50">
                {problems.map((p) => {
                  const solveStatus = statusMap[p.id];
                  const slug = p.titleSlug || p.id;
                  return (
                    <Link
                      key={p.id}
                      href={`/coding-interview/${slug}`}
                      className="grid grid-cols-[40px_1fr_100px_80px] gap-4 px-5 py-3 hover:bg-muted/30 transition items-center"
                    >
                      <span>
                        {solveStatus === "accepted" ? (
                          <CheckCircle2 className="h-4 w-4 text-accent" />
                        ) : solveStatus === "attempted" ? (
                          <Minus className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </span>
                      <span className="text-sm text-foreground truncate">{p.title}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {p.tags.slice(0, 2).join(", ")}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium text-right capitalize",
                          getDifficultyClass(p.difficulty_bucket),
                        )}
                      >
                        {p.difficulty_bucket}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
