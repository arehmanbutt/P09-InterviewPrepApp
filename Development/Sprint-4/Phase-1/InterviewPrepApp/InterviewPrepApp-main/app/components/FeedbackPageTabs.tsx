"use client";

import { useState } from "react";
import { BarChart3, MessageSquareText } from "lucide-react";
import type { InterviewFeedback, TranscriptEntry } from "app/models/Interview";
import FeedbackDisplay from "./FeedbackDisplay";
import TranscriptDisplay from "./TranscriptDisplay";

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
      <div className="flex gap-6 border-b border-white/10">
        <button
          onClick={() => setActiveTab("feedback")}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition ${
            activeTab === "feedback"
              ? "border-b-2 border-[#3ecf8e] text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <BarChart3 size={16} />
          Feedback
        </button>
        <button
          onClick={() => setActiveTab("transcript")}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition ${
            activeTab === "transcript"
              ? "border-b-2 border-[#3ecf8e] text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <MessageSquareText size={16} />
          Transcript
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "feedback" ? (
        <FeedbackDisplay feedback={feedback} />
      ) : (
        <TranscriptDisplay transcript={transcript} />
      )}
    </div>
  );
}
