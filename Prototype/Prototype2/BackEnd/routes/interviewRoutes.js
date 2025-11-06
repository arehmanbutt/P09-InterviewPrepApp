import express from "express";
import fs from "fs/promises";
import path from "path";
import Question from "../models/Question.js";
import Parameter from "../models/Parameter.js";
import { selectQuestions } from "../lib/selectQuestions.js";

// const router = express.Router();

// router.get('/extract-qas', async (req, res) => {
//   try {
//     const questions = await Question.find({}).sort({ 'rank_key.0': -1 }); // Sort by rank if needed
//     res.json(questions);
//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// module.exports = router;
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

// Return all questions (sorted by rank_key[0] descending if exists)
router.get('/extract-qas', async (req, res) => {
  try {
    const documents = await Question.find({}).sort({ 'rank_key.0': -1 }).lean()
    return res.json(documents)
  } catch (err) {
    console.error('extract-qas error', err)
    return res.status(500).json({ message: 'server error' })
  }
})

router.post('/save-parameters', async (req, res) => {
  try {
    const { jobTitle, company, jobDescription } = req.body;

    const interview = new Parameter({ jobTitle, company, jobDescription });
    await interview.save();

    res
      .status(201)
      .json({ message: "Parameters set successfully", interview });
  } catch (error) {
    console.error("Error saving parameters:", error);
    res.status(500).json({ message: "Failed to set parameters", error });
  }
});
// module.exports = router
export default router
