import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";
import type { IPoolQuestion } from "app/lib/types";
import type { ResumeData } from "app/lib/resumeParser";

export interface IQuestion {
  text: string;
  topic: string;
}

export interface TranscriptEntry {
  role: "user" | "assistant";
  content: string;
}

export interface InterviewFeedback {
  overallScore: number;
  summary: string;
  aggregateScores: {
    correctness: number;
    depth: number;
    communication: number;
  };
  questionScores: Array<{
    questionId: string;
    questionText: string;
    scores: { correctness: number; depth: number; communication: number };
    overallScore: number;
    category: string;
    rationale?: string;
    userResponse?: string;
    expectedAnswer?: string;
  }>;
  strengths: string[];
  improvements: string[];
  // HR-specific feedback fields
  hrEvaluation?: {
    communication: number;
    culturalFit: number;
    confidence: number;
    clarity: number;
    overallSuitability: number;
    recommendation: "hire" | "consider" | "reject";
    structuredFeedback: string;
  };
  // Legacy fields for backwards compatibility with old interviews
  categories?: Array<{
    name: string;
    score: number;
    feedback: string;
  }>;
  questionFeedback?: Array<{
    question: string;
    score: number;
    assessment: string;
  }>;
}

export interface IInterview extends Document {
  userId: string;
  title: string;
  company: string;
  description: string;
  questions: IQuestion[];
  jobLevel: string | null;
  interviewType: "technical" | "hr";
  status: "scheduled" | "in-progress" | "completed";
  // Candidate resume data (optional)
  resumeData: ResumeData | null;
  // Adaptive interview state
  questionPool: IPoolQuestion[];
  samplingPlan: number[];
  currentQuestionId: string | null;
  currentQuestionText: string;
  currentExpectedAnswer: string;
  questionsAsked: number;
  totalQuestions: number;
  currentPlanIndex: number;
  // Feedback
  transcript: TranscriptEntry[];
  feedback: InterviewFeedback | null;
  // Mass interview
  isMassInterview: boolean;
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    text: { type: String, required: true },
    topic: { type: String, required: true },
  },
  { _id: false },
);

const interviewSchema = new Schema<IInterview>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    company: { type: String, required: true },
    description: { type: String, required: true },
    jobLevel: {
      type: String,
      enum: ["associate", "junior", "mid", "senior", "lead"],
      default: null,
    },
    interviewType: {
      type: String,
      enum: ["technical", "hr"],
      default: "technical",
    },
    questions: { type: [questionSchema], default: [] },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed"],
      default: "scheduled",
    },
    // Candidate resume data
    resumeData: { type: Schema.Types.Mixed, default: null },
    // Adaptive interview state
    questionPool: { type: Schema.Types.Mixed, default: [] },
    samplingPlan: { type: [Number], default: [] },
    currentQuestionId: { type: String, default: null },
    currentQuestionText: { type: String, default: "" },
    currentExpectedAnswer: { type: String, default: "" },
    questionsAsked: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    currentPlanIndex: { type: Number, default: 0 },
    // Feedback
    transcript: { type: Schema.Types.Mixed, default: [] },
    feedback: { type: Schema.Types.Mixed, default: null },
    // Mass interview
    isMassInterview: { type: Boolean, default: false },
    shareToken: { type: String },
  },
  { timestamps: true },
);

interviewSchema.index({ userId: 1, createdAt: -1 });
interviewSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

const Interview =
  (mongoose.models.Interview as mongoose.Model<IInterview>) ||
  mongoose.model<IInterview>("Interview", interviewSchema);

export default Interview;
