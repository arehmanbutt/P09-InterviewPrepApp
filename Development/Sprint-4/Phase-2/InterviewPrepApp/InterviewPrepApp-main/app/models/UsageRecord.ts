import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";

export interface IUsageRecord extends Document {
  clerkId: string;
  period: string; // "2026-03" format — each month is a new document
  voiceInterviews: number;
  codingProblems: number;
  pdfReports: number;
  resumeParses: number;
  createdAt: Date;
  updatedAt: Date;
}

const usageRecordSchema = new Schema<IUsageRecord>(
  {
    clerkId: { type: String, required: true },
    period: { type: String, required: true },
    voiceInterviews: { type: Number, default: 0 },
    codingProblems: { type: Number, default: 0 },
    pdfReports: { type: Number, default: 0 },
    resumeParses: { type: Number, default: 0 },
  },
  { timestamps: true },
);

usageRecordSchema.index({ clerkId: 1, period: 1 }, { unique: true });

const UsageRecord =
  (mongoose.models.UsageRecord as mongoose.Model<IUsageRecord>) ||
  mongoose.model<IUsageRecord>("UsageRecord", usageRecordSchema);

export default UsageRecord;
