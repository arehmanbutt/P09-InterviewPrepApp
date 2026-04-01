"use client";

import type { Example, TestResult, HiddenResults } from "../../_lib/types";
import TestcaseTab from "./TestcaseTab";
import ResultTab from "./ResultTab";

export type ConsoleTab = "testcase" | "result";

interface ConsolePanelProps {
  activeTab: ConsoleTab;
  onTabChange: (tab: ConsoleTab) => void;
  examples: Example[];
  testResults: TestResult[];
  hiddenResults: HiddenResults | null;
  isRunning: boolean;
  isSubmitting: boolean;
  lastAction: "run" | "submit" | null;
}

export default function ConsolePanel({
  activeTab,
  onTabChange,
  examples,
  testResults,
  hiddenResults,
  isRunning,
  isSubmitting,
  lastAction,
}: ConsolePanelProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tab bar */}
      <div className="flex border-b border-border flex-shrink-0">
        <button
          onClick={() => onTabChange("testcase")}
          className={`px-4 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "testcase"
              ? "text-foreground border-b-2 border-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Testcase
        </button>
        <button
          onClick={() => onTabChange("result")}
          className={`px-4 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "result"
              ? "text-foreground border-b-2 border-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Result
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "testcase" ? (
          <TestcaseTab examples={examples} />
        ) : (
          <ResultTab
            testResults={testResults}
            hiddenResults={hiddenResults}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            lastAction={lastAction}
          />
        )}
      </div>
    </div>
  );
}
