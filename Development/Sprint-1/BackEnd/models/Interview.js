// server/models/Interview.js
<<<<<<< HEAD
=======
import Parameter from './Parameter.js';
>>>>>>> e8a551a48cffd5700857244259a8f9dd7f7fe2b9
import mongoose from 'mongoose'
const { Schema } = mongoose;

const AnswerSchema = Schema({
<<<<<<< HEAD
  question_id: Number,
  question_title: String,
  question_text: String,
  audio: { filename: String, path: String, mimeType: String, size: Number }, // optional
  transcript: String,
=======
  // question: { type: Schema.Types.ObjectId, ref: 'Question' },
  question_id: String,
  question_title: String,
  question_text: String,
  answer_text: String,
>>>>>>> e8a551a48cffd5700857244259a8f9dd7f7fe2b9
  createdAt: { type: Date, default: Date.now },
})

const InterviewSchema = Schema({
<<<<<<< HEAD
  title: { type: String, required: true },
  company: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'scheduled' },
  date: { type: Date, default: () => new Date() },
  createdBy: { type: String },
  selectedQuestions: { type: [Number], default: [] }, // question_id array
  currentIndex: { type: Number, default: 0 },
  answers: { type: [AnswerSchema], default: [] },
=======
  interviewId: { type: String, required: true, unique: true, default: () => new mongoose.Types.ObjectId().toString() },
  owner: { type: String, required: true, index: true },
  parameters: { type: Parameter.schema, required: true },
  // questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  answers: { type: [AnswerSchema], default: [] },
  currentIndex: { type: Number, default: 0 },
  status: { type: String, enum: ['scheduled','in-progress','completed','archived'], default: 'draft' },
  selectedQuestions: { type: [String], default: [], require: true }, 
  date: { type: Date, default: () => new Date() },
>>>>>>> e8a551a48cffd5700857244259a8f9dd7f7fe2b9
}, { timestamps: true })

export default mongoose.model('Interview', InterviewSchema)
