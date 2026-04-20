"use client";

import { useState, useEffect } from "react";
import { Play, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import type { Language, TestResult, HiddenResults } from "../../_lib/types";

interface StoredSubmission {
  _id: string;
  status: "accepted" | "wrong_answer" | "error";
  testsPassed: number;
  testsTotal: number;
  runtime: string;
  language: string;
  createdAt: string;
}

interface SubmissionsTabProps {
  testResults: TestResult[];
  hiddenResults: HiddenResults | null;
  lastAction: "run" | "submit" | null;
  language: Language;
  code: string;
  problemId: string;
}

export default function SubmissionsTab({
  testResults,
  hiddenResults,
  lastAction,
  language,
  code,
  problemId,
}: SubmissionsTabProps) {
  const [history, setHistory] = useState<StoredSubmission[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!problemId) return;
    setHistoryLoading(true);
    fetch(`/api/submissions?problemId=${encodeURIComponent(problemId)}`)
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [problemId, lastAction]); // re-fetch after each submit so history updates

  const hasCurrentResult = testResults.length > 0 && lastAction === "submit";
  const allPassed =
    hasCurrentResult &&
    testResults.every((r) => r.passed) &&
    (hiddenResults?.passed ?? 0) === (hiddenResults?.total ?? 0);
  const totalPassed = testResults.filter((r) => r.passed).length + (hiddenResults?.passed ?? 0);
  const totalCases = testResults.length + (hiddenResults?.total ?? 0);

  return (
    <div className="space-y-6">
      {/* Current submission result */}
      {hasCurrentResult ? (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Latest Submission
          </p>

          <div
            className={`rounded-lg px-4 py-3 flex items-center gap-3 ${
              allPassed
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-red-500/10 border border-red-500/20"
            }`}
          >
            {allPassed ? (
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <div>
              <p
                className={`text-sm font-semibold ${allPassed ? "text-green-400" : "text-red-400"}`}
              >
                {allPassed ? "Accepted" : "Wrong Answer"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalPassed} / {totalCases} test cases passed
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Runtime</p>
              <p className="text-lg font-bold text-foreground">{testResults[0]?.time ?? "N/A"}</p>
            </div>
            <div className="bg-muted/40 border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Test Cases</p>
              <p className="text-lg font-bold text-foreground">
                {totalPassed}/{totalCases}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Language:</span>
            <span className="text-xs bg-muted border border-border text-foreground/80 px-2 py-0.5 rounded-full capitalize">
              {language}
            </span>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Submitted Code</p>
            <div className="relative rounded-lg bg-muted/50 dark:bg-[#0d1117] border border-border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
                <span className="text-xs text-muted-foreground font-mono capitalize">
                  {language}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Copy
                </button>
              </div>
              <pre className="text-xs text-foreground/80 font-mono p-4 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre leading-relaxed">
                {code}
              </pre>
            </div>
          </div>
        </div>
      ) : lastAction === "run" || !hasCurrentResult ? (
        !historyLoading && history.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-3">
              <Play className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Click Submit to evaluate your code.
            </p>
          </div>
        ) : null
      ) : null}

      {/* Submission history from DB */}
      {historyLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading history...</span>
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Submission History
          </p>
          <div className="space-y-2">
            {history.map((sub) => (
              <div
                key={sub._id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  {sub.status === "accepted" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        sub.status === "accepted" ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {sub.status === "accepted"
                        ? "Accepted"
                        : sub.status === "wrong_answer"
                          ? "Wrong Answer"
                          : "Error"}
                    </p>
                    <p className="text-xs text-muted-foreground/70 capitalize">
                      {sub.language} · {sub.testsPassed}/{sub.testsTotal} passed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {new Date(sub.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
