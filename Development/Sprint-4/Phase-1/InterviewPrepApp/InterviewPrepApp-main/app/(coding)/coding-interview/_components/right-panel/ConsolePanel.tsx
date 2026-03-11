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
    <div className="h-full flex flex-col bg-[#0f0f0f]">
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        <button
          onClick={() => onTabChange("testcase")}
          className={`px-4 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "testcase"
              ? "text-white border-b-2 border-white"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Testcase
        </button>
        <button
          onClick={() => onTabChange("result")}
          className={`px-4 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "result"
              ? "text-white border-b-2 border-white"
              : "text-gray-500 hover:text-gray-300"
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
