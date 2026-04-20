"use client";

import { useState, useCallback } from "react";
import type { Language, Problem, TestResult, ExecuteResult, HiddenResults } from "../_lib/types";
import { splitBatchForDisplay } from "../_lib/templates";
import { useCodePersistence } from "../_lib/useCodePersistence";
import TopBar from "./TopBar";
import ResizablePanel from "./ResizablePanel";
import LeftPanel, { type LeftPanelTab } from "./left-panel/LeftPanel";
import RightPanel from "./right-panel/RightPanel";
import type { ConsoleTab } from "./right-panel/ConsolePanel";

interface CodingWorkspaceProps {
  problems: Problem[];
  codingInterviewId?: string;
  hideTopBar?: boolean;
}

export default function CodingWorkspace({
  problems,
  codingInterviewId,
  hideTopBar,
}: CodingWorkspaceProps) {
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [language, setLanguage] = useState<Language>("javascript");
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>("description");
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase");
  const [consoleExpanded, setConsoleExpanded] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [hiddenResults, setHiddenResults] = useState<HiddenResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAction, setLastAction] = useState<"run" | "submit" | null>(null);

  const currentProblem = problems[currentProblemIndex]!;
  const examples = splitBatchForDisplay(currentProblem.examples ?? [], currentProblem.has_t);

  const { code, setCode, resetCode } = useCodePersistence(
    currentProblem,
    language,
    codingInterviewId ? `coding-${codingInterviewId}` : undefined,
  );

  const handleRun = useCallback(async () => {
    if (currentProblem.is_interactive) return;
    setIsRunning(true);
    setLastAction("run");
    setTestResults([]);
    setHiddenResults(null);
    setConsoleExpanded(true);
    setConsoleTab("result");

    try {
      const res = await fetch("/api/leetcode/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, problemId: currentProblem.id, codingInterviewId }),
      });
      const data = await res.json();
      if (!data.success) {
        setTestResults([
          {
            passed: false,
            input: "",
            output: "",
            expected: "",
            time: "N/A",
            error: data.error || "Execution failed",
          },
        ]);
        return;
      }
      setTestResults(
        data.results
          .filter((r: ExecuteResult) => !r.hidden)
          .map((r: ExecuteResult) => ({
            passed: r.passed,
            input: r.input,
            output: r.output,
            expected: r.expected,
            time: r.time,
            error: r.error,
          })),
      );
    } catch (e) {
      setTestResults([
        {
          passed: false,
          input: "",
          output: "",
          expected: "",
          time: "N/A",
          error: e instanceof Error ? e.message : "Network error",
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  }, [code, language, currentProblem, codingInterviewId]);

  const handleSubmit = useCallback(async () => {
    if (currentProblem.is_interactive) return;
    setIsSubmitting(true);
    setLastAction("submit");
    setTestResults([]);
    setHiddenResults(null);
    setConsoleExpanded(true);
    setConsoleTab("result");

    try {
      const res = await fetch("/api/leetcode/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          problemId: currentProblem.id,
          includeHidden: true,
          codingInterviewId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setTestResults([
          {
            passed: false,
            input: "",
            output: "",
            expected: "",
            time: "N/A",
            error: data.error || "Execution failed",
          },
        ]);
        return;
      }
      const visible = data.results.filter((r: ExecuteResult) => !r.hidden);
      const hidden = data.results.filter((r: ExecuteResult) => r.hidden);
      setTestResults(
        visible.map((r: ExecuteResult) => ({
          passed: r.passed,
          input: r.input,
          output: r.output,
          expected: r.expected,
          time: r.time,
          error: r.error,
        })),
      );
      setHiddenResults({
        passed: hidden.filter((r: ExecuteResult) => r.passed).length,
        total: hidden.length,
      });
      setLeftPanelTab("submissions");
    } catch (e) {
      setTestResults([
        {
          passed: false,
          input: "",
          output: "",
          expected: "",
          time: "N/A",
          error: e instanceof Error ? e.message : "Network error",
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }, [code, language, currentProblem, codingInterviewId]);

  const handleProblemChange = useCallback((direction: "prev" | "next") => {
    setCurrentProblemIndex((i) => (direction === "prev" ? i - 1 : i + 1));
    setTestResults([]);
    setHiddenResults(null);
    setConsoleExpanded(false);
    setConsoleTab("testcase");
    setLastAction(null);
    setLeftPanelTab("description");
  }, []);

  const handleConsoleToggle = useCallback(() => {
    setConsoleExpanded((v) => !v);
  }, []);

  return (
    <div className={`${hideTopBar ? "h-full" : "h-screen"} flex flex-col bg-background`}>
      {!hideTopBar ? (
        <TopBar
          problem={currentProblem}
          currentIndex={currentProblemIndex}
          totalProblems={problems.length}
          language={language}
          onLanguageChange={setLanguage}
          onPrevProblem={() => handleProblemChange("prev")}
          onNextProblem={() => handleProblemChange("next")}
        />
      ) : (
        <div className="border-b border-border bg-card px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground truncate max-w-[300px]">
              {currentProblem.title}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full bg-muted ${
                currentProblem.difficulty_bucket === "easy"
                  ? "text-green-400"
                  : currentProblem.difficulty_bucket === "medium"
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {currentProblem.difficulty_bucket}
            </span>
            <span className="text-xs text-muted-foreground">
              Problem {currentProblemIndex + 1} of {problems.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleProblemChange("prev")}
                disabled={currentProblemIndex === 0}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition text-xs"
              >
                Prev
              </button>
              <button
                onClick={() => handleProblemChange("next")}
                disabled={currentProblemIndex === problems.length - 1}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition text-xs"
              >
                Next
              </button>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-muted text-foreground px-3 py-1.5 rounded-md border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
            </select>
          </div>
        </div>
      )}

      <ResizablePanel direction="horizontal" initialRatio={40} min={20} max={80}>
        <LeftPanel
          problem={currentProblem}
          activeTab={leftPanelTab}
          onTabChange={setLeftPanelTab}
          testResults={testResults}
          hiddenResults={hiddenResults}
          lastAction={lastAction}
          language={language}
          code={code}
          hideSolution={!!codingInterviewId}
        />
        <RightPanel
          language={language}
          code={code}
          onCodeChange={setCode}
          onReset={resetCode}
          consoleExpanded={consoleExpanded}
          onToggleConsole={handleConsoleToggle}
          consoleTab={consoleTab}
          onConsoleTabChange={setConsoleTab}
          examples={examples}
          testResults={testResults}
          hiddenResults={hiddenResults}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          lastAction={lastAction}
          onRun={handleRun}
          onSubmit={handleSubmit}
          isInteractive={currentProblem.is_interactive}
        />
      </ResizablePanel>
    </div>
  );
}
