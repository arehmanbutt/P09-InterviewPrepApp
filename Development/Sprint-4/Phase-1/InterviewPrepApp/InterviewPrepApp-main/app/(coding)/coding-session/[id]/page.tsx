"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Play, Clock, AlertTriangle } from "lucide-react";
import type { Problem } from "../../coding-interview/_lib/types";
import CodingWorkspace from "../../coding-interview/_components/CodingWorkspace";

interface CodingInterviewData {
  _id: string;
  title: string;
  difficulty: string;
  numProblems: number;
  timeLimit: number | null;
  status: "scheduled" | "in-progress" | "completed";
  problems: string[];
  problemDetails: Problem[];
  submissions: Array<{
    problemId: string;
    status: string;
  }>;
  startedAt: string | null;
}

export default function CodingSessionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [interview, setInterview] = useState<CodingInterviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch(`/api/coding-interviews/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setInterview(data);
        // Calculate elapsed time if already started
        if (data.startedAt && data.status === "in-progress") {
          const startTime = new Date(data.startedAt).getTime();
          setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }
      })
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Timer
  useEffect(() => {
    if (interview?.status !== "in-progress") return;
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interview?.status]);

  // Auto-complete on time limit
  useEffect(() => {
    if (
      interview?.status === "in-progress" &&
      interview.timeLimit &&
      elapsed >= interview.timeLimit * 60
    ) {
      handleEnd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, interview?.timeLimit, interview?.status]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await fetch(`/api/coding-interviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in-progress" }),
      });
      const data = await res.json();
      setInterview((prev) =>
        prev
          ? {
              ...prev,
              status: "in-progress",
              startedAt: data.startedAt ?? new Date().toISOString(),
            }
          : prev,
      );
    } catch {
      // ignore
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = useCallback(async () => {
    setEnding(true);
    setShowEndConfirm(false);
    try {
      await fetch(`/api/coding-interviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      router.push(`/coding-results/${id}`);
    } catch {
      setEnding(false);
    }
  }, [id, router]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0b0b0b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3ecf8e]" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="h-screen bg-[#0b0b0b] flex items-center justify-center text-gray-400">
        Interview not found.
      </div>
    );
  }

  // Pre-start screen
  if (interview.status === "scheduled") {
    return (
      <div className="h-screen bg-[#0b0b0b] flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur text-center">
            <h1 className="text-2xl font-bold text-white mb-2">{interview.title}</h1>
            <p className="text-gray-400 mb-6">
              {interview.numProblems} problems · {interview.difficulty}
              {interview.timeLimit ? ` · ${interview.timeLimit} min` : " · Untimed"}
            </p>

            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full rounded-lg bg-[#3ecf8e] px-6 py-3 font-medium text-black transition hover:bg-[#33b87a] disabled:opacity-50 inline-flex items-center justify-center gap-2 mb-3"
            >
              {starting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              {starting ? "Starting..." : "Start Coding Interview"}
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition"
            >
              <ArrowLeft size={14} />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Completed - redirect to results
  if (interview.status === "completed") {
    router.push(`/coding-results/${id}`);
    return null;
  }

  // Active session
  const timeRemaining = interview.timeLimit
    ? Math.max(0, interview.timeLimit * 60 - elapsed)
    : null;
  const isLowTime = timeRemaining !== null && timeRemaining <= 300;
  const submitted = interview.submissions.filter((s) => s.status !== "not_attempted").length;

  return (
    <div className="h-screen flex flex-col bg-[#0b0b0b]">
      {/* Session bar */}
      <div className="border-b border-gray-800 bg-[#1a1a1a] px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-white">{interview.title}</span>
          <div className="h-4 w-px bg-gray-700" />
          <span className="text-xs text-gray-400">
            {submitted}/{interview.numProblems} submitted
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-1.5 text-sm font-mono ${
              isLowTime ? "text-red-400" : "text-gray-300"
            }`}
          >
            <Clock size={14} />
            {timeRemaining !== null ? (
              <>
                {formatTime(timeRemaining)}
                {isLowTime && <AlertTriangle size={14} className="text-red-400" />}
              </>
            ) : (
              formatTime(elapsed)
            )}
          </div>

          <button
            onClick={() => setShowEndConfirm(true)}
            disabled={ending}
            className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            {ending ? "Ending..." : "End Interview"}
          </button>
        </div>
      </div>

      {/* End confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">End Interview?</h3>
            <p className="text-sm text-gray-400 mb-4">
              {submitted}/{interview.numProblems} problems submitted. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                Continue Coding
              </button>
              <button
                onClick={handleEnd}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
              >
                End Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace */}
      <div className="flex-1 min-h-0">
        <CodingWorkspace problems={interview.problemDetails} codingInterviewId={interview._id} />
      </div>
    </div>
  );
}
