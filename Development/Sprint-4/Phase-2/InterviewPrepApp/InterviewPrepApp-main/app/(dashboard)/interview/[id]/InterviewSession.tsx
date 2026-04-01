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
import { ArrowLeft, Clock, Mic, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { cn } from "@/app/lib/cn";

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
      <div className="mx-auto max-w-md">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <CheckCircle2 className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Interview Completed</h1>
          <p className="text-muted-foreground mb-6">This interview has already been completed.</p>
          <Button asChild variant="secondary" className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const displayQuestionCount = totalQuestions || questions.length;

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mic className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">{title}</h1>
          <p className="text-muted-foreground mb-5">{company}</p>
          <div className="mb-7 rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {displayQuestionCount} question{displayQuestionCount !== 1 ? "s" : ""} prepared &mdash;
            your browser will ask for microphone access when you start.
          </div>
          <Button onClick={() => setStarted(true)} size="lg" className="w-full gap-2">
            <Mic className="h-4 w-4" />
            Start Interview
          </Button>
        </Card>
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Link href="/dashboard">
            <ArrowLeft size={15} />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground text-sm">{company}</p>
      </div>

      {/* Progress bar + timer */}
      <div className="w-full">
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-1.5">
          <span>
            Question {questionsAsked} of {displayQuestionCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {formatTime(elapsedSeconds)}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(questionsAsked / displayQuestionCount) * 100}%` }}
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
        <Button
          variant="outline"
          onClick={() => setShowEndConfirm(true)}
          disabled={ending}
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          End Interview
        </Button>
      ) : (
        <Card className={cn("p-5 text-center w-full max-w-md border-destructive/20")}>
          <p className="text-sm text-muted-foreground mb-4">
            Are you sure? This will end the interview and generate your feedback report.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => setShowEndConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleEndInterview} disabled={ending}>
              {ending ? "Generating feedback..." : "End & Generate Feedback"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
