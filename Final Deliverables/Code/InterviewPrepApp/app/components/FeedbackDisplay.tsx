import { CheckCircle2, TrendingUp, Star, Award, UserCheck, XCircle } from "lucide-react";
import type { InterviewFeedback } from "app/models/Interview";
import { cn } from "@/app/lib/cn";

function LargeStarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={32}
          className={i < Math.round(score) ? "fill-accent text-accent" : "text-muted-foreground/30"}
        />
      ))}
      <span className="ml-3 text-2xl font-bold text-foreground">{score.toFixed(1)}</span>
      <span className="text-lg text-muted-foreground">/5</span>
    </div>
  );
}

function ScoreBar({ score, max = 5, label }: { score: number; max?: number; label: string }) {
  const pct = (score / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-foreground/80">{label}</span>
        <span className="text-sm font-medium text-accent">{score.toFixed(1)}/5</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  very_low: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
  borderline: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30" },
  acceptable: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
  strong: { bg: "bg-accent/10", text: "text-accent", border: "border-accent/30" },
};

const CATEGORY_LABELS: Record<string, string> = {
  very_low: "Very Low",
  borderline: "Borderline",
  acceptable: "Acceptable",
  strong: "Strong",
};

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.acceptable!;
  const label = CATEGORY_LABELS[category] ?? category;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        colors.bg,
        colors.text,
        colors.border,
      )}
    >
      {label}
    </span>
  );
}

function StarRating({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={18}
          className={i < Math.round(score) ? "fill-accent text-accent" : "text-muted-foreground/30"}
        />
      ))}
      <span className="ml-2 text-sm text-muted-foreground">{score.toFixed(1)}/5</span>
    </div>
  );
}

