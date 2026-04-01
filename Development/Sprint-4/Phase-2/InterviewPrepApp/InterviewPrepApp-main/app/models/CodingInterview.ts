import mongoose, { Document, Schema, Model } from "mongoose";

export interface ISubmissionEntry {
  problemId: string;
  language: string;
  code: string;
  status: "accepted" | "wrong_answer" | "error" | "not_attempted";
  testsPassed: number;
  testsTotal: number;
  runtime: string;
  submittedAt: Date | null;
}

export interface ICodingInterview extends Document {
  userId: string;
  title: string;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  numProblems: number;
  timeLimit: number | null;
  tags: string[];
  status: "scheduled" | "in-progress" | "completed";
  problems: string[];
  submissions: ISubmissionEntry[];
  isMassInterview: boolean;
  shareToken: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionEntrySchema = new Schema<ISubmissionEntry>(
  {
    problemId: { type: String, required: true },
    language: { type: String, required: true },
    code: { type: String, default: "" },
    status: {
      type: String,
      enum: ["accepted", "wrong_answer", "error", "not_attempted"],
      default: "not_attempted",
    },
    testsPassed: { type: Number, default: 0 },
    testsTotal: { type: Number, default: 0 },
    runtime: { type: String, default: "N/A" },
    submittedAt: { type: Date, default: null },
  },
  { _id: false },
);

const CodingInterviewSchema = new Schema<ICodingInterview>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "mixed"],
      default: "mixed",
    },
    numProblems: { type: Number, required: true },
    timeLimit: { type: Number, default: null },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed"],
      default: "scheduled",
    },
    problems: { type: [String], default: [] },
    submissions: { type: [SubmissionEntrySchema], default: [] },
    isMassInterview: { type: Boolean, default: false },
    shareToken: { type: String, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

CodingInterviewSchema.index({ userId: 1, createdAt: -1 });
CodingInterviewSchema.index({ userId: 1, status: 1 });
CodingInterviewSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

const CodingInterview: Model<ICodingInterview> =
  (mongoose.models.CodingInterview as Model<ICodingInterview>) ||
  mongoose.model<ICodingInterview>("CodingInterview", CodingInterviewSchema);

export default CodingInterview;
