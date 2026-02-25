// app/(dashboard)/coding-interview/page.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MonacoEditor from "@monaco-editor/react";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  GripVertical,
  Timer,
  Cpu,
} from "lucide-react";

interface TestResult {
  passed: boolean;
  input: string;
  output: string;
  expected: string;
  time: string;
  error?: string | null;
}

interface Example {
  input: string;
  output: string;
}

interface Problem {
  id: string;
  title: string;
  tags: string[];
  difficulty_bucket: string;
  time_limit?: string | null;
  memory_limit?: string | null;
  stmt_body: string;
  examples: Example[];
  code_templates?: {
    javascript?: string;
    python?: string;
    cpp?: string;
  };
  io_schema?: {
    input_type?: string;
    output_type?: string;
    input_format?: string;
    output_format?: string;
  };
  has_t: boolean;
  is_interactive: boolean;
  example_type: "batch" | "individual";
}

interface ExecuteResult {
  passed: boolean;
  input: string;
  output: string;
  expected: string;
  time: string;
  error: string | null;
  hidden: boolean;
}

function getDefaultTemplate(language: string, hasT: boolean): string {
  if (hasT) {
    switch (language) {
      case "python":
        return `import sys\ninput = sys.stdin.readline\n\ndef solve():\n    # Write your solution here\n    pass\n\nt = int(input())\nfor _ in range(t):\n    solve()`;
      case "cpp":
        return `#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solve() {\n    // Write your solution here\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int t;\n    cin >> t;\n    while (t--) solve();\n    return 0;\n}`;
      case "javascript":
      default:
        return `const lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');\nlet idx = 0;\nconst t = parseInt(lines[idx++]);\n\nfor (let i = 0; i < t; i++) {\n    // Read input using lines[idx++]\n    // Write your solution here\n}`;
    }
  } else {
    switch (language) {
      case "python":
        return `import sys\ninput = sys.stdin.readline\n\n# Write your solution here\n`;
      case "cpp":
        return `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Write your solution here\n    return 0;\n}`;
      case "javascript":
      default:
        return `const lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');\nlet idx = 0;\n\n// Read input using lines[idx++]\n// Write your solution here\n`;
    }
  }
}

/**
 * Split a batch example (with t header) into individual test cases for display only.
 * Returns up to 2 cases for the UI.
 */
function splitBatchForDisplay(examples: Example[], hasT: boolean): Example[] {
  if (!hasT || examples.length !== 1) {
    // Already individual examples or no t header — return as-is (up to 2)
    return examples.filter((ex) => ex.input.trim() !== "" || ex.output.trim() !== "").slice(0, 2);
  }

  const single = examples[0]!;
  const inputLines = single.input.split("\n").filter((l) => l.trim() !== "");
  const outputLines = single.output.split("\n").filter((l) => l.trim() !== "");
  const first = inputLines[0]?.trim() ?? "";
  const t = parseInt(first, 10);

  if (isNaN(t) || String(t) !== first || t <= 1) {
    return [single];
  }

  const body = inputLines.slice(1);
  const inferredLines = Math.max(1, Math.floor(body.length / t));
  const outputPerCase = Math.max(1, Math.floor(outputLines.length / t));

  // Only split if it divides evenly
  if (body.length % inferredLines !== 0 || outputLines.length % outputPerCase !== 0) {
    return [single];
  }

  const splitExamples: Example[] = [];
  for (let i = 0; i < Math.min(t, 2); i++) {
    const inp = body
      .slice(i * inferredLines, (i + 1) * inferredLines)
      .join("\n")
      .trim();
    const out = outputLines
      .slice(i * outputPerCase, (i + 1) * outputPerCase)
      .join("\n")
      .trim();
    if (inp || out) splitExamples.push({ input: inp, output: out });
  }

  return splitExamples.length > 0 ? splitExamples : [single];
}

