"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Language, Problem } from "../_lib/types";
import { getDifficultyColor } from "../_lib/templates";

interface TopBarProps {
  problem: Problem;
  currentIndex: number;
  totalProblems: number;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onPrevProblem: () => void;
  onNextProblem: () => void;
}

export default function TopBar({
  problem,
  currentIndex,
  totalProblems,
  language,
  onLanguageChange,
  onPrevProblem,
  onNextProblem,
}: TopBarProps) {
  return (
    <div className="border-b border-border bg-card px-4 py-2 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-sm font-semibold text-foreground truncate max-w-[300px]">
          {problem.title}
        </h1>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full bg-muted/60 ${getDifficultyColor(problem.difficulty_bucket)}`}
        >
          {problem.difficulty_bucket}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevProblem}
            disabled={currentIndex === 0}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground min-w-[32px] text-center">
            {currentIndex + 1}/{totalProblems}
          </span>
          <button
            onClick={onNextProblem}
            disabled={currentIndex === totalProblems - 1}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as Language)}
          className="bg-muted text-foreground px-3 py-1.5 rounded-md border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
        </select>
      </div>
    </div>
  );
}
