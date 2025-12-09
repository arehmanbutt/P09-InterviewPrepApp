import mongoose from "mongoose";
const { Schema } = mongoose;

const questionSchema = new Schema(
  {
    question_id: { type: String, default: null },
    question_title: { type: String, default: "" },
    question_text: { type: String, required: true },
    answer_text: { type: String, required: true },
    tags: { type: [String], default: [] },
    rank_value: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

questionSchema.index({ question_id: 1 }, { unique: true, sparse: true });

questionSchema.index({
  question_text: "text",
  answer_text: "text",
  question_title: "text",
  tags: "text",
});

export default mongoose.model("Question", questionSchema);
