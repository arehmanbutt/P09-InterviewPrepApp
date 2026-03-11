import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";

export interface IBankQuestion extends Document {
  question_id: string;
  question_title: string;
  question_text: string;
  answer_text: string;
  tags: string[];
  rank_value: number;
  difficulty_score: number;
}

const bankQuestionSchema = new Schema<IBankQuestion>(
  {
    question_id: { type: String, default: null },
    question_title: { type: String, default: "" },
    question_text: { type: String, required: true },
    answer_text: { type: String, required: true },
    tags: { type: [String], default: [] },
    rank_value: { type: Number, default: 0, index: true },
    difficulty_score: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true },
);

bankQuestionSchema.index({ question_id: 1 }, { unique: true, sparse: true });

bankQuestionSchema.index({
  question_text: "text",
  answer_text: "text",
  question_title: "text",
  tags: "text",
});

const Question =
  (mongoose.models.Question as mongoose.Model<IBankQuestion>) ||
  mongoose.model<IBankQuestion>("Question", bankQuestionSchema);

export default Question;
