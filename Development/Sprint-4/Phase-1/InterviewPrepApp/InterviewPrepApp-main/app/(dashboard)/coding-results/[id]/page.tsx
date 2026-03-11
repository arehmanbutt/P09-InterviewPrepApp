"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
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

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "accepted":
      return <CheckCircle2 size={16} className="text-green-400" />;
    case "wrong_answer":
      return <XCircle size={16} className="text-red-400" />;
    case "error":
      return <XCircle size={16} className="text-orange-400" />;
    default:
      return <Minus size={16} className="text-gray-500" />;
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
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#3ecf8e]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto text-center py-24">
        <p className="text-gray-400">Results not found.</p>
        <Link href="/dashboard" className="text-[#3ecf8e] hover:underline mt-2 inline-block">
          Back to Dashboard
        </Link>
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
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition mb-4"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-white mb-1">{data.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="inline-flex items-center gap-1">
            <Calendar size={14} />
            {new Date(data.createdAt).toLocaleDateString()}
          </span>
          <span className="inline-flex items-center gap-1 capitalize">
            <Code2 size={14} />
            {data.difficulty} · {data.numProblems} problems
          </span>
          {duration !== null && (
            <span className="inline-flex items-center gap-1">
              <Clock size={14} />
              {formatDuration(duration)}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-3xl font-bold text-white">
            {solved}/{data.numProblems}
          </p>
          <p className="text-sm text-gray-400 mt-1">Problems Solved</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-3xl font-bold text-white">
            {duration !== null ? formatDuration(duration) : "N/A"}
          </p>
          <p className="text-sm text-gray-400 mt-1">Time Taken</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-3xl font-bold text-white">
            {data.numProblems > 0 ? Math.round((solved / data.numProblems) * 100) : 0}%
          </p>
          <p className="text-sm text-gray-400 mt-1">Score</p>
        </div>
      </div>

      {/* Problems Table */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">Problem Breakdown</h2>
        </div>

        <div className="divide-y divide-white/5">
          {data.submissions.map((sub, idx) => {
            const problem = problemMap.get(sub.problemId);
            const isExpanded = expandedProblem === sub.problemId;

            return (
              <div key={sub.problemId}>
                <button
                  onClick={() => setExpandedProblem(isExpanded ? null : sub.problemId)}
                  className="w-full px-5 py-3 flex items-center gap-4 hover:bg-white/5 transition text-left"
                >
                  <span className="text-xs text-gray-500 w-6">{idx + 1}</span>
                  <StatusIcon status={sub.status} />
                  <span className="flex-1 text-sm text-white truncate">
                    {problem?.title ?? sub.problemId}
                  </span>
                  {problem && (
                    <span
                      className={`text-xs font-medium ${getDifficultyColor(problem.difficulty_bucket)}`}
                    >
                      {problem.difficulty_bucket}
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium ${
                      sub.status === "accepted"
                        ? "text-green-400"
                        : sub.status === "not_attempted"
                          ? "text-gray-500"
                          : "text-red-400"
                    }`}
                  >
                    {statusLabel(sub.status)}
                  </span>
                  {sub.testsTotal > 0 && (
                    <span className="text-xs text-gray-400">
                      {sub.testsPassed}/{sub.testsTotal}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{sub.runtime}</span>
                  {sub.code ? (
                    isExpanded ? (
                      <ChevronDown size={14} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-500" />
                    )
                  ) : (
                    <span className="w-3.5" />
                  )}
                </button>

                {isExpanded && sub.code && (
                  <div className="px-5 pb-4">
                    <div className="rounded-lg bg-gray-900 border border-gray-700 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800/50">
                        <span className="text-xs text-gray-400 font-mono capitalize">
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
      </div>
    </div>
  );
}
