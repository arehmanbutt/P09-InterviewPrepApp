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
  ChevronDown,
} from "lucide-react";

interface ProblemListItem {
  id: string;
  title: string;
  titleSlug?: string;
  tags: string[];
  difficulty_bucket: string;
  problem_format: string;
}

type Difficulty = "" | "easy" | "medium" | "hard";
type SolveStatus = "accepted" | "attempted" | undefined;

const PAGE_SIZE = 20;

function getDifficultyColor(d: string) {
  switch (d.toLowerCase()) {
    case "easy":
      return "text-green-400";
    case "medium":
      return "text-yellow-400";
    case "hard":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

export default function ProblemBrowserPage() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("");
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

  // Fetch status map once
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

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, difficulty]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition mb-2"
            >
              <ArrowLeft size={14} />
              Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white">Practice Problems</h1>
            <p className="text-sm text-gray-400 mt-1">{total} problems available</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title..."
              className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:border-[#3ecf8e] focus:outline-none focus:ring-1 focus:ring-[#3ecf8e]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="appearance-none rounded-lg border border-white/10 bg-white/5 pl-3 pr-8 py-2 text-sm text-gray-300 focus:border-[#3ecf8e] focus:outline-none focus:ring-1 focus:ring-[#3ecf8e] cursor-pointer"
            >
              <option value="" className="bg-[#0c0c0c]">
                All Difficulties
              </option>
              <option value="easy" className="bg-[#0c0c0c]">
                Easy
              </option>
              <option value="medium" className="bg-[#0c0c0c]">
                Medium
              </option>
              <option value="hard" className="bg-[#0c0c0c]">
                Hard
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>
        </div>

        {/* Problem List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-[#3ecf8e]" />
          </div>
        ) : problems.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-gray-400">No problems match your search.</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[40px_1fr_100px_80px] gap-4 px-5 py-2.5 border-b border-white/10 text-xs text-gray-500 uppercase tracking-wider">
                <span>Status</span>
                <span>Title</span>
                <span>Tags</span>
                <span className="text-right">Difficulty</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/5">
                {problems.map((p) => {
                  const solveStatus = statusMap[p.id];
                  const slug = p.titleSlug || p.id;
                  return (
                    <Link
                      key={p.id}
                      href={`/coding-interview/${slug}`}
                      className="grid grid-cols-[40px_1fr_100px_80px] gap-4 px-5 py-3 hover:bg-white/5 transition items-center"
                    >
                      <span>
                        {solveStatus === "accepted" ? (
                          <CheckCircle2 size={16} className="text-green-400" />
                        ) : solveStatus === "attempted" ? (
                          <Minus size={16} className="text-yellow-400" />
                        ) : (
                          <Circle size={16} className="text-gray-600" />
                        )}
                      </span>
                      <span className="text-sm text-white truncate">{p.title}</span>
                      <span className="text-xs text-gray-500 truncate">
                        {p.tags.slice(0, 2).join(", ")}
                      </span>
                      <span
                        className={`text-xs font-medium text-right capitalize ${getDifficultyColor(
                          p.difficulty_bucket,
                        )}`}
                      >
                        {p.difficulty_bucket}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
