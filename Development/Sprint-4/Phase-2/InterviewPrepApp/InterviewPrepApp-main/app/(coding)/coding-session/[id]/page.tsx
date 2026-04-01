"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Play, Clock, AlertTriangle } from "lucide-react";
import type { Problem } from "../../coding-interview/_lib/types";
import CodingWorkspace from "../../coding-interview/_components/CodingWorkspace";
import MobileGate from "app/components/MobileGate";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { cn } from "@/app/lib/cn";

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
        if (data.startedAt && data.status === "in-progress") {
          const startTime = new Date(data.startedAt).getTime();
          setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }
      })
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (interview?.status !== "in-progress") return;
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interview?.status]);

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
      <div className="h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="h-screen bg-background flex items-center justify-center text-muted-foreground">
        Interview not found.
      </div>
    );
  }

  // Pre-start screen
  if (interview.status === "scheduled") {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">{interview.title}</h1>
            <p className="text-muted-foreground mb-6">
              {interview.numProblems} problems · {interview.difficulty}
              {interview.timeLimit ? ` · ${interview.timeLimit} min` : " · Untimed"}
            </p>

            <Button
              onClick={handleStart}
              disabled={starting}
              size="lg"
              className="w-full gap-2 mb-3"
            >
              {starting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {starting ? "Starting..." : "Start Coding Interview"}
            </Button>

            <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </Card>
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
    <MobileGate>
      <div className="h-screen flex flex-col bg-background">
        {/* Session bar */}
        <div className="border-b border-border bg-card px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">{interview.title}</span>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground">
              {submitted}/{interview.numProblems} submitted
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex items-center gap-1.5 text-sm font-mono",
                isLowTime ? "text-destructive" : "text-foreground",
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {timeRemaining !== null ? (
                <>
                  {formatTime(timeRemaining)}
                  {isLowTime && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                </>
              ) : (
                formatTime(elapsed)
              )}
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowEndConfirm(true)}
              disabled={ending}
            >
              {ending ? "Ending..." : "End Interview"}
            </Button>
          </div>
        </div>

        {/* End confirmation modal */}
        {showEndConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <Card className="p-6 max-w-sm w-full mx-4">
              <h3 className="text-base font-semibold text-foreground mb-2">End Interview?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                {submitted}/{interview.numProblems} problems submitted. This action cannot be
                undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1"
                >
                  Continue Coding
                </Button>
                <Button variant="destructive" onClick={handleEnd} className="flex-1">
                  End Interview
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Workspace */}
        <div className="flex-1 min-h-0">
          <CodingWorkspace problems={interview.problemDetails} codingInterviewId={interview._id} />
        </div>
      </div>
    </MobileGate>
  );
}