function StrengthsImprovements({ feedback }: { feedback: InterviewFeedback }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
        <h2 className="text-sm font-medium text-accent uppercase tracking-wider mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Strengths
        </h2>
        <ul className="space-y-2">
          {feedback.strengths.map((s, i) => (
            <li key={i} className="text-foreground/80 text-sm flex items-start gap-2">
              <span className="text-accent mt-0.5 shrink-0">+</span>
              {s}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <h2 className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Areas for Improvement
        </h2>
        <ul className="space-y-2">
          {feedback.improvements.map((imp, i) => (
            <li key={i} className="text-foreground/80 text-sm flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">↑</span>
              {imp}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** New format: aggregate component scores + per-question breakdown */
function NewFeedbackDisplay({ feedback }: { feedback: InterviewFeedback }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-8">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Overall Score
        </h2>
        <LargeStarRating score={feedback.overallScore} />
        <p className="text-foreground/80 mt-4 leading-relaxed">{feedback.summary}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Component Scores
        </h2>
        <div className="space-y-4">
          <ScoreBar score={feedback.aggregateScores.correctness} label="Correctness" />
          <ScoreBar score={feedback.aggregateScores.depth} label="Depth" />
          <ScoreBar score={feedback.aggregateScores.communication} label="Communication" />
        </div>
      </div>

      {feedback.questionScores && feedback.questionScores.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Question-by-Question
          </h2>
          <div className="space-y-4">
            {feedback.questionScores.map((qs, i) => (
              <div
                key={qs.questionId}
                className="rounded-lg border border-border/60 bg-muted/20 p-4"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="text-foreground text-sm font-medium flex-1">
                    Q{i + 1}: {qs.questionText}
                  </p>
                  <CategoryBadge category={qs.category} />
                </div>
                {qs.userResponse && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Your Response</p>
                    <p className="text-sm text-foreground/80 bg-muted/30 rounded-md px-3 py-2">
                      {qs.userResponse}
                    </p>
                  </div>
                )}
                {qs.expectedAnswer && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Expected Answer
                    </p>
                    <p className="text-sm text-muted-foreground bg-muted/20 rounded-md px-3 py-2">
                      {qs.expectedAnswer}
                    </p>
                  </div>
                )}
                {qs.rationale && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Rationale</p>
                    <p className="text-sm italic text-muted-foreground">{qs.rationale}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Correctness</p>
                    <p className="text-sm font-semibold text-foreground">
                      {qs.scores.correctness}/5
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Depth</p>
                    <p className="text-sm font-semibold text-foreground">{qs.scores.depth}/5</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Communication</p>
                    <p className="text-sm font-semibold text-foreground">
                      {qs.scores.communication}/5
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Overall:</span>
                  <span className="text-sm font-medium text-accent">
                    {qs.overallScore.toFixed(1)}/5
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <StrengthsImprovements feedback={feedback} />
    </div>
  );
}

/** Legacy format: category scores + question feedback */
function LegacyFeedbackDisplay({ feedback }: { feedback: InterviewFeedback }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-8">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Overall Score
        </h2>
        <LargeStarRating score={feedback.overallScore} />
        <p className="text-foreground/80 mt-4 leading-relaxed">{feedback.summary}</p>
      </div>

      {feedback.categories && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedback.categories.map((cat) => (
            <div key={cat.name} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-foreground font-semibold text-sm">{cat.name}</h3>
                <span className="text-accent font-bold text-sm">{cat.score}/5</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${(cat.score / 5) * 100}%` }}
                />
              </div>
              <p className="text-muted-foreground text-sm mt-3 leading-relaxed">{cat.feedback}</p>
            </div>
          ))}
        </div>
      )}

      {feedback.questionFeedback && feedback.questionFeedback.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Question-by-Question
          </h2>
          <div className="space-y-4">
            {feedback.questionFeedback.map((qf, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="text-foreground text-sm font-medium flex-1">
                    Q{i + 1}: {qf.question}
                  </p>
                  <StarRating score={qf.score} />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{qf.assessment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <StrengthsImprovements feedback={feedback} />
    </div>
  );
}

const RECOMMENDATION_CONFIG = {
  hire: {
    icon: UserCheck,
    label: "Hire",
    bg: "bg-accent/10",
    text: "text-accent",
    border: "border-accent/30",
    description:
      "Candidate demonstrates strong soft skills and cultural alignment. Recommended to proceed.",
  },
  consider: {
    icon: Award,
    label: "Consider",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    description: "Candidate shows potential but has some concerns. May need further evaluation.",
  },
  reject: {
    icon: XCircle,
    label: "Reject",
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    description: "Candidate does not meet the requirements for this position at this time.",
  },
};

/** HR Interview format */
function HRFeedbackDisplay({ feedback }: { feedback: InterviewFeedback }) {
  const hrEval = feedback.hrEvaluation!;
  const recConfig = RECOMMENDATION_CONFIG[hrEval.recommendation];
  const RecIcon = recConfig.icon;

  return (
    <div className="space-y-6">
      <div className={cn("rounded-2xl border p-6", recConfig.border, recConfig.bg)}>
        <div className="flex items-center gap-4">
          <div className={cn("rounded-full p-3", recConfig.bg)}>
            <RecIcon size={32} className={recConfig.text} />
          </div>
          <div className="flex-1">
            <h2 className={cn("text-2xl font-bold", recConfig.text)}>{recConfig.label}</h2>
            <p className="text-foreground/70 text-sm mt-1">{recConfig.description}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Overall Score</p>
            <p className={cn("text-3xl font-bold", recConfig.text)}>
              {feedback.overallScore.toFixed(1)}/5
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Executive Summary
        </h2>
        <p className="text-foreground/80 leading-relaxed">{feedback.summary}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          HR Evaluation Scores
        </h2>
        <div className="space-y-4">
          <ScoreBar score={hrEval.communication} label="Communication" />
          <ScoreBar score={hrEval.culturalFit} label="Cultural Fit" />
          <ScoreBar score={hrEval.confidence} label="Confidence" />
          <ScoreBar score={hrEval.clarity} label="Clarity" />
          <ScoreBar score={hrEval.overallSuitability} label="Overall Suitability" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Detailed Assessment
        </h2>
        <div className="text-foreground/80 leading-relaxed whitespace-pre-line">
          {hrEval.structuredFeedback}
        </div>
      </div>

      <StrengthsImprovements feedback={feedback} />
    </div>
  );
}

export default function FeedbackDisplay({ feedback }: { feedback: InterviewFeedback }) {
  if (feedback.hrEvaluation) {
    return <HRFeedbackDisplay feedback={feedback} />;
  }
  const isNewFormat = !!feedback.aggregateScores && Array.isArray(feedback.questionScores);
  if (isNewFormat) {
    return <NewFeedbackDisplay feedback={feedback} />;
  }
  return <LegacyFeedbackDisplay feedback={feedback} />;
}
