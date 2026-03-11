"use client";

import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { TestResult, HiddenResults } from "../../_lib/types";

interface ResultTabProps {
  testResults: TestResult[];
  hiddenResults: HiddenResults | null;
  isRunning: boolean;
  isSubmitting: boolean;
  lastAction: "run" | "submit" | null;
}

export default function ResultTab({
  testResults,
  hiddenResults,
  isRunning,
  isSubmitting,
  lastAction,
}: ResultTabProps) {
  if (isRunning || isSubmitting) {
    return (
      <div className="flex items-center justify-center h-full gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#3ecf8e]" />
        <span className="text-sm text-gray-400">
          {isSubmitting ? "Submitting..." : "Running..."}
        </span>
      </div>
    );
  }

  if (testResults.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-500">
        Run your code to see results.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-medium ${
            testResults.every((r) => r.passed) ? "text-green-400" : "text-red-400"
          }`}
        >
          {testResults.filter((r) => r.passed).length}/{testResults.length} visible passed
        </span>
        {lastAction === "submit" && hiddenResults && (
          <span className="text-xs text-gray-400">
            Hidden:{" "}
            <span
              className={
                hiddenResults.passed === hiddenResults.total ? "text-green-400" : "text-yellow-400"
              }
            >
              {hiddenResults.passed}/{hiddenResults.total}
            </span>
          </span>
        )}
      </div>

      {/* Per-case results */}
      {testResults.map((result, idx) => (
        <div
          key={idx}
          className={`rounded-lg border overflow-hidden ${
            result.passed ? "border-green-500/20" : "border-red-500/20"
          }`}
        >
          <div
            className={`px-3 py-2 flex items-center justify-between ${
              result.passed ? "bg-green-500/10" : "bg-red-500/10"
            }`}
          >
            <div className="flex items-center gap-2">
              {result.passed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-400" />
              )}
              <span
                className={`text-xs font-medium ${result.passed ? "text-green-400" : "text-red-400"}`}
              >
                Case {idx + 1} —{" "}
                {result.error && !result.passed
                  ? result.error.includes("Exit code") || result.error.includes("Error")
                    ? "Runtime Error"
                    : "Wrong Answer"
                  : result.passed
                    ? "Accepted"
                    : "Wrong Answer"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {result.time}
            </div>
          </div>

          <div className="bg-gray-900/50 p-3 space-y-1.5">
            <div className="flex gap-2 items-start">
              <span className="text-xs text-gray-500 w-16 shrink-0">Input:</span>
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                {result.input}
              </pre>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-xs text-gray-500 w-16 shrink-0">Expected:</span>
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {result.expected}
              </pre>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-xs text-gray-500 w-16 shrink-0">Output:</span>
              <pre
                className={`text-xs font-mono whitespace-pre-wrap ${
                  result.passed ? "text-green-400" : "text-red-400"
                }`}
              >
                {result.output || "(no output)"}
              </pre>
            </div>
            {result.error && (
              <div className="flex gap-2 items-start">
                <span className="text-xs text-red-500 w-16 shrink-0">Error:</span>
                <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap">
                  {result.error}
                </pre>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Hidden test failure */}
      {lastAction === "submit" && hiddenResults && hiddenResults.passed < hiddenResults.total && (
        <div className="rounded-lg border border-red-500/20 overflow-hidden">
          <div className="px-3 py-2 flex items-center gap-2 bg-red-500/10">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-medium text-red-400">
              Hidden Test Case — Wrong Answer
            </span>
          </div>
          <div className="bg-gray-900/50 p-3">
            <p className="text-xs text-gray-500 italic">
              {hiddenResults.total - hiddenResults.passed} hidden test(s) failed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
