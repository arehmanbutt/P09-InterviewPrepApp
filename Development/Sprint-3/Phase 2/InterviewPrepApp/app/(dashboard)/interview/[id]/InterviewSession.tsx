"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { App } from "app/components/App";
import { DeepgramContextProvider } from "app/context/DeepgramContextProvider";
import { MicrophoneContextProvider } from "app/context/MicrophoneContextProvider";
import { VoiceBotProvider, useVoiceBot } from "app/context/VoiceBotContextProvider";
import type { TranscriptEntry } from "app/models/Interview";
import {
  buildAdaptiveInterviewConfig,
  buildHRInterviewConfig,
  buildInterviewConfig,
  type InterviewQuestion,
} from "app/lib/constants";
import InterviewTranscript from "app/components/InterviewTranscript";
import { selectNextQuestion } from "app/lib/sampling";
import type { AdaptiveState, LlmAnalysis } from "app/lib/types";
import { toast } from "sonner";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";

/** Syncs VoiceBot messages to a ref so the outer component can access the transcript */
function TranscriptCollector({
  transcriptRef,
}: {
  transcriptRef: React.MutableRefObject<TranscriptEntry[]>;
}) {
  const { messages } = useVoiceBot();
  useEffect(() => {
    const entries: TranscriptEntry[] = [];
    for (const msg of messages) {
      if ("user" in msg && typeof msg.user === "string") {
        entries.push({ role: "user", content: msg.user });
      } else if ("assistant" in msg && typeof msg.assistant === "string") {
        entries.push({ role: "assistant", content: msg.assistant });
      }
    }
    transcriptRef.current = entries;
  }, [messages, transcriptRef]);
  return null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface InterviewSessionProps {
  interviewId: string;
  title: string;
  company: string;
  questions: InterviewQuestion[];
  initialStatus: string;
  totalQuestions?: number;
  initialAdaptiveState?: AdaptiveState;
  apiBasePath?: string; // default: "/api/interviews"
  backUrl?: string; // default: "/dashboard"
  interviewType?: "technical" | "hr"; // default: "technical"
}

export default function InterviewSession({
  interviewId,
  title,
  company,
  questions,
  initialStatus,
  totalQuestions,
  initialAdaptiveState,
  apiBasePath = "/api/interviews",
  backUrl = "/dashboard",
  interviewType = "technical",
}: InterviewSessionProps) {
  const router = useRouter();
  const [ending, setEnding] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [started, setStarted] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState(initialAdaptiveState?.questionsAsked ?? 0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const handleEndRef = useRef<(() => Promise<void>) | null>(null);

  // Use adaptive config if we have adaptive state, otherwise fall back to legacy
  const isAdaptive = !!initialAdaptiveState;

  // Select the appropriate config based on interview type
  const stsConfig = isAdaptive
    ? interviewType === "hr"
      ? buildHRInterviewConfig(title, company, totalQuestions || questions.length)
      : buildAdaptiveInterviewConfig(title, company, totalQuestions || questions.length)
    : buildInterviewConfig(questions, title, company);

  // Adaptive state stored in ref — survives re-renders, no DB calls during interview
  const adaptiveStateRef = useRef<AdaptiveState | null>(
    initialAdaptiveState ? { ...initialAdaptiveState } : null,
  );

  // Timer — starts when interview session is active
  useEffect(() => {
    if (!started) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [started]);

  const handleMessageEvent = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) => {
      const data = args[0] as string | undefined;
      if (!data) return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "SettingsApplied" && !hasStarted) {
          setHasStarted(true);
          toast.info("Interview started \u2014 good luck!");
          fetch(`${apiBasePath}/${interviewId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "in-progress" }),
          });
        }
      } catch {
        // ignore non-JSON messages
      }
    },
    [interviewId, hasStarted, apiBasePath],
  );

  // Client-side function call handler — LLM provides scores, we select from pool
  const handleFunctionCall = useCallback(
    async (funcName: string, args: Record<string, unknown>): Promise<Record<string, unknown>> => {
      if (funcName === "end_interview") {
        // Small delay so the voice agent can finish speaking its farewell
        setTimeout(() => handleEndRef.current?.(), 3000);
        return { action: "ended" };
      }

      if (funcName !== "get_next_question") {
        return { error: "Unknown function" };
      }

      const state = adaptiveStateRef.current;
      if (!state) {
        return { error: "No adaptive state available" };
      }

      // Parse LLM's analysis — handle both technical and HR score formats
      const rawScores = args.scores as Record<string, unknown> | undefined;

      // For HR interviews, map communication/confidence/clarity to the standard format
      // For technical interviews, use correctness/depth/communication
      let analysis: LlmAnalysis;
      if (interviewType === "hr") {
        // HR scoring: communication, confidence, clarity → map to standard dimensions
        analysis = {
          scores: {
            correctness: Number(rawScores?.communication ?? 0), // HR communication → correctness
            depth: Number(rawScores?.confidence ?? 0), // HR confidence → depth
            communication: Number(rawScores?.clarity ?? 0), // HR clarity → communication
          },
          next_action: (args.next_action as "move_on" | "go_deeper" | "clarify") || "move_on",
          suggested_topics: Array.isArray(args.suggested_topics)
            ? (args.suggested_topics as string[])
            : [],
          user_response_summary: (args.user_response_summary as string) || "",
          rationale: (args.rationale as string) || "",
        };
      } else {
        // Technical scoring: correctness, depth, communication (standard)
        analysis = {
          scores: {
            correctness: Number(rawScores?.correctness ?? 0),
            depth: Number(rawScores?.depth ?? 0),
            communication: Number(rawScores?.communication ?? 0),
          },
          next_action: (args.next_action as "move_on" | "go_deeper" | "clarify") || "move_on",
          suggested_topics: Array.isArray(args.suggested_topics)
            ? (args.suggested_topics as string[])
            : [],
          user_response_summary: (args.user_response_summary as string) || "",
          rationale: (args.rationale as string) || "",
        };
      }

      // Select next question using LLM's analysis (pure JS, no DB)
      const result = selectNextQuestion(state, analysis);

      if (result.action === "followup") {
        return {
          action: "followup",
          clarificationPrompt: result.clarificationPrompt,
        };
      }

      if (result.action === "ask") {
        setQuestionsAsked(state.questionsAsked);
        return {
          action: "ask",
          questionText: result.question.question_text,
          expectedAnswer: result.question.answer_text,
        };
      }

      // action === "end"
      return { action: "end" };
    },
    [interviewType],
  );

  const handleEndInterview = async () => {
    setEnding(true);
    setShowEndConfirm(false);
    try {
      const state = adaptiveStateRef.current;
      await fetch(`${apiBasePath}/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          transcript: transcriptRef.current,
          questionScores: state?.questionScores ?? [],
        }),
      });
      toast.success("Interview completed \u2014 generating feedback...");
    } catch {
      toast.error("Failed to save interview data");
    } finally {
      router.push(backUrl);
    }
  };

  // Keep ref in sync so the stable handleFunctionCall can call the latest version
  handleEndRef.current = handleEndInterview;

  if (initialStatus === "completed") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Interview Completed</h1>
          <p className="text-gray-400 mb-6">This interview has already been completed.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const displayQuestionCount = totalQuestions || questions.length;

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur text-center">
          <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
          <p className="text-gray-400 mb-6">{company}</p>
          <p className="text-gray-300 text-sm mb-8">
            {displayQuestionCount} question
            {displayQuestionCount !== 1 ? "s" : ""} prepared. Your browser will ask for microphone
            access once you start.
          </p>
          <button
            onClick={() => setStarted(true)}
            className="rounded-lg bg-green-600 px-8 py-3 text-base font-semibold text-white transition hover:bg-green-500"
          >
            Start Interview
          </button>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto pb-8">
      <div className="text-center">
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="text-gray-400 text-sm">{company}</p>
      </div>

      {/* Progress bar + timer */}
      <div className="w-full">
        <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
          <span>
            Question {questionsAsked} of {displayQuestionCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {formatTime(elapsedSeconds)}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-[#3ecf8e] transition-all duration-500"
            style={{
              width: `${(questionsAsked / displayQuestionCount) * 100}%`,
            }}
          />
        </div>
      </div>

      <VoiceBotProvider>
        <MicrophoneContextProvider>
          <DeepgramContextProvider>
            <App
              defaultStsConfig={stsConfig}
              onMessageEvent={handleMessageEvent}
              onFunctionCall={isAdaptive ? handleFunctionCall : undefined}
              showTranscript={false}
              className="flex flex-col items-center gap-4 w-full"
            />
            <InterviewTranscript />
            <TranscriptCollector transcriptRef={transcriptRef} />
          </DeepgramContextProvider>
        </MicrophoneContextProvider>
      </VoiceBotProvider>

      {/* End interview — with confirmation */}
      {!showEndConfirm ? (
        <button
          onClick={() => setShowEndConfirm(true)}
          disabled={ending}
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-6 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          End Interview
        </button>
      ) : (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center w-full max-w-md">
          <p className="text-sm text-gray-300 mb-3">
            Are you sure? This will end the interview and generate feedback.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowEndConfirm(false)}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Cancel
            </button>
            <button
              onClick={handleEndInterview}
              disabled={ending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ending ? "Generating feedback..." : "End & Generate Feedback"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
