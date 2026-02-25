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
  ChevronDown,
} from "lucide-react";

interface Interview {
  _id: string;
  title: string;
  company: string;
  status: "scheduled" | "in-progress" | "completed";
  createdAt: string;
  hasFeedback?: boolean;
  isMassInterview?: boolean;
  shareToken?: string;
}

type StatusFilter = "all" | "scheduled" | "in-progress" | "completed";
type SortBy = "newest" | "oldest" | "a-z" | "z-a";

const statusConfig = {
  scheduled: { label: "Scheduled", color: "bg-blue-500/20 text-blue-400" },
  "in-progress": { label: "In Progress", color: "bg-yellow-500/20 text-yellow-400" },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400" },
} as const;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "a-z", label: "A-Z" },
  { value: "z-a", label: "Z-A" },
];

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur flex items-center justify-between gap-4 animate-pulse">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-5 w-48 rounded bg-white/10" />
          <div className="h-5 w-20 rounded-full bg-white/10" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 w-28 rounded bg-white/5" />
          <div className="h-4 w-24 rounded bg-white/5" />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-9 w-20 rounded-lg bg-white/10" />
        <div className="h-9 w-9 rounded-lg bg-white/5" />
      </div>
    </div>
  );
}

function DashboardContent() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Search/Filter/Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  // Edit modal state
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
    fetch("/api/interviews")
      .then((res) => res.json())
      .then((data) => setInterviews(data))
      .catch(() => {
        setInterviews([]);
        toast.error("Failed to load interviews");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/interviews/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInterviews((prev) => prev.filter((i) => i._id !== id));
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

  const handleEditClick = async (interview: Interview) => {
    setLoadingEditId(interview._id);
    try {
      const res = await fetch(`/api/interviews/${interview._id}`);
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
    setInterviews((prev) =>
      prev.map((i) =>
        i._id === updated._id ? { ...i, title: updated.title, company: updated.company } : i,
      ),
    );
    setEditingInterview(null);
    toast.success("Interview updated");
  };

  const filteredInterviews = useMemo(() => {
    return interviews
      .filter((i) => statusFilter === "all" || i.status === statusFilter)
      .filter((i) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return i.title.toLowerCase().includes(q) || i.company.toLowerCase().includes(q);
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
  }, [interviews, statusFilter, searchQuery, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 rounded bg-white/10 animate-pulse" />
          <div className="h-10 w-36 rounded-lg bg-white/10 animate-pulse" />
        </div>
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 backdrop-blur text-center">
          <h2 className="text-xl font-bold text-white mb-2">No interviews yet</h2>
          <p className="text-gray-400 mb-6">Create your first mock interview to get started.</p>
          <Link
            href="/create-interview"
            className="inline-flex items-center gap-2 rounded-lg bg-[#3ecf8e] px-5 py-2.5 font-medium text-black transition hover:bg-[#33b87a]"
          >
            <Plus size={18} />
            Create Interview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Your Interviews</h1>
        <Link
          href="/create-interview"
          className="inline-flex items-center gap-2 rounded-lg bg-[#3ecf8e] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#33b87a]"
        >
          <Plus size={16} />
          New Interview
        </Link>
      </div>

      {/* Search / Filter / Sort Toolbar */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or company..."
              className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:border-[#3ecf8e] focus:outline-none focus:ring-1 focus:ring-[#3ecf8e]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="appearance-none rounded-lg border border-white/10 bg-white/5 pl-3 pr-8 py-2 text-sm text-gray-300 focus:border-[#3ecf8e] focus:outline-none focus:ring-1 focus:ring-[#3ecf8e] cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#0c0c0c]">
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                statusFilter === opt.value
                  ? "bg-white/15 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interview Cards or Empty Filter State */}
      {filteredInterviews.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400 mb-3">No interviews match your filters.</p>
          <button
            onClick={clearFilters}
            className="text-sm font-medium text-[#3ecf8e] transition hover:text-[#33b87a]"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInterviews.map((interview) => {
            const status = statusConfig[interview.status];
            const isConfirming = confirmDeleteId === interview._id;
            const isDeleting = deletingId === interview._id;
            const isLoadingEdit = loadingEditId === interview._id;

            return (
              <div key={interview._id}>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-white font-semibold truncate">{interview.title}</h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                      {interview.isMassInterview && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-medium text-purple-400">
                          <Users size={12} />
                          Mass
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={14} />
                        {interview.company}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(interview.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {interview.isMassInterview ? (
                      <>
                        {interview.shareToken && (
                          <button
                            onClick={() => handleCopyLink(interview.shareToken!)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                          >
                            {copiedToken === interview.shareToken ? (
                              <>
                                <Check size={14} className="text-green-400" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                Copy Link
                              </>
                            )}
                          </button>
                        )}
                        <Link
                          href={`/interviews/${interview._id}/candidates`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/20 px-3 py-2 text-sm font-medium text-purple-400 transition hover:bg-purple-500/30"
                        >
                          <Users size={14} />
                          Candidates
                        </Link>
                      </>
                    ) : (
                      <>
                        {interview.status === "scheduled" && (
                          <Link
                            href={`/interview/${interview._id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3ecf8e] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#33b87a]"
                          >
                            Start
                            <ArrowRight size={14} />
                          </Link>
                        )}
                        {interview.status === "in-progress" && (
                          <Link
                            href={`/interview/${interview._id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-500/20 px-4 py-2 text-sm font-medium text-yellow-400 transition hover:bg-yellow-500/30"
                          >
                            Resume
                            <ArrowRight size={14} />
                          </Link>
                        )}
                        {interview.status === "completed" && interview.hasFeedback && (
                          <Link
                            href={`/feedback/${interview._id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3ecf8e]/20 px-4 py-2 text-sm font-medium text-[#3ecf8e] transition hover:bg-[#3ecf8e]/30"
                          >
                            View Feedback
                            <ArrowRight size={14} />
                          </Link>
                        )}
                        {interview.status === "completed" && !interview.hasFeedback && (
                          <span className="px-4 py-2 text-sm text-gray-500">Completed</span>
                        )}
                      </>
                    )}
                    {interview.status === "scheduled" && (
                      <button
                        onClick={() => handleEditClick(interview)}
                        disabled={isLoadingEdit}
                        aria-label="Edit interview"
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                      >
                        {isLoadingEdit ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Pencil size={16} />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDeleteId(isConfirming ? null : interview._id)}
                      disabled={isDeleting}
                      aria-label="Delete interview"
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Delete confirmation */}
                {isConfirming && (
                  <div className="mt-1 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-center justify-between">
                    <p className="text-sm text-gray-300">
                      Delete this interview? This cannot be undone.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(interview._id)}
                        disabled={isDeleting}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
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
