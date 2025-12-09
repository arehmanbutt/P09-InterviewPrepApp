// server/models/Interview.js
import Parameter from './Parameter.js';
import mongoose from 'mongoose'
const { Schema } = mongoose;

const AnswerSchema = Schema({
  // question: { type: Schema.Types.ObjectId, ref: 'Question' },
  question_id: String,
  question_title: String,
  question_text: String,
  answer_text: String,
  createdAt: { type: Date, default: Date.now },
})

const InterviewSchema = Schema({
  interviewId: { type: String, required: true, unique: true, default: () => new mongoose.Types.ObjectId().toString() },
  owner: { type: String, required: true, index: true },
  parameters: { type: Parameter.schema, required: true },
  // questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  answers: { type: [AnswerSchema], default: [] },
  currentIndex: { type: Number, default: 0 },
  status: { type: String, enum: ['scheduled','in-progress','completed','archived'], default: 'draft' },
  selectedQuestions: { type: [String], default: [], require: true }, 
  date: { type: Date, default: () => new Date() },
}, { timestamps: true })

export default mongoose.model('Interview', InterviewSchema)
