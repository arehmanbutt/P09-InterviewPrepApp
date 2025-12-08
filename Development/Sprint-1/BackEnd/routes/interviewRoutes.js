import express from "express";
import fs from "fs/promises";
import path from "path";
<<<<<<< HEAD
=======
import { clerkClient } from '@clerk/clerk-sdk-node';
>>>>>>> e8a551a48cffd5700857244259a8f9dd7f7fe2b9
import Question from "../models/Question.js";
import Parameter from "../models/Parameter.js";
import Interview from "../models/Interview.js";
import { selectQuestions } from "../lib/selectQuestions.js";

const router = express.Router()

<<<<<<< HEAD
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
=======

/// ADDED BY HAIDER!!!!

router.get('/user/interviews', async (req, res) => {
  try {
    // === AUTH ===
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized - No token' });
    }
    const token = authHeader.split('Bearer ')[1].trim();
    const verified = await clerkClient.verifyToken(token);
    const owner = verified.sub;

    console.log('Fetching interviews for user:', owner);

    // Fetch interviews for this user
    const interviews = await Interview.find({ owner })
      .sort({ date: -1 })
      .lean();

    console.log(`Found ${interviews.length} interviews for user ${owner}`);

    return res.json({
      ok: true,
      interviews: interviews.map(interview => ({
        id: interview.interviewId,
        title: interview.parameters?.jobTitle || 'Untitled Interview',
        company: interview.parameters?.company || '',
        date: interview.date,
        status: interview.status
      }))
    });

  } catch (error) {
    console.error('Error fetching user interviews:', error);
    return res.status(500).json({ ok: false, message: 'Server error', error: error.message });
  }
});

// Get user statistics - ONLY TOTAL COUNT
router.get('/user/stats', async (req, res) => {
  try {
    // === AUTH ===
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized - No token' });
    }
    const token = authHeader.split('Bearer ')[1].trim();
    const verified = await clerkClient.verifyToken(token);
    const owner = verified.sub;

    // Fetch interviews for this user
    const interviews = await Interview.find({ owner }).lean();

    // ONLY TOTAL COUNT - nothing else
    const stats = {
      total: interviews.length
    };

    return res.json({
      ok: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({ ok: false, message: 'Server error', error: error.message });
  }
});


router.post('/import-qas', async (req, res) => {
  try {
    // Path to paraphrased_qas.json in BackEnd/
    const filePath = path.join(process.cwd(), 'paraphrased_qas.json');

    const raw = await fs.readFile(filePath, 'utf8');
    const items = JSON.parse(raw);

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Invalid JSON: expected an array' });
    }

    // Prepare upsert operations
    const ops = items.map((it) => {
      const filter =
        it.question_id !== undefined && it.question_id !== null
          ? { question_id: it.question_id }
          : { question_text: it.question_text };

      const update = {
        $set: {
          question_id: it.question_id ? String(it.question_id) : null,
          question_title: it.question_title || "",
          question_text: it.question_text,
          answer_text: it.answer_text,
          tags: it.tags || []
        },
        $setOnInsert: { createdAt: new Date() }
      };

>>>>>>> e8a551a48cffd5700857244259a8f9dd7f7fe2b9
      return {
        updateOne: {
          filter,
          update,
<<<<<<< HEAD
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
=======
          upsert: true
        }
      };
    });

    if (ops.length === 0) {
      return res.status(204).json({ message: "No items to import" });
    }

    const result = await Question.bulkWrite(ops, { ordered: false });

    console.log(`Imported QAs: inserted ${result.upsertedCount}, modified ${result.modifiedCount || 0}`);
    return res.json({
      ok: true,
      inserted: result.upsertedCount,
      modified: result.modifiedCount || 0
    });

  } catch (err) {
    console.error('import-qas error', err);
    return res.status(500).json({ message: 'server error', error: String(err) });
  }
});

router.get('/extract-qas', async (req, res) => {
  try {
    console.log(`IN extract-qas`)
    const documents = await Question.find({}).sort({ rank_value: -1 }).lean()
    console.log(`extract-qas: found ${documents.length} documents`)
>>>>>>> e8a551a48cffd5700857244259a8f9dd7f7fe2b9
    return res.json(documents)
  } catch (err) {
    console.error('extract-qas error', err)
    return res.status(500).json({ message: 'server error' })
  }
});

