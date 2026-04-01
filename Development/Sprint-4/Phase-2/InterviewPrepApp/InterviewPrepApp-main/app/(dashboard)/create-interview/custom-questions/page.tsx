"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Mic,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/lib/cn";

interface CustomQuestion {
  question: string;
  sampleAnswer: string;
  rubric: string[];
}

interface InterviewConfig {
  title: string;
  company: string;
  jobLevel: string;
  interviewType: "technical" | "hr";
  isMassInterview: boolean;
}

function isValidConfig(v: unknown): v is InterviewConfig {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.title === "string" && typeof o.company === "string";
}

function emptyQuestion(): CustomQuestion {
  return { question: "", sampleAnswer: "", rubric: [] };
}

export default function CustomQuestionsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [questions, setQuestions] = useState<CustomQuestion[]>([emptyQuestion()]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [newRubricPoint, setNewRubricPoint] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("customInterviewConfig");
    if (!raw) {
      router.replace("/create-interview");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isValidConfig(parsed)) {
        router.replace("/create-interview");
        return;
      }
      setConfig(parsed);
    } catch {
      router.replace("/create-interview");
    }
  }, [router]);

  // ── Helpers ──────────────────────────────────────────────────────

  const current = questions[currentIdx];

  function updateCurrent(patch: Partial<CustomQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === currentIdx ? { ...q, ...patch } : q)));
  }

  function addQuestion() {
    const newQ = emptyQuestion();
    setQuestions((prev) => [...prev, newQ]);
    setCurrentIdx(questions.length);
    setNewRubricPoint("");
  }

  function removeQuestion(idx: number) {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    setCurrentIdx((prev) => Math.min(prev, questions.length - 2));
  }

  function goTo(idx: number) {
    setCurrentIdx(idx);
    setNewRubricPoint("");
  }

  function addRubricPoint() {
    if (!current) return;
    const trimmed = newRubricPoint.trim();
    if (!trimmed) return;
    updateCurrent({ rubric: [...current.rubric, trimmed] });
    setNewRubricPoint("");
  }

  function removeRubricPoint(i: number) {
    if (!current) return;
    updateCurrent({ rubric: current.rubric.filter((_, ri) => ri !== i) });
  }

  function isQuestionValid(q: CustomQuestion) {
    return (
      q.question.trim().length > 0 && (q.sampleAnswer.trim().length > 0 || q.rubric.length > 0)
    );
  }

  const allValid = questions.every(isQuestionValid);

  // ── Submit ────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!config || !allValid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: config.title,
          company: config.company,
          jobLevel: config.jobLevel ?? "mid",
          interviewType: config.interviewType ?? "technical",
          isMassInterview: config.isMassInterview ?? false,
          isCustomInterview: true,
          customQuestions: questions.map((q) => ({
            question: q.question.trim(),
            sampleAnswer: q.sampleAnswer.trim(),
            rubric: q.rubric,
          })),
          numQuestions: questions.length,
          description: `Custom interview with ${questions.length} question${questions.length !== 1 ? "s" : ""} for ${config.title} at ${config.company}.`,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create interview");
      }

      sessionStorage.removeItem("customInterviewConfig");
      toast.success("Custom interview created");
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  if (!config || !current) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="gap-2 text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ListChecks className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Custom Questions</h1>
          <p className="text-sm text-muted-foreground">
            {config.title} · {config.company}
          </p>
        </div>
      </div>

      {/* Question nav dots */}
      <div className="flex items-center gap-2 flex-wrap">
        {questions.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all border",
              i === currentIdx
                ? "bg-primary text-primary-foreground border-primary"
                : isQuestionValid(q)
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "bg-muted text-muted-foreground border-border",
            )}
          >
            {i + 1}
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={addQuestion}
          className="h-8 gap-1 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {/* Question card */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Question {currentIdx + 1} of {questions.length}
          </h2>
          {questions.length > 1 && (
            <button
              type="button"
              onClick={() => removeQuestion(currentIdx)}
              className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>

        {/* Question text */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Question <span className="text-destructive">*</span>
          </label>
          <textarea
            rows={3}
            value={current.question}
            onChange={(e) => updateCurrent({ question: e.target.value })}
            placeholder="e.g. Explain the difference between REST and GraphQL..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none transition-colors"
          />
        </div>

        {/* Sample answer */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Sample Answer
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (required if no rubric points)
            </span>
          </label>
          <textarea
            rows={4}
            value={current.sampleAnswer}
            onChange={(e) => updateCurrent({ sampleAnswer: e.target.value })}
            placeholder="Describe the ideal answer the AI interviewer should expect..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none transition-colors"
          />
        </div>

        {/* Rubric */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Scoring Rubric
            <span className="ml-2 text-xs font-normal text-muted-foreground">optional</span>
          </label>

          {current.rubric.length > 0 && (
            <ul className="mb-3 space-y-2">
              {current.rubric.map((point, ri) => (
                <li
                  key={ri}
                  className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <span className="flex-1 text-sm text-foreground">{point}</span>
                  <button
                    type="button"
                    onClick={() => removeRubricPoint(ri)}
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Input
              value={newRubricPoint}
              onChange={(e) => setNewRubricPoint(e.target.value)}
              placeholder="e.g. Mentions HTTP methods and status codes"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRubricPoint();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRubricPoint}
              disabled={!newRubricPoint.trim()}
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Press Enter or click + to add a rubric point
          </p>
        </div>

        {/* Validation hint */}
        {!isQuestionValid(current) && current.question.trim() && (
          <p className="text-xs text-destructive">
            Add a sample answer or at least one rubric point to continue.
          </p>
        )}
      </Card>

      {/* Prev / Next navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goTo(currentIdx - 1)}
          disabled={currentIdx === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        {currentIdx < questions.length - 1 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(currentIdx + 1)}
            className="gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={addQuestion}
            className="gap-2 text-muted-foreground"
          >
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        )}
      </div>

      {/* Submit */}
      <Button
        size="lg"
        className="w-full gap-2"
        disabled={loading || !allValid}
        onClick={handleSubmit}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating Interview...
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            Create Custom Interview ({questions.length} question
            {questions.length !== 1 ? "s" : ""})
          </>
        )}
      </Button>

      {!allValid && (
        <p className="text-center text-xs text-muted-foreground">
          Every question needs text and either a sample answer or a rubric point.
        </p>
      )}
    </div>
  );
}
