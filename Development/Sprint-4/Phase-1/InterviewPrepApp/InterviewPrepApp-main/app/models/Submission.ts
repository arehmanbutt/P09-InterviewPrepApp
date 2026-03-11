import mongoose, { Document, Schema, Model } from "mongoose";

export interface ISubmission extends Document {
  userId: string;
  problemId: string;
  language: string;
  code: string;
  status: "accepted" | "wrong_answer" | "error";
  testsPassed: number;
  testsTotal: number;
  runtime: string;
  createdAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    userId: { type: String, required: true },
    problemId: { type: String, required: true },
    language: { type: String, required: true },
    code: { type: String, required: true },
    status: {
      type: String,
      enum: ["accepted", "wrong_answer", "error"],
      required: true,
    },
    testsPassed: { type: Number, default: 0 },
    testsTotal: { type: Number, default: 0 },
    runtime: { type: String, default: "N/A" },
  },
  { timestamps: true },
);

SubmissionSchema.index({ userId: 1, problemId: 1, createdAt: -1 });

const Submission: Model<ISubmission> =
  (mongoose.models.Submission as Model<ISubmission>) ||
  mongoose.model<ISubmission>("Submission", SubmissionSchema);

export default Submission;
