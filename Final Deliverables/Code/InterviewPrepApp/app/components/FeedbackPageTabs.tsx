"use client";

import { useState } from "react";
import { BarChart3, MessageSquareText } from "lucide-react";
import type { InterviewFeedback, TranscriptEntry } from "app/models/Interview";
import FeedbackDisplay from "./FeedbackDisplay";
import TranscriptDisplay from "./TranscriptDisplay";
import { cn } from "@/app/lib/cn";

type Tab = "feedback" | "transcript";

export default function FeedbackPageTabs({
  feedback,
  transcript,
}: {
  feedback: InterviewFeedback;
  transcript: TranscriptEntry[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("feedback");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-6 border-b border-border">
        {(["feedback", "transcript"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-2 pb-3 text-sm font-medium transition",
              activeTab === tab
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "feedback" ? (
              <BarChart3 className="h-4 w-4" />
            ) : (
              <MessageSquareText className="h-4 w-4" />
            )}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "feedback" ? (
        <FeedbackDisplay feedback={feedback} />
      ) : (
        <TranscriptDisplay transcript={transcript} />
      )}
    </div>
  );
}
