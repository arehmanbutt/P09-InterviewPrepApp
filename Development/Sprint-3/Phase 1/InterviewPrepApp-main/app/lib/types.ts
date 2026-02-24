/**
 * Shared types for the adaptive interview system.
 * Used by both server (question selection) and client (scoring, sampling).
 * Must not import any server-only modules.
 */

export interface IPoolQuestion {
  question_id: string;
  question_title: string;
  question_text: string;
  answer_text: string;
  tags: string[];
  difficulty_score: number;
}

export type JobLevel = "associate" | "junior" | "mid" | "senior" | "lead";

export type ScoreCategory = "very_low" | "borderline" | "acceptable" | "strong";

export interface QuestionScore {
  questionId: string;
  questionText: string;
  scores: { correctness: number; depth: number; communication: number };
  overallScore: number;
  category: ScoreCategory;
  rationale: string;
  userResponse: string;
  expectedAnswer: string;
}

/** Parameters the LLM provides via function call */
export interface LlmAnalysis {
  scores: { correctness: number; depth: number; communication: number };
  next_action: "move_on" | "go_deeper" | "clarify";
  suggested_topics: string[];
  user_response_summary: string;
  rationale: string;
}

export interface AdaptiveState {
  buckets: Record<number, IPoolQuestion[]>;
  samplingPlan: number[];
  currentPlanIndex: number;
  questionsAsked: number;
  totalQuestions: number;
  currentQuestionId: string | null;
  currentQuestionText: string;
  currentExpectedAnswer: string;
  currentQuestionTags: string[];
  topicsAsked: string[];
  followupUsedForCurrentQuestion: boolean;
  questionScores: QuestionScore[];
}

export type AdaptiveResult =
  | { action: "ask"; question: IPoolQuestion }
  | { action: "followup"; clarificationPrompt: string }
  | { action: "end" };
