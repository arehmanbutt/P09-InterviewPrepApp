"use client";

import type { TranscriptEntry } from "app/models/Interview";
import { cn } from "@/app/lib/cn";

export default function TranscriptDisplay({ transcript }: { transcript: TranscriptEntry[] }) {
  if (!transcript || transcript.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground text-sm">No transcript available for this interview.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col gap-3 p-4">
        {transcript.map((entry, index) => {
          const isUser = entry.role === "user";
          return (
            <div key={index} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed border",
                  isUser
                    ? "bg-primary/10 border-primary/20 text-foreground"
                    : "bg-muted/50 border-border text-foreground",
                )}
              >
                <span
                  className={cn(
                    "block text-[10px] font-medium uppercase tracking-wider mb-1",
                    isUser ? "text-primary/70" : "text-muted-foreground",
                  )}
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
