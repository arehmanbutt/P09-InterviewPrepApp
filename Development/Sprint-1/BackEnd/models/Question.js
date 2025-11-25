import mongoose from 'mongoose';
const { Schema } = mongoose;

// const questionSchema = new Schema({
//   question_id: { type: Number, required: true, unique: true },
//   question_url: { type: String, required: true },
//   question_title: { type: String, required: true },
//   question_text: { type: String, required: true },
//   question_tags: { type: [String], required: true },
//   question_score: { type: Number, default: 0 },
//   question_view_count: { type: Number, default: 0 },
//   question_creation_date: { type: Number, required: true },
//   answer_id: { type: Number },
//   answer_text: { type: String },
//   answer_score: { type: Number },
//   answer_is_accepted: { type: Boolean, default: false },
//   answer_has_code: { type: Boolean, default: false },
//   answer_has_steps: { type: Boolean, default: false },
//   answer_word_count: { type: Number, default: 0 },
//   preference_answer_ok: { type: Boolean, default: false },
//   rank_key: { type: [Number], required: true },
// });

const questionSchema = new Schema({
  question_id: { type: String, default: null},
  question_title: { type: String, default: "" },
  question_text: { type: String, required: true },
  answer_text: { type: String, required: true },
  tags: { type: [String], default: [] },
  rank_value: { type: Number, default: 0, index: true }
},{ timestamps: true });

questionSchema.index({ question_id: 1 }, { unique: true, sparse: true });

questionSchema.index({ question_text: 'text', answer_text: 'text', question_title: 'text', tags: 'text' });

export default mongoose.model('Question', questionSchema);