import { CheckCircle2, TrendingUp, Star, Award, UserCheck, XCircle } from "lucide-react";
import type { InterviewFeedback } from "app/models/Interview";

function LargeStarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={32}
          className={i < Math.round(score) ? "fill-[#3ecf8e] text-[#3ecf8e]" : "text-gray-600"}
        />
      ))}
      <span className="ml-3 text-2xl font-bold text-white">{score.toFixed(1)}</span>
      <span className="text-lg text-gray-400">/5</span>
    </div>
  );
}

function ScoreBar({ score, max = 5, label }: { score: number; max?: number; label: string }) {
  const pct = (score / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm font-medium text-[#3ecf8e]">{score.toFixed(1)}/5</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-[#3ecf8e]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  very_low: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  borderline: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  acceptable: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  strong: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" },
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
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}
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
          className={i < Math.round(score) ? "fill-[#3ecf8e] text-[#3ecf8e]" : "text-gray-600"}
        />
      ))}
      <span className="ml-2 text-sm text-gray-400">{score.toFixed(1)}/5</span>
    </div>
  );
}

/** New format: aggregate component scores + per-question breakdown */
function NewFeedbackDisplay({ feedback }: { feedback: InterviewFeedback }) {
  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Overall Score
        </h2>
        <LargeStarRating score={feedback.overallScore} />
        <p className="text-gray-300 mt-4 leading-relaxed">{feedback.summary}</p>
      </div>

      {/* Aggregate Component Scores */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Component Scores
        </h2>
        <div className="space-y-4">
          <ScoreBar score={feedback.aggregateScores.correctness} label="Correctness" />
          <ScoreBar score={feedback.aggregateScores.depth} label="Depth" />
          <ScoreBar score={feedback.aggregateScores.communication} label="Communication" />
        </div>
      </div>

      {/* Per-Question Breakdown */}
      {feedback.questionScores && feedback.questionScores.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Question-by-Question
          </h2>
          <div className="space-y-4">
            {feedback.questionScores.map((qs, i) => (
              <div
                key={qs.questionId}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="text-white text-sm font-medium flex-1">
                    Q{i + 1}: {qs.questionText}
                  </p>
                  <CategoryBadge category={qs.category} />
                </div>
                {qs.userResponse && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Your Response</p>
                    <p className="text-sm text-gray-300 bg-white/[0.03] rounded-md px-3 py-2">
                      {qs.userResponse}
                    </p>
                  </div>
                )}
                {qs.expectedAnswer && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Expected Answer</p>
                    <p className="text-sm text-gray-400 bg-white/[0.02] rounded-md px-3 py-2">
                      {qs.expectedAnswer}
                    </p>
                  </div>
                )}
                {qs.rationale && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Rationale</p>
                    <p className="text-sm italic text-gray-400">{qs.rationale}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Correctness</p>
                    <p className="text-sm font-semibold text-white">{qs.scores.correctness}/5</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Depth</p>
                    <p className="text-sm font-semibold text-white">{qs.scores.depth}/5</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Communication</p>
                    <p className="text-sm font-semibold text-white">{qs.scores.communication}/5</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Overall:</span>
                  <span className="text-sm font-medium text-[#3ecf8e]">
                    {qs.overallScore.toFixed(1)}/5
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
          <h2 className="text-sm font-medium text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} />
            Strengths
          </h2>
          <ul className="space-y-2">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-green-400 mt-0.5 shrink-0">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp size={16} />
            Areas for Improvement
          </h2>
          <ul className="space-y-2">
            {feedback.improvements.map((imp, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-amber-400 mt-0.5 shrink-0">&uarr;</span>
                {imp}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Legacy format: category scores + question feedback (for old interviews) */
function LegacyFeedbackDisplay({ feedback }: { feedback: InterviewFeedback }) {
  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Overall Score
        </h2>
        <LargeStarRating score={feedback.overallScore} />
        <p className="text-gray-300 mt-4 leading-relaxed">{feedback.summary}</p>
      </div>

      {/* Category Scores */}
      {feedback.categories && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedback.categories.map((cat) => (
            <div
              key={cat.name}
              className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold text-sm">{cat.name}</h3>
                <span className="text-[#3ecf8e] font-bold text-sm">{cat.score}/5</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-[#3ecf8e]"
                  style={{ width: `${(cat.score / 5) * 100}%` }}
                />
              </div>
              <p className="text-gray-400 text-sm mt-3 leading-relaxed">{cat.feedback}</p>
            </div>
          ))}
        </div>
      )}

      {/* Per-Question Feedback */}
      {feedback.questionFeedback && feedback.questionFeedback.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Question-by-Question
          </h2>
          <div className="space-y-4">
            {feedback.questionFeedback.map((qf, i) => (
              <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="text-white text-sm font-medium flex-1">
                    Q{i + 1}: {qf.question}
                  </p>
                  <StarRating score={qf.score} />
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">{qf.assessment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
          <h2 className="text-sm font-medium text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} />
            Strengths
          </h2>
          <ul className="space-y-2">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-green-400 mt-0.5 shrink-0">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp size={16} />
            Areas for Improvement
          </h2>
          <ul className="space-y-2">
            {feedback.improvements.map((imp, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-amber-400 mt-0.5 shrink-0">&uarr;</span>
                {imp}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const RECOMMENDATION_CONFIG = {
  hire: {
    icon: UserCheck,
    label: "Hire",
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
    description:
      "Candidate demonstrates strong soft skills and cultural alignment. Recommended to proceed.",
  },
  consider: {
    icon: Award,
    label: "Consider",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    description: "Candidate shows potential but has some concerns. May need further evaluation.",
  },
  reject: {
    icon: XCircle,
    label: "Reject",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
    description: "Candidate does not meet the requirements for this position at this time.",
  },
};

/** HR Interview format: HR-specific scores + recommendation */
function HRFeedbackDisplay({ feedback }: { feedback: InterviewFeedback }) {
  const hrEval = feedback.hrEvaluation!;
  const recConfig = RECOMMENDATION_CONFIG[hrEval.recommendation];
  const RecIcon = recConfig.icon;

  return (
    <div className="space-y-6">
      {/* Recommendation Banner */}
      <div className={`rounded-2xl border ${recConfig.border} ${recConfig.bg} p-6`}>
        <div className="flex items-center gap-4">
          <div className={`rounded-full p-3 ${recConfig.bg}`}>
            <RecIcon size={32} className={recConfig.text} />
          </div>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold ${recConfig.text}`}>{recConfig.label}</h2>
            <p className="text-gray-300 text-sm mt-1">{recConfig.description}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Overall Score</p>
            <p className={`text-3xl font-bold ${recConfig.text}`}>
              {feedback.overallScore.toFixed(1)}/5
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Executive Summary
        </h2>
        <p className="text-gray-300 leading-relaxed">{feedback.summary}</p>
      </div>

      {/* HR Dimension Scores */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
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

      {/* Detailed Feedback */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Detailed Assessment
        </h2>
        <div className="text-gray-300 leading-relaxed whitespace-pre-line">
          {hrEval.structuredFeedback}
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
          <h2 className="text-sm font-medium text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} />
            Strengths
          </h2>
          <ul className="space-y-2">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-green-400 mt-0.5 shrink-0">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp size={16} />
            Areas for Improvement
          </h2>
          <ul className="space-y-2">
            {feedback.improvements.map((imp, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-amber-400 mt-0.5 shrink-0">&uarr;</span>
                {imp}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackDisplay({ feedback }: { feedback: InterviewFeedback }) {
  // Detect HR format: has hrEvaluation
  if (feedback.hrEvaluation) {
    return <HRFeedbackDisplay feedback={feedback} />;
  }

  // Detect new format: has aggregateScores and questionScores
  const isNewFormat = !!feedback.aggregateScores && Array.isArray(feedback.questionScores);

  if (isNewFormat) {
    return <NewFeedbackDisplay feedback={feedback} />;
  }

  return <LegacyFeedbackDisplay feedback={feedback} />;
}
