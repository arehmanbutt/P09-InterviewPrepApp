import express from "express";
import fs from "fs/promises";
import path from "path";
import Question from "../models/Question.js";
import Parameter from "../models/Parameter.js";
import Interview from "../models/Interview.js";
import { selectQuestions } from "../lib/selectQuestions.js";

const router = express.Router()

// Import JSON file into MongoDB (idempotent upserts)
router.post('/import-qas', async (req, res) => {
  try {
    // Path to your JSON file in server/data/qas.json
    const filePath = path.join(process.cwd(), 'server', 'data', 'qas.json')
    const raw = await fs.readFile(filePath, 'utf8')
    const items = JSON.parse(raw)

    if (!Array.isArray(items) && typeof items === 'object' && items !== null) {
      // If file contains single object or newline separated, coerce into array
      // (adjust based on your actual format)
      // For this example assume file contains an array
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Invalid JSON format: expected array' })
    }

    // Build bulkWrite operations to upsert by question_id
    const ops = items.map((it) => {
      const filter = { question_id: it.question_id }
      const update = { $set: it }
      return {
        updateOne: {
          filter,
          update,
          upsert: true,
        },
      }
    })

    if (ops.length === 0) {
      return res.status(204).json({ message: 'No items to import' })
    }

    const bulkResult = await Question.bulkWrite(ops, { ordered: false })
    return res.json({ ok: true, inserted: bulkResult.upsertedCount, modified: bulkResult.modifiedCount || 0 })
  } catch (err) {
    console.error('import-qas error', err)
    return res.status(500).json({ message: 'server error', error: String(err) })
  }
})

router.get('/extract-qas', async (req, res) => {
  try {
    const documents = await Question.find({}).sort({ 'rank_key.0': -1 }).lean()
    return res.json(documents)
  } catch (err) {
    console.error('extract-qas error', err)
    return res.status(500).json({ message: 'server error' })
  }
});

// router.post("/start", async (req, res) => {
//   try {
//     const { jobTitle, company, jobDescription } = req.body;

//     const interview = new Interview({ jobTitle, company, jobDescription });
//     await interview.save();

//     res
//       .status(201)
//       .json({ message: "Interview created successfully", interview });
//   } catch (error) {
//     console.error("Error saving interview:", error);
//     res.status(500).json({ message: "Failed to create interview", error });
//   }
// });

router.post('/save-parameters', async (req, res) => {
  try {
    const { jobTitle, company, jobDescription } = req.body ?? {}

    const missing = []
    if (!jobTitle || String(jobTitle).trim() === '') missing.push('jobTitle')
    if (!company || String(company).trim() === '') missing.push('company')
    if (!jobDescription || String(jobDescription).trim() === '') missing.push('jobDescription')

    if (missing.length > 0) {
      return res.status(400).json({ ok: false, message: `Missing required fields: ${missing.join(', ')}` })
    }

    const parameter = new Parameter({ jobTitle, company, jobDescription })
    await parameter.save()

    const doc = new Interview({ title: jobTitle, company, description: jobDescription })
    const selectedIds = await selectQuestions(jobTitle, jobDescription, 10)
    doc.selectedQuestions = selectedIds
    doc.currentIndex = 0
    await doc.save()

    return res.status(201).json({
      ok: true,
      message: 'Parameters set successfully',
      id: doc._id.toString(),
      parameters: parameter,
      interview: doc,
    })
  } catch (error) {
    console.error('Error saving parameters:', error)
    if (error?.name === 'ValidationError') {
      const details = Object.keys(error.errors || {}).map(k => ({ field: k, message: error.errors[k].message }))
      return res.status(400).json({ ok: false, message: 'Validation failed', details })
    }
    return res.status(500).json({ ok: false, message: 'Server error', error: String(error) })
  }
})

router.get('/:id/questions', async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id).lean()
    if (!interview) return res.status(404).json({ ok: false, message: 'Interview not found' })

    const ids = Array.isArray(interview.selectedQuestions) ? interview.selectedQuestions : []
    if (ids.length === 0) return res.json({ ok: true, questions: [] })

    const docs = await Question.find({ question_id: { $in: ids } }).lean()
    const idToDoc = new Map(docs.map(d => [d.question_id, d]))
    const ordered = ids.map(id => idToDoc.get(id)).filter(Boolean)
    return res.json({ ok: true, questions: ordered })
  } catch (err) {
    console.error('GET /:id/questions error', err)
    return res.status(500).json({ ok: false, error: String(err) })
  }
})

// router.post('/:id/finish', async (req, res) => {
//   try {
//     const interviewId = req.params.id;
//     if (!interviewId) return res.status(400).json({ ok: false, message: 'Missing interview id' });

//     const interview = await Interview.findById(interviewId);
//     if (!interview) return res.status(404).json({ ok: false, message: 'Interview not found' });

//     // Optionally append a final transcript if provided
//     const { question_id, transcript } = req.body ?? {};
//     if (question_id && transcript) {
//       interview.answers.push({
//         question_id,
//         question_title: '', 
//         question_text: '',
//         transcript,
//       });
//     }

//     interview.status = 'completed';
//     interview.currentIndex = (interview.selectedQuestions?.length) ?? interview.currentIndex ?? 0;

//     await interview.save();

//     // return a safe representation
//     return res.json({
//       ok: true,
//       message: 'Interview marked as finished',
//       interview: {
//         id: interview._id.toString(),
//         status: interview.status,
//         currentIndex: interview.currentIndex,
//         selectedQuestions: interview.selectedQuestions,
//         answersCount: interview.answers?.length ?? 0,
//       },
//     });
//   } catch (err) {
//     console.error('finish interview error', err);
//     return res.status(500).json({ ok: false, message: 'Server error', error: String(err) });
//   }
// });

export default router