"use client";

import { Timer, Cpu } from "lucide-react";
import type { Problem, Example } from "../../_lib/types";
import { cleanStatementBody, splitBatchForDisplay } from "../../_lib/templates";

interface DescriptionTabProps {
  problem: Problem;
}

export default function DescriptionTab({ problem }: DescriptionTabProps) {
  const isLeetCode = problem.problem_format === "leetcode";

  return (
    <div className="space-y-6">
      {/* Limits — only for competitive problems */}
      {!isLeetCode && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 text-[#3ecf8e] mb-1">
              <Timer className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Time Limit</span>
            </div>
            <div className="text-lg font-bold text-white">{problem.time_limit ?? "N/A"}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 text-[#3ecf8e] mb-1">
              <Cpu className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Memory Limit</span>
            </div>
            <div className="text-lg font-bold text-white">{problem.memory_limit ?? "N/A"}</div>
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {problem.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-gray-800 border border-gray-700 px-2.5 py-0.5 text-xs text-gray-300"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Problem Statement */}
      {isLeetCode ? (
        <div
          className="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed
            [&_pre]:bg-gray-800/60 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-sm [&_pre]:font-mono
            [&_code]:bg-gray-800/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
            [&_img]:max-w-full [&_img]:rounded-lg
            [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
            [&_table]:border-collapse [&_th]:border [&_th]:border-gray-700 [&_th]:px-3 [&_th]:py-1
            [&_td]:border [&_td]:border-gray-700 [&_td]:px-3 [&_td]:py-1"
          dangerouslySetInnerHTML={{ __html: problem.stmt_body }}
        />
      ) : (
        <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
          {cleanStatementBody(problem.stmt_body)}
        </div>
      )}

      {/* Interactive Warning */}
      {problem.is_interactive && (
        <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 text-sm text-yellow-400">
          This is an interactive problem. Code execution is not supported.
        </div>
      )}

      {/* Examples — only for competitive problems (LeetCode embeds examples in HTML) */}
      {!isLeetCode && (
        <div className="space-y-4">
          {(() => {
            const examples = splitBatchForDisplay(problem.examples ?? [], problem.has_t);
            return examples.length === 0 ? (
              <p className="text-sm text-gray-500">No examples available.</p>
            ) : (
              examples.slice(0, 2).map((example: Example, idx: number) => (
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
            );
          })()}
        </div>
      )}
    </div>
  );
}
