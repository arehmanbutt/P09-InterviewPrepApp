// server/models/Interview.js
import mongoose from 'mongoose'
const { Schema } = mongoose;

const AnswerSchema = Schema({
  question_id: Number,
  question_title: String,
  question_text: String,
  audio: { filename: String, path: String, mimeType: String, size: Number }, // optional
  transcript: String,
  createdAt: { type: Date, default: Date.now },
})

const InterviewSchema = Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'scheduled' },
  date: { type: Date, default: () => new Date() },
  createdBy: { type: String },
  selectedQuestions: { type: [Number], default: [] }, // question_id array
  currentIndex: { type: Number, default: 0 },
  answers: { type: [AnswerSchema], default: [] },
}, { timestamps: true })

export default mongoose.model('Interview', InterviewSchema)
