"use client";

import type { TranscriptEntry } from "app/models/Interview";

export default function TranscriptDisplay({ transcript }: { transcript: TranscriptEntry[] }) {
  if (!transcript || transcript.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur text-center">
        <p className="text-gray-400 text-sm">No transcript available for this interview.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
      <div className="flex flex-col gap-3 p-4">
        {transcript.map((entry, index) => {
          const isUser = entry.role === "user";
          return (
            <div key={index} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? "bg-blue-600/20 border border-blue-500/20 text-blue-100"
                    : "bg-white/[0.07] border border-white/10 text-gray-200"
                }`}
              >
                <span
                  className={`block text-[10px] font-medium uppercase tracking-wider mb-1 ${
                    isUser ? "text-blue-400/70" : "text-gray-500"
                  }`}
                >
                  {isUser ? "You" : "Interviewer"}
                </span>
                {entry.content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
