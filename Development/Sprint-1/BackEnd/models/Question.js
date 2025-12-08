import mongoose from 'mongoose';
const { Schema } = mongoose;

const questionSchema = new Schema({
  question_id: { type: Number, required: true, unique: true },
  question_url: { type: String, required: true },
  question_title: { type: String, required: true },
  question_text: { type: String, required: true },
  question_tags: { type: [String], required: true },
  question_score: { type: Number, default: 0 },
  question_view_count: { type: Number, default: 0 },
  question_creation_date: { type: Number, required: true },
  answer_id: { type: Number },
  answer_text: { type: String },
  answer_score: { type: Number },
  answer_is_accepted: { type: Boolean, default: false },
  answer_has_code: { type: Boolean, default: false },
  answer_has_steps: { type: Boolean, default: false },
  answer_word_count: { type: Number, default: 0 },
  preference_answer_ok: { type: Boolean, default: false },
  rank_key: { type: [Number], required: true },
});

export default mongoose.model('Question', questionSchema);