"use client";

import { useState } from "react";
import type { Language, Problem } from "../../_lib/types";

interface SolutionTabProps {
  problem: Problem;
}

export default function SolutionTab({ problem }: SolutionTabProps) {
  const [solutionLang, setSolutionLang] = useState<Language>("python");
  const hasSolution =
    problem.solutions?.python || problem.solutions?.cpp || problem.solutions?.javascript;

  if (!hasSolution) {
    return (
      <div className="text-muted-foreground text-center py-12">
        <p>No solution available for this problem.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-muted/40 border border-border rounded-lg p-1 w-fit">
        {(["python", "cpp", "javascript"] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => setSolutionLang(lang)}
            disabled={!problem.solutions?.[lang]}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              solutionLang === lang
                ? "bg-primary text-primary-foreground"
                : problem.solutions?.[lang]
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            {lang === "cpp" ? "C++" : lang === "javascript" ? "JavaScript" : "Python"}
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-[#0d1117] border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
          <span className="text-xs text-muted-foreground font-mono">
            {solutionLang === "cpp"
              ? "C++"
              : solutionLang === "javascript"
                ? "JavaScript"
                : "Python"}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(problem.solutions?.[solutionLang] ?? "")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Copy
          </button>
        </div>
        <pre className="text-xs text-foreground/80 font-mono p-4 overflow-x-auto overflow-y-auto max-h-[60vh] whitespace-pre leading-relaxed">
          {problem.solutions?.[solutionLang] || "No solution available for this language."}
        </pre>
      </div>
    </div>
  );
}
