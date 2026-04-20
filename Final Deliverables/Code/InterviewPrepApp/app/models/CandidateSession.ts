import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";
import type { IPoolQuestion } from "app/lib/types";
import type { TranscriptEntry, InterviewFeedback } from "./Interview";

export interface ICandidateSession extends Document {
  interviewId: mongoose.Types.ObjectId;
  candidateUserId: string;
  candidateName: string;
  candidateEmail: string;
  jobLevel: string | null;
  status: "scheduled" | "in-progress" | "completed";
  // Adaptive state (copied from Interview template)
  questionPool: IPoolQuestion[];
  samplingPlan: number[];
  currentQuestionId: string | null;
  currentQuestionText: string;
  currentExpectedAnswer: string;
  questionsAsked: number;
  totalQuestions: number;
  currentPlanIndex: number;
  // Results
  transcript: TranscriptEntry[];
  feedback: InterviewFeedback | null;
  createdAt: Date;
  updatedAt: Date;
}

const candidateSessionSchema = new Schema<ICandidateSession>(
  {
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
    },
    candidateUserId: { type: String, required: true },
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, default: "" },
    jobLevel: {
      type: String,
      enum: ["associate", "junior", "mid", "senior", "lead"],
      default: null,
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed"],
      default: "scheduled",
    },
    // Adaptive state
    questionPool: { type: Schema.Types.Mixed, default: [] },
    samplingPlan: { type: [Number], default: [] },
    currentQuestionId: { type: String, default: null },
    currentQuestionText: { type: String, default: "" },
    currentExpectedAnswer: { type: String, default: "" },
    questionsAsked: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    currentPlanIndex: { type: Number, default: 0 },
    // Results
    transcript: { type: Schema.Types.Mixed, default: [] },
    feedback: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

// One attempt per candidate per interview
candidateSessionSchema.index({ interviewId: 1, candidateUserId: 1 }, { unique: true });
// Fast listing for creator's candidates page
candidateSessionSchema.index({ interviewId: 1, createdAt: -1 });

const CandidateSession =
  (mongoose.models.CandidateSession as mongoose.Model<ICandidateSession>) ||
  mongoose.model<ICandidateSession>("CandidateSession", candidateSessionSchema);

export default CandidateSession;
