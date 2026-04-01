"use client";

import { useState } from "react";
import type { Example } from "../../_lib/types";

interface TestcaseTabProps {
  examples: Example[];
}

export default function TestcaseTab({ examples }: TestcaseTabProps) {
  const [activeCase, setActiveCase] = useState(0);

  if (examples.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No test cases available.</div>;
  }

  const current = examples[activeCase] ?? examples[0];

  return (
    <div className="h-full flex flex-col">
      {/* Case tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-2">
        {examples.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveCase(idx)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeCase === idx
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Case {idx + 1}
          </button>
        ))}
      </div>

      {/* Input display */}
      <div className="flex-1 overflow-y-auto px-4 pb-3">
        {current && (
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Input</p>
              <pre className="text-xs text-foreground/80 font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap">
                {current.input || "(empty)"}
              </pre>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Expected Output</p>
              <pre className="text-xs text-foreground/80 font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap">
                {current.output || "(empty)"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
