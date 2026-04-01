"use client";

import { Play, CheckCircle2, XCircle } from "lucide-react";
import type { Language, TestResult, HiddenResults } from "../../_lib/types";

interface SubmissionsTabProps {
  testResults: TestResult[];
  hiddenResults: HiddenResults | null;
  lastAction: "run" | "submit" | null;
  language: Language;
  code: string;
}

export default function SubmissionsTab({
  testResults,
  hiddenResults,
  lastAction,
  language,
  code,
}: SubmissionsTabProps) {
  if (testResults.length === 0 || lastAction === "run") {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-3">
          <Play className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Click Submit to evaluate your code.</p>
      </div>
    );
  }

  const allPassed =
    testResults.every((r) => r.passed) &&
    (hiddenResults?.passed ?? 0) === (hiddenResults?.total ?? 0);
  const totalPassed = testResults.filter((r) => r.passed).length + (hiddenResults?.passed ?? 0);
  const totalCases = testResults.length + (hiddenResults?.total ?? 0);

  return (
    <div className="space-y-4">
      {/* Status Banner */}
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
          <p className={`text-sm font-semibold ${allPassed ? "text-green-400" : "text-red-400"}`}>
            {allPassed ? "Accepted" : "Wrong Answer"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalPassed} / {totalCases} test cases passed
          </p>
        </div>
      </div>

      {/* Stats Row */}
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
          <p className="text-xs text-muted-foreground/60">passed</p>
        </div>
      </div>

      {/* Language Badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Language:</span>
        <span className="text-xs bg-muted border border-border text-foreground/80 px-2 py-0.5 rounded-full capitalize">
          {language}
        </span>
      </div>

      {/* Code Snapshot */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium">Submitted Code</p>
        <div className="relative rounded-lg bg-[#0d1117] border border-border overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
            <span className="text-xs text-muted-foreground font-mono capitalize">{language}</span>
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
  );
}
