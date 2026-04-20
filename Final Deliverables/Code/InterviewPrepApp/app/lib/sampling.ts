/**
 * Adaptive sampling logic for interview question selection.
 * Client-compatible — no server-only imports.
 */

import type {
  AdaptiveState,
  AdaptiveResult,
  LlmAnalysis,
  IPoolQuestion,
  JobLevel,
  ScoreCategory,
  QuestionScore,
} from "./types";
import { rankCandidates } from "./scoring";

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = temp;
  }
}

const LEVEL_DISTRIBUTIONS: Record<JobLevel, number[]> = {
  associate: [0.6, 0.3, 0.08, 0.02, 0.0],
  junior: [0.4, 0.35, 0.2, 0.04, 0.01],
  mid: [0.2, 0.35, 0.3, 0.12, 0.03],
  senior: [0.1, 0.2, 0.35, 0.25, 0.1],
  lead: [0.05, 0.1, 0.25, 0.35, 0.25],
};

export function buildSamplingPlan(totalQuestions: number, jobLevel?: JobLevel | null): number[] {
  const distribution = LEVEL_DISTRIBUTIONS[jobLevel || "mid"];
  const raw = distribution.map((p) => p * totalQuestions);
  const counts = raw.map((v) => Math.floor(v));
  const assigned = counts.reduce((a, b) => a + b, 0);

  const remaining = totalQuestions - assigned;
  if (remaining > 0) {
    const fractions = raw
      .map((v, i) => ({ idx: i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac);
    for (let i = 0; i < remaining; i++) {
      const frac = fractions[i % fractions.length]!;
      counts[frac.idx]!++;
    }
  }

  const plan: number[] = [];
  for (let i = 0; i < counts.length; i++) {
    const difficulty = i + 1;
    for (let j = 0; j < (counts[i] ?? 0); j++) plan.push(difficulty);
  }

  shuffleInPlace(plan);
  return plan.slice(0, totalQuestions);
}

// ---- Score Helpers ----

export function computeWeightedOverall(scores: {
  correctness: number;
  depth: number;
  communication: number;
}): number {
  return scores.correctness * 0.75 + scores.depth * 0.15 + scores.communication * 0.1;
}

export function getScoreCategory(overall: number): ScoreCategory {
  if (overall < 1.5) return "very_low";
  if (overall < 3.0) return "borderline";
  if (overall < 4.0) return "acceptable";
  return "strong";
}

// ---- Bucket Helpers ----

export function bucketByDifficulty(pool: IPoolQuestion[]): Record<number, IPoolQuestion[]> {
  const buckets: Record<number, IPoolQuestion[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const q of pool) {
    const d = Math.max(1, Math.min(5, Math.round(q.difficulty_score)));
    buckets[d]!.push(q);
  }
  return buckets;
}

export function findNearestAvailableBucket(
  buckets: Record<number, IPoolQuestion[]>,
  target: number,
): number | null {
  // Search outward from target: target, target-1, target+1, target-2, target+2, ...
  for (let offset = 0; offset <= 4; offset++) {
    const lower = target - offset;
    const upper = target + offset;
    if (lower >= 1 && buckets[lower] && buckets[lower]!.length > 0) return lower;
    if (upper <= 5 && buckets[upper] && buckets[upper]!.length > 0) return upper;
  }
  return null;
}

function buildClarificationPrompt(analysis: LlmAnalysis): string {
  const topicHint =
    analysis.suggested_topics.length > 0
      ? ` Focus on: ${analysis.suggested_topics.join(", ")}.`
      : "";
  return `The candidate's answer was partially correct but vague. Ask them to elaborate or clarify their response.${topicHint} Summarize what they said so far: "${analysis.user_response_summary}"`;
}

/**
 * Select the next question based on the LLM's analysis.
 * Mutates state.buckets in place (removes selected question).
 * Manages plan index advancement based on score category.
 */
export function selectNextQuestion(state: AdaptiveState, analysis: LlmAnalysis): AdaptiveResult {
  // 1. Record scores for the just-answered question (skip for the very first call)
  let category: ScoreCategory = "acceptable";
  if (state.currentQuestionId) {
    const overall = computeWeightedOverall(analysis.scores);
    category = getScoreCategory(overall);

    const questionScore: QuestionScore = {
      questionId: state.currentQuestionId,
      questionText: state.currentQuestionText,
      scores: { ...analysis.scores },
      overallScore: overall,
      category,
      rationale: analysis.rationale || "",
      userResponse: analysis.user_response_summary,
      expectedAnswer: state.currentExpectedAnswer,
    };
    state.questionScores.push(questionScore);
  }

  // 2. BORDERLINE + CLARIFY → follow-up (if not already used for this question)
  if (
    category === "borderline" &&
    analysis.next_action === "clarify" &&
    !state.followupUsedForCurrentQuestion
  ) {
    state.followupUsedForCurrentQuestion = true;
    return { action: "followup", clarificationPrompt: buildClarificationPrompt(analysis) };
  }

  // 3. Reset followup flag (moving to a new question)
  state.followupUsedForCurrentQuestion = false;

  // 4. Check if done
  const totalBucketSize = Object.values(state.buckets).reduce((sum, b) => sum + b.length, 0);
  if (state.questionsAsked >= state.totalQuestions || totalBucketSize === 0) {
    return { action: "end" };
  }

  // 5. Determine target difficulty
  const planIdx = Math.min(state.currentPlanIndex, state.samplingPlan.length - 1);
  const baseDifficulty = state.samplingPlan[planIdx] ?? 3;
  let targetDifficulty: number;

  if (!state.currentQuestionId) {
    // First question — use plan directly
    targetDifficulty = baseDifficulty;
    state.currentPlanIndex = Math.min(state.currentPlanIndex + 1, state.samplingPlan.length);
  } else if (category === "very_low") {
    targetDifficulty = Math.max(1, baseDifficulty - 1);
    // Do NOT advance plan
  } else if (category === "strong") {
    targetDifficulty = Math.min(5, baseDifficulty + 1);
    state.currentPlanIndex = Math.min(state.currentPlanIndex + 1, state.samplingPlan.length);
  } else {
    // acceptable or borderline (after follow-up)
    targetDifficulty = baseDifficulty;
    state.currentPlanIndex = Math.min(state.currentPlanIndex + 1, state.samplingPlan.length);
  }

  // 6. Find questions in target bucket; if empty, find nearest
  const bucketKey = findNearestAvailableBucket(state.buckets, targetDifficulty);
  if (bucketKey === null) {
    return { action: "end" };
  }

  const bucket = state.buckets[bucketKey]!;

  // 7. Within the bucket, rank by topic relevance + diversity
  let searchTopics = analysis.suggested_topics;
  if (analysis.next_action === "go_deeper" && searchTopics.length === 0) {
    searchTopics = state.currentQuestionTags;
  }

  const ranked = rankCandidates(bucket, searchTopics, targetDifficulty);

  const recentTopics = new Set((state.topicsAsked ?? []).slice(-3).map((t) => t.toLowerCase()));
  const REPEAT_PENALTY = 0.15;
  const JITTER_MAX = 0.05;

  const diversified = ranked.map((c) => {
    const primaryTag = (c.question.tags[0] ?? "").toLowerCase();
    const penalty = primaryTag && recentTopics.has(primaryTag) ? REPEAT_PENALTY : 0;
    return {
      ...c,
      adjustedScore: c.totalScore - penalty + Math.random() * JITTER_MAX,
    };
  });
  diversified.sort((a, b) => b.adjustedScore - a.adjustedScore);

  // 8. Pick the best-ranked question
  let selected = diversified[0]?.question ?? null;

  // Fallback: if no topic match, pick by difficulty distance with randomization
  if (!selected || (searchTopics.length > 0 && (diversified[0]?.topicScore ?? 0) === 0)) {
    const byDifficulty = [...bucket].map((q) => ({
      q,
      dist: Math.abs(q.difficulty_score - targetDifficulty),
    }));
    byDifficulty.sort((a, b) => a.dist - b.dist);
    const minDist = byDifficulty[0]?.dist ?? Infinity;
    const tied = byDifficulty.filter((x) => x.dist === minDist);
    selected = tied[Math.floor(Math.random() * tied.length)]?.q ?? null;
  }

  if (!selected) {
    return { action: "end" };
  }

  // Remove selected question from its bucket
  const idx = bucket.findIndex((q) => q.question_id === selected!.question_id);
  if (idx !== -1) {
    bucket.splice(idx, 1);
  }

  // 9. Track topic for diversity
  const primaryTopic = (selected.tags[0] ?? "").toLowerCase();
  if (primaryTopic) {
    if (!state.topicsAsked) state.topicsAsked = [];
    state.topicsAsked.push(primaryTopic);
  }

  // 10. Update current question state
  state.currentQuestionId = selected.question_id;
  state.currentQuestionText = selected.question_text;
  state.currentExpectedAnswer = selected.answer_text;
  state.currentQuestionTags = selected.tags;
  state.questionsAsked++;

  return { action: "ask", question: selected };
}