function cleanStatementBody(raw: string): string {
  return raw
    .replace(/^[A-Z0-9]+\.\s+.+\n?/, "")
    .replace(/time limit per test[\s\S]{0,80}?(second[s]?)/gi, "")
    .replace(/memory limit per test[\s\S]{0,80}?(megabyte[s]?)/gi, "")
    .replace(/^input\s*$/gim, "")
    .replace(/^output\s*$/gim, "")
    .replace(/^standard input\s*$/gim, "")
    .replace(/^standard output\s*$/gim, "")
    .replace(
      /\n?(The first line contains|The only line|Each line|Input Format|Output Format|Constraints|Additional constraint|Note\s*$|Example[s]?\s*$)[\s\S]*/im,
      "",
    )
    .replace(/\${1,3}([^$]+)\${1,3}/g, "$1")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\texttt\{([^}]*)\}/g, "$1")
    .replace(/\\textbf\{([^}]*)\}/g, "$1")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\le\b/g, "≤")
    .replace(/\\ge\b/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\cdot/g, "·")
    .replace(/\\ldots/g, "...")
    .replace(/\\times/g, "×")
    .replace(/\\infty/g, "∞")
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function CodingInterviewPage() {
  const [language, setLanguage] = useState<"python" | "cpp" | "javascript">("javascript");
  const [code, setCode] = useState(`function twoSum(nums, target) {
    // Write your solution here
    
}`);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "solution" | "submissions">(
    "description",
  );
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [leftWidth, setLeftWidth] = useState(40); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [problemsLoading, setProblemsLoading] = useState(true);

  const [testPanel, setTestPanel] = useState(false);

  useEffect(() => {
    async function fetchProblems() {
      try {
        const [easyRes, mediumRes] = await Promise.all([
          fetch("/api/leetcode?difficulty=easy"),
          fetch("/api/leetcode?difficulty=medium"),
        ]);
        const easyData = await easyRes.json();
        const mediumData = await mediumRes.json();

        const easyPool: Problem[] = easyData.data ?? [];
        const mediumPool: Problem[] = mediumData.data ?? [];

        // Pick 2 random easy, 1 random medium
        const shuffled = (arr: Problem[]) => arr.sort(() => Math.random() - 0.5);
        const selected = [...shuffled(easyPool).slice(0, 2), ...shuffled(mediumPool).slice(0, 1)];

        setProblems(selected);
        console.log("Sample problem from DB:", JSON.stringify(selected[0], null, 2));
      } catch (e) {
        console.error("Failed to fetch problems", e);
      } finally {
        setProblemsLoading(false);
      }
    }
    fetchProblems();
  }, []);

  const currentProblem = problems[currentProblemIndex];

  // async function fetchFunctionSignature(
  //   problemTitle: string,
  //   stmtBody: string,
  //   language: string
  // ): Promise<string> {
  //   try {
  //     const res = await fetch("/api/leetcode/signature", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ problemTitle, stmtBody, language }),
  //     });
  //     const data = await res.json();
  //     return data.signature ?? getDefaultTemplate(language);
  //   } catch {
  //     return getDefaultTemplate(language);
  //   }
  // }

  useEffect(() => {
    if (!currentProblem) return;
    setCode(getDefaultTemplate(language, currentProblem.has_t));
  }, [language, currentProblem]);

  const problem = currentProblem
    ? {
        id: currentProblem.id,
        title: currentProblem.title,
        difficulty: currentProblem.difficulty_bucket,
        recommendedTime: currentProblem.time_limit ?? "N/A",
        timeComplexity: "N/A",
        spaceComplexity: "N/A",
        description: cleanStatementBody(currentProblem.stmt_body),
        examples: splitBatchForDisplay(currentProblem.examples ?? [], currentProblem.has_t),
        constraints: currentProblem.tags.map((tag) => `Topic: ${tag}`),
      }
    : null;

  // Handle drag to resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Limit between 20% and 80%
      const clampedWidth = Math.min(Math.max(newLeftWidth, 20), 80);
      setLeftWidth(clampedWidth);
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleRun = async () => {
    if (!currentProblem) return;
    if (currentProblem.is_interactive) return;

    setIsRunning(true);
    setTestResults([]);

    try {
      const res = await fetch("/api/leetcode/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          problemId: currentProblem.id,
        }),
      });

      const data = await res.json();
      console.log("[5] Response JSON:", JSON.stringify(data, null, 2));

      if (!data.success) return;

      const visibleResults = data.results
        .filter((r: ExecuteResult) => !r.hidden)
        .map((r: ExecuteResult) => ({
          passed: r.passed,
          input: r.input,
          output: r.output,
          expected: r.expected,
          time: r.time,
          error: r.error,
        }));

      setTestResults(visibleResults);
      setIsRunning(false);
      setTestPanel(true);
    } catch (e) {
      console.error("[ERROR]", e);
      setIsRunning(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "hard":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  if (problemsLoading) {
    return (
      <div className="h-screen bg-[#0b0b0b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3ecf8e]" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="h-screen bg-[#0b0b0b] flex items-center justify-center text-gray-400">
        No problems found. Please populate the database first.
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0b0b0b] text-gray-200 flex flex-col">
      {/* Top Navigation Bar */}
      <div className="border-b border-gray-800 bg-[#0f0f0f] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-white">{problem.title}</h1>
          <span className={`text-sm font-medium ${getDifficultyColor(problem.difficulty)}`}>
            {problem.difficulty}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          {currentProblemIndex > 0 && (
            <button
              onClick={() => {
                setCurrentProblemIndex((i) => i - 1);
                setTestResults([]);
              }}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-md border border-gray-700 text-sm transition"
            >
              ← Prev
            </button>
          )}
          <span className="text-xs text-gray-500">
            {currentProblemIndex + 1} / {problems.length}
          </span>
          {currentProblemIndex < problems.length - 1 && (
            <button
              onClick={() => {
                setCurrentProblemIndex((i) => i + 1);
                setTestResults([]);
              }}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-md border border-gray-700 text-sm transition"
            >
              Next →
            </button>
          )}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "python" | "cpp" | "javascript")}
            className="bg-gray-800 text-gray-200 px-3 py-1.5 rounded-md border border-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-[#3ecf8e]"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
          </select>
        </div>
      </div>

      {/* Main Content - Resizable Split View */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Problem Description */}
        <div className="overflow-y-auto bg-[#0f0f0f]" style={{ width: `${leftWidth}%` }}>
          {/* Tabs */}
          <div className="flex border-b border-gray-800 sticky top-0 bg-[#0f0f0f] z-10">
            <button
              onClick={() => setActiveTab("description")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "description"
                  ? "text-[#3ecf8e] border-b-2 border-[#3ecf8e]"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("solution")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "solution"
                  ? "text-[#3ecf8e] border-b-2 border-[#3ecf8e]"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Solution
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "submissions"
                  ? "text-[#3ecf8e] border-b-2 border-[#3ecf8e]"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Submissions
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === "description" && (
              <div className="space-y-6">
                {/* Recommended Time & Complexity Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center space-x-2 text-[#3ecf8e] mb-2">
                      <Timer className="w-4 h-4" />
                      <span className="text-sm font-medium">Time Limit</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{problem.recommendedTime}</div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center space-x-2 text-[#3ecf8e] mb-2">
                      <Cpu className="w-4 h-4" />
                      <span className="text-sm font-medium">Memory Limit</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {currentProblem?.memory_limit ?? "N/A"}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {currentProblem?.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-800 border border-gray-700 px-2.5 py-0.5 text-xs text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Problem Statement */}
                <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                  {problem.description}
                </div>

                {/* Interactive Problem Warning */}
                {currentProblem?.is_interactive && (
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 text-sm text-yellow-400">
                    ⚠ This is an interactive problem. Code execution is not supported — you can
                    read and understand the problem, but test cases cannot be evaluated
                    automatically.
                  </div>
                )}
                {/* Examples - NeetCode style */}
                <div className="space-y-6">
                  {problem.examples.length === 0 ? (
                    <p className="text-sm text-gray-500">No examples available.</p>
                  ) : (
                    problem.examples
                      .slice(0, 2)
                      .filter(
                        (example) => example.input.trim() !== "" || example.output.trim() !== "",
                      )
                      .map((example, idx) => (
                        <div key={idx} className="space-y-2">
                          <h3 className="text-sm font-bold text-white">Example {idx + 1}:</h3>
                          <div className="rounded-lg bg-gray-800/60 border border-gray-700 p-4 space-y-3">
                            <div className="flex gap-3 items-start">
                              <span className="text-[#3ecf8e] text-sm font-semibold shrink-0 w-14">
                                Input:
                              </span>
                              <pre className="text-sm text-white font-mono whitespace-pre-wrap leading-relaxed">
                                {example.input || "(none)"}
                              </pre>
                            </div>
                            <div className="border-t border-gray-700" />
                            <div className="flex gap-3 items-start">
                              <span className="text-[#3ecf8e] text-sm font-semibold shrink-0 w-14">
                                Output:
                              </span>
                              <pre className="text-sm text-white font-mono whitespace-pre-wrap leading-relaxed">
                                {example.output || "(none)"}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "solution" && (
              <div className="text-gray-400 text-center py-12">
                <p>Official solution will appear here after you submit.</p>
              </div>
            )}

            {activeTab === "submissions" && (
              <div className="space-y-4">
                {testResults.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-3">
                      <Play className="w-5 h-5 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-500">No submissions yet.</p>
                    <p className="text-xs text-gray-600 mt-1">Run your code to see results here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status Banner */}
                    <div
                      className={`rounded-lg px-4 py-3 flex items-center gap-3 ${
                        testResults.every((r) => r.passed)
                          ? "bg-green-500/10 border border-green-500/20"
                          : "bg-red-500/10 border border-red-500/20"
                      }`}
                    >
                      {testResults.every((r) => r.passed) ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                      )}
                      <div>
                        <p
                          className={`text-sm font-semibold ${testResults.every((r) => r.passed) ? "text-green-400" : "text-red-400"}`}
                        >
                          {testResults.every((r) => r.passed) ? "Accepted" : "Wrong Answer"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {testResults.filter((r) => r.passed).length} / {testResults.length} test
                          cases passed
                        </p>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Runtime</p>
                        <p className="text-lg font-bold text-white">
                          {testResults[0]?.time ?? "N/A"}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Test Cases</p>
                        <p className="text-lg font-bold text-white">
                          {testResults.filter((r) => r.passed).length}/{testResults.length}
                        </p>
                        <p className="text-xs text-gray-600">passed</p>
                      </div>
                    </div>

                    {/* Language Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Language:</span>
                      <span className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-full capitalize">
                        {language}
                      </span>
                    </div>

                    {/* Code Snapshot */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2 font-medium">Submitted Code</p>
                      <div className="relative rounded-lg bg-gray-900 border border-gray-700 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800/50">
                          <span className="text-xs text-gray-400 font-mono capitalize">
                            {language}
                          </span>
                          <button
                            onClick={() => navigator.clipboard.writeText(code)}
                            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <pre className="text-xs text-gray-300 font-mono p-4 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre leading-relaxed">
                          {code}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Draggable Divider */}
        <div
          className={`w-1 hover:w-1.5 bg-gray-700 hover:bg-[#3ecf8e] cursor-col-resize transition-all duration-150 relative group ${
            isDragging ? "bg-[#3ecf8e] w-1.5" : ""
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:text-white">
            <GripVertical className="w-4 h-4" />
          </div>
        </div>

        {/* Right Panel - Code Editor & Results */}
        <div className="flex flex-col bg-[#0b0b0b]" style={{ width: `${100 - leftWidth}%` }}>
          {/* Editor Toolbar */}
          <div className="bg-[#0f0f0f] border-b border-gray-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Code</span>
            </div>
            <button
              onClick={handleRun}
              disabled={isRunning || currentProblem?.is_interactive === true}
              className="bg-[#3ecf8e] hover:bg-[#36be81] text-black px-4 py-1.5 rounded-md text-sm font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run Code</span>
                </>
              )}
            </button>
          </div>

          {/* Code Editor */}
          <div className="flex-1">
            <MonacoEditor
              height="100%"
              language={language}
              value={code}
              onChange={(value) => setCode(value || "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                fontFamily: "JetBrains Mono, Fira Code, monospace",
                fontLigatures: true,
              }}
            />
          </div>

          {/* Test Results Panel */}
          {(testResults.length > 0 || isRunning) && (
            <div className="h-64 border-t border-gray-800 bg-[#0f0f0f] overflow-y-auto">
              <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">Test Results</h3>
                {!isRunning && testResults.length > 0 && (
                  <span
                    className={`text-xs font-medium ${
                      testResults.every((r) => r.passed) ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {testResults.filter((r) => r.passed).length}/{testResults.length} passed
                  </span>
                )}
              </div>

              <div className="p-4">
                {isRunning && (
                  <div className="flex items-center justify-center h-32 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#3ecf8e]" />
                    <span className="text-sm text-gray-400">Running test cases...</span>
                  </div>
                )}
                {testPanel && (
                  <div className="space-y-3">
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
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span
                              className={`text-sm font-medium ${
                                result.passed ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {result.passed ? "Accepted" : "Wrong Answer"} — Case {idx + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {result.time}
                          </div>
                        </div>

                        <div className="bg-gray-900 p-3 space-y-2">
                          <div className="flex gap-2 items-start">
                            <span className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">
                              Input:
                            </span>
                            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                              {result.input}
                            </pre>
                          </div>
                          <div className="flex gap-2 items-start">
                            <span className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">
                              Expected:
                            </span>
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                              {result.expected}
                            </pre>
                          </div>
                          <div className="flex gap-2 items-start">
                            <span className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">
                              Your output:
                            </span>
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
                              <span className="text-xs text-red-500 w-20 shrink-0 pt-0.5">
                                Error:
                              </span>
                              <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap">
                                {result.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
