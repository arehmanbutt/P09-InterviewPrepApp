"use client";

import type { Language, Problem, TestResult, HiddenResults } from "../../_lib/types";
import DescriptionTab from "./DescriptionTab";
import SolutionTab from "./SolutionTab";
import SubmissionsTab from "./SubmissionsTab";

export type LeftPanelTab = "description" | "solution" | "submissions";

interface LeftPanelProps {
  problem: Problem;
  activeTab: LeftPanelTab;
  onTabChange: (tab: LeftPanelTab) => void;
  testResults: TestResult[];
  hiddenResults: HiddenResults | null;
  lastAction: "run" | "submit" | null;
  language: Language;
  code: string;
}

const tabs: { key: LeftPanelTab; label: string }[] = [
  { key: "description", label: "Description" },
  { key: "solution", label: "Solution" },
  { key: "submissions", label: "Submissions" },
];

export default function LeftPanel({
  problem,
  activeTab,
  onTabChange,
  testResults,
  hiddenResults,
  lastAction,
  language,
  code,
}: LeftPanelProps) {
  return (
    <div className="h-full flex flex-col bg-[#0f0f0f]">
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "text-[#3ecf8e] border-b-2 border-[#3ecf8e]"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "description" && <DescriptionTab problem={problem} />}
        {activeTab === "solution" && <SolutionTab problem={problem} />}
        {activeTab === "submissions" && (
          <SubmissionsTab
            testResults={testResults}
            hiddenResults={hiddenResults}
            lastAction={lastAction}
            language={language}
            code={code}
          />
        )}
      </div>
    </div>
  );
}
