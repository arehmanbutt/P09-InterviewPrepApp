"use client";

import type { Language, Example, TestResult, HiddenResults } from "../../_lib/types";
import EditorToolbar from "./EditorToolbar";
import CodeEditor from "./CodeEditor";
import ConsoleFooter from "./ConsoleFooter";
import ConsolePanel, { type ConsoleTab } from "./ConsolePanel";
import ResizablePanel from "../ResizablePanel";

interface RightPanelProps {
  language: Language;
  code: string;
  onCodeChange: (value: string) => void;
  onReset: () => void;
  consoleExpanded: boolean;
  onToggleConsole: () => void;
  consoleTab: ConsoleTab;
  onConsoleTabChange: (tab: ConsoleTab) => void;
  examples: Example[];
  testResults: TestResult[];
  hiddenResults: HiddenResults | null;
  isRunning: boolean;
  isSubmitting: boolean;
  lastAction: "run" | "submit" | null;
  onRun: () => void;
  onSubmit: () => void;
  isInteractive: boolean;
}

export default function RightPanel({
  language,
  code,
  onCodeChange,
  onReset,
  consoleExpanded,
  onToggleConsole,
  consoleTab,
  onConsoleTabChange,
  examples,
  testResults,
  hiddenResults,
  isRunning,
  isSubmitting,
  lastAction,
  onRun,
  onSubmit,
  isInteractive,
}: RightPanelProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      <EditorToolbar onReset={onReset} />

      {consoleExpanded ? (
        <ResizablePanel direction="vertical" initialRatio={55} min={20} max={80}>
          <div className="h-full">
            <CodeEditor language={language} code={code} onChange={onCodeChange} />
          </div>
          <div className="h-full">
            <ConsolePanel
              activeTab={consoleTab}
              onTabChange={onConsoleTabChange}
              examples={examples}
              testResults={testResults}
              hiddenResults={hiddenResults}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              lastAction={lastAction}
            />
          </div>
        </ResizablePanel>
      ) : (
        <div className="flex-1 overflow-hidden">
          <CodeEditor language={language} code={code} onChange={onCodeChange} />
        </div>
      )}

      <ConsoleFooter
        consoleExpanded={consoleExpanded}
        onToggleConsole={onToggleConsole}
        onRun={onRun}
        onSubmit={onSubmit}
        isRunning={isRunning}
        isSubmitting={isSubmitting}
        disabled={isInteractive}
      />
    </div>
  );
}