<<<<<<< HEAD
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
=======
router.post('/save-parameters', async (req, res) => {
  try {
    // === AUTH (unchanged - perfect) ===
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized - No token' });
    }
    const token = authHeader.split('Bearer ')[1].trim();
    const verified = await clerkClient.verifyToken(token);
    const owner = verified.sub;

    console.log('Authenticated user:', owner);

    
    // === INPUT VALIDATION ===
    const { jobTitle, company, jobDescription } = req.body ?? {};
    if (!jobTitle?.trim() || !company?.trim() || !jobDescription?.trim()) {
      return res.status(400).json({ ok: false, message: 'Missing required fields' });
    }

    // const num_questions = 10;
    const num_questions = 1;
    const selectedIds = await selectQuestions(jobTitle, jobDescription, num_questions);

    const selectedIdsRaw = selectedIds; // may be numbers or strings
    console.log('Selected IDs (raw):', selectedIdsRaw);

    // Build both string and numeric variants for robust matching
    const selectedIdsStr = selectedIdsRaw.map((id) => String(id));
    const selectedIdsNum = selectedIdsRaw
      .map((id) => {
        // convert numeric-looking strings to Number, otherwise NaN
        if (typeof id === 'number') return id;
        if (typeof id === 'string' && id.trim() !== '' && /^\d+$/.test(id.trim())) {
          return Number(id.trim());
        }
        return null;
      })
      .filter((v) => v !== null);

    // Build a $or query trying both types
    const orQueries = [];
    if (selectedIdsNum.length) {
      orQueries.push({ question_id: { $in: selectedIdsNum } });
    }
    if (selectedIdsStr.length) {
      orQueries.push({ question_id: { $in: selectedIdsStr } });
    }
    if (orQueries.length === 0) {
      console.warn('No valid selected IDs to query DB with');
    }

    // Query DB using $or so either numeric or string matches will be found
    let questionDocs = [];
    if (orQueries.length) {
      questionDocs = await Question.find({ $or: orQueries }).lean();
    }
    console.log(`Fetched ${questionDocs.length} questions from DB (robust query)`);

    // Map found IDs for quick check
    // const foundIdsSet = new Set(questionDocs.map((d) => String(d.question_id)));

    // // Detect which selected IDs were not found (as string)
    // const missing = selectedIdsStr.filter((sid) => !foundIdsSet.has(String(sid)));
    // if (missing.length) {
    //   console.warn('selectQuestions: some selected ids were not found in DB. missing count:', missing.length);
    //   console.warn('Missing IDs (string form):', missing.slice(0,50));
    // } else {
    //   console.log('selectQuestions: all selected ids were found in DB (string check).');
    // }

    // Build ordered array (preserving original order of selectedIds)
    const idToDoc = new Map(questionDocs.map((d) => [String(d.question_id), d]));

    const ordered = selectedIdsStr
      .map((qid) => idToDoc.get(qid))
      .filter(Boolean);

    console.log('Ordered questions count:', ordered.length);

    // // If ordered is less than requested, optionally append fallback top-ranked docs
    // if (ordered.length < num_questions) {
    //   const need = num_questions - ordered.length;
    //   // Exclude already included question_id values
    //   const excludeSet = new Set(ordered.map(q => String(q.question_id)));
    //   const fallback = await Question.find({
    //     question_id: { $nin: Array.from(excludeSet) }
    //   }).sort({ rank_value: -1 }).limit(need).lean();

    //   console.log(`selectQuestions: added fallback docs count: ${fallback.length}`);
    //   ordered.push(...fallback);
    // }
    const preFilledAnswers = ordered.map(q => ({
      question_id: q.question_id,                    // Already String
      question_title: q.question_title ?? '',
      question_text: q.question_text ?? '',
      answer_text: q.answer_text ?? '',
      createdAt: new Date(),
    }));

    // Save selectedQuestions as String[] — matches schema
    const interviewDoc = new Interview({
      owner,
      parameters: { jobTitle, company, jobDescription },
      selectedQuestions: selectedIdsStr,             // String[]
      answers: preFilledAnswers,
      currentIndex: 0,
      status: 'scheduled',
      date: new Date(),
    });

    await interviewDoc.save();

    return res.status(201).json({
      ok: true,
      message: 'Interview created successfully',
      interviewId: interviewDoc.interviewId,
    });

  } catch (error) {
    console.error('save-parameters error:', error);
    return res.status(500).json({ ok: false, message: 'Server error', error: error.message });
  }
});
// router.get('/:id/questions', async (req, res) => {
//   try {
//     const interview = await Interview.findById(req.params.id).lean()
//     if (!interview) return res.status(404).json({ ok: false, message: 'Interview not found' })

//     const ids = Array.isArray(interview.selectedQuestions) ? interview.selectedQuestions : []
//     if (ids.length === 0) return res.json({ ok: true, questions: [] })

//     const docs = await Question.find({ question_id: { $in: ids } }).lean()
//     const idToDoc = new Map(docs.map(d => [d.question_id, d]))
//     const ordered = ids.map(id => idToDoc.get(id)).filter(Boolean)
//     return res.json({ ok: true, questions: ordered })
//   } catch (err) {
//     console.error('GET /:id/questions error', err)
//     return res.status(500).json({ ok: false, error: String(err) })
//   }
// })
router.get('/:id/questions', async (req, res) => {
  try {
    const param = req.params.id;
    console.log(`Fetching questions for interview: ${param}`);

    let interview = await Interview.findOne({ interviewId: param }).lean();
    if (!interview) {
      interview = await Interview.findById(param).lean();
    }
    if (!interview) {
      return res.status(404).json({ ok: false, message: 'Interview not found' });
    }

    console.log('Interview found. selectedQuestions:', interview.selectedQuestions);

    // selectedQuestions is already String[] — use directly!
    const ids = (Array.isArray(interview.selectedQuestions) 
      ? interview.selectedQuestions 
      : []
    ).map(id => String(id));

    console.log('Querying DB with String IDs:', ids);

    if (ids.length === 0) {
      return res.json({ ok: true, questions: [], answersMap: {} });
    }

    const docs = await Question.find({
      question_id: { $in: ids }  // All String → perfect match
    }).lean();

    console.log(`Found ${docs.length} question docs`);

    const idToDoc = new Map(docs.map(d => [d.question_id, d]));

    const ordered = ids.map(id => {
      const doc = idToDoc.get(id);
      if (!doc) return null;
      return {
        question_id: doc.question_id,
        question_title: doc.question_title || '',
        question_text: doc.question_text || '',
      };
    }).filter(Boolean);

    const answersMap = {};
    docs.forEach(q => {
      answersMap[q.question_id] = q.answer_text ?? '';
    });

    return res.json({ ok: true, questions: ordered, answersMap });

  } catch (err) {
    console.error('GET /:id/questions error', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});
>>>>>>> e8a551a48cffd5700857244259a8f9dd7f7fe2b9

export default router