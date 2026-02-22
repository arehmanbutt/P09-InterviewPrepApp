import express from "express";
import fs from "fs/promises";
import path from "path";
import { clerkClient } from '@clerk/clerk-sdk-node';
import Question from "../models/Question.js";
import Parameter from "../models/Parameter.js";
import Interview from "../models/Interview.js";
import { selectQuestions } from "../lib/selectQuestions.js";
// add near other imports
import { prepareSamplingPlanAndBuckets, sampleQuestionsFromPlan } from '../lib/sampling.js';

const router = express.Router()


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

// router.post('/import-qas', async (req, res) => {
//   try {
//     // Path to paraphrased_qas.json in BackEnd/
//     const filePath = path.join(process.cwd(), 'paraphrased_qas.json');

//     const raw = await fs.readFile(filePath, 'utf8');
//     const items = JSON.parse(raw);

//     if (!Array.isArray(items)) {
//       return res.status(400).json({ message: 'Invalid JSON: expected an array' });
//     }

//     // Prepare upsert operations
//     const ops = items.map((it) => {
//       const filter =
//         it.question_id !== undefined && it.question_id !== null
//           ? { question_id: it.question_id }
//           : { question_text: it.question_text };

//       const update = {
//         $set: {
//           question_id: it.question_id ? String(it.question_id) : null,
//           question_title: it.question_title || "",
//           question_text: it.question_text,
//           answer_text: it.answer_text,
//           tags: it.tags || []
//         },
//         $setOnInsert: { createdAt: new Date() }
//       };

//       return {
//         updateOne: {
//           filter,
//           update,
//           upsert: true
//         }
//       };
//     });

//     if (ops.length === 0) {
//       return res.status(204).json({ message: "No items to import" });
//     }

//     const result = await Question.bulkWrite(ops, { ordered: false });

//     console.log(`Imported QAs: inserted ${result.upsertedCount}, modified ${result.modifiedCount || 0}`);
//     return res.json({
//       ok: true,
//       inserted: result.upsertedCount,
//       modified: result.modifiedCount || 0
//     });

//   } catch (err) {
//     console.error('import-qas error', err);
//     return res.status(500).json({ message: 'server error', error: String(err) });
//   }
// });
router.post('/import-qas', async (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'combined_2.json');

    const raw = await fs.readFile(filePath, 'utf8');
    const items = JSON.parse(raw);

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Invalid JSON: expected an array' });
    }

    const ops = items.map((it) => {
      const filter =
        it.question_id !== undefined && it.question_id !== null
          ? { question_id: String(it.question_id) }
          : { question_text: it.question_text };

      return {
        updateOne: {
          filter,
          update: {
            $setOnInsert: {
              question_id: it.question_id ? String(it.question_id) : null,
              question_title: it.question_title || "",
              question_text: it.question_text,
              answer_text: it.answer_text,
              tags: it.tags || [],
              rank_value: typeof it.rank_value === 'number' ? it.rank_value : 0,
              createdAt: new Date()
            }
          },
          upsert: true
        }
      };
    });

    if (ops.length === 0) {
      return res.status(204).json({ message: "No items to import" });
    }

    const result = await Question.bulkWrite(ops, { ordered: false });

    console.log(
      `Imported QAs: inserted ${result.upsertedCount}, skipped existing`
    );

    return res.json({
      ok: true,
      inserted: result.upsertedCount
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
    return res.json(documents)
  } catch (err) {
    console.error('extract-qas error', err)
    return res.status(500).json({ message: 'server error' })
  }
});

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
    const { jobTitle, jobLevel, company, jobDescription } = req.body ?? {};
    if (!jobTitle?.trim() || !jobLevel?.trim() || !company?.trim() || !jobDescription?.trim()) {
      return res.status(400).json({ ok: false, message: 'Missing required fields' });
    }

    // const num_questions = 10;
    const num_questions = 2;
    const questions_pool = num_questions * 3;
    const selectedIds = await selectQuestions(jobTitle, jobLevel, jobDescription, questions_pool);

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
      difficulty_score: q.difficulty_score || null,
      answer_text: q.answer_text ?? '',
      createdAt: new Date(),
    }));

    // Save selectedQuestions as String[] — matches schema
    const interviewDoc = new Interview({
      owner,
      parameters: { jobTitle, jobLevel, company, jobDescription },
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

router.get('/:id/questions', async (req, res) => {
  try {
    const param = req.params.id;
    console.log(`Fetching questions for interview: ${param}`);

    let interview = await Interview.findOne({ interviewId: param }).lean();
    if (!interview) interview = await Interview.findById(param).lean();
    if (!interview) return res.status(404).json({ ok: false, message: 'Interview not found' });

    console.log('Interview found. selectedQuestions:', interview.selectedQuestions);

    const jobLevel = (interview.parameters?.jobLevel || 'mid').toString().toLowerCase();

    // Query DB for docs referenced in interview.selectedQuestions (or all docs if none)
    const ids = Array.isArray(interview.selectedQuestions) ? interview.selectedQuestions.map(String) : [];
    console.log('Querying DB with String IDs:', ids);

    // If selectedQuestions is empty, fallback to fetching all docs (or return empty)
    let docs;
    if (ids.length === 0) {
      docs = await Question.find({}).sort({ rank_value: -1 }).lean();
    } else {
      docs = await Question.find({ question_id: { $in: ids } }).lean();
    }
    console.log(`Found ${docs.length} question docs`);

    // Minimal view object maker (keeps payload small)
    const makeView = (doc) => ({
      question_id: String(doc.question_id),
      question_title: doc.question_title || '',
      question_text: doc.question_text || '',
      difficulty_score: Number(doc.difficulty_score ?? 3),
    });

    // Decide totalToAsk (ensure integer >=1). Current behavior used docs.length/3; keep that but normalize.
    const totalToAsk = Math.max(1, Math.floor(docs.length / 3));

    // Use sampling helpers to prepare buckets & an adjusted feasible plan
    const { buckets: rawBuckets, plan: samplingPlan } = prepareSamplingPlanAndBuckets(docs, jobLevel, totalToAsk);

    // Convert rawBuckets (full docs) into view buckets (small objects)
    const buckets = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (let lvl = 1; lvl <= 5; lvl++) {
      const arr = Array.isArray(rawBuckets[String(lvl)]) ? rawBuckets[String(lvl)] : rawBuckets[lvl] ?? [];
      buckets[lvl] = arr.map(makeView);
    }

    // Compute targetCounts from samplingPlan (counts per difficulty)
    const targetCounts = [0,0,0,0,0]; // index 0->diff1, etc
    for (const d of samplingPlan) {
      if (d >= 1 && d <= 5) targetCounts[d-1] ++;
    }

    // Compute availability summary (how many in each bucket)
    const availability = {};
    for (let lvl = 1; lvl <= 5; lvl++) {
      availability[lvl] = { available: (buckets[lvl] || []).length, target: targetCounts[lvl-1] || 0 };
    }

    // Answers map (lightweight)
    const answersMap = {};
    docs.forEach(q => { answersMap[String(q.question_id)] = q.answer_text ?? ''; });

    // Extras: an ordered fallback list (original order); produce minimal view for fallback usage
    const ordered = docs.map(d => makeView(d)).filter(Boolean);

    console.log('Prepared sampling plan and buckets for interview questions');
    console.log('Bucket: ', buckets);
    console.log('Plan: ', samplingPlan);

    return res.json({
      ok: true,
      totalToAsk,
      jobLevel,
      samplingPlan,          // e.g. [1,2,1,3,3,...] length == totalToAsk
      targetCounts: { 1: targetCounts[0]||0, 2: targetCounts[1]||0, 3: targetCounts[2]||0, 4: targetCounts[3]||0, 5: targetCounts[4]||0 },
      availability,
      buckets,
      extras: ordered,
      answersMap
    });

  } catch (err) {
    console.error('GET /:id/questions error', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// router.get('/:id/questions', async (req, res) => {
//   try {
//     const param = req.params.id;
//     console.log(`Fetching questions for interview: ${param}`);

//     let interview = await Interview.findOne({ interviewId: param }).lean();
//     if (!interview) {
//       interview = await Interview.findById(param).lean();
//     }
//     if (!interview) {
//       return res.status(404).json({ ok: false, message: 'Interview not found' });
//     }

//     console.log('Interview found. selectedQuestions:', interview.selectedQuestions);

//     const jobLevel = interview.parameters?.jobLevel || 'mid';
    
//     const DIFF_DIST = {
//       'associate': [0.35, 0.40, 0.20, 0.05, 0.00],
//       'junior':    [0.20, 0.35, 0.30, 0.10, 0.05],
//       'mid':       [0.10, 0.20, 0.35, 0.25, 0.10],
//       'senior':    [0.05, 0.10, 0.25, 0.35, 0.25]
//     }
    
//     // selectedQuestions is already String[] — use directly!
//     const ids = (Array.isArray(interview.selectedQuestions) 
//       ? interview.selectedQuestions 
//       : []
//     ).map(id => String(id));

//     console.log('Querying DB with String IDs:', ids);

//     if (ids.length === 0) {
//       return res.json({ ok: true, questions: [], answersMap: {} });
//     }

//     const docs = await Question.find({
//       question_id: { $in: ids }  // All String → perfect match
//     }).lean();

//     console.log(`Found ${docs.length} question docs`);    

//     const idToDoc = new Map(docs.map(d => [d.question_id, d]));

//     const ordered = ids.map(id => {
//       const doc = idToDoc.get(id);
//       if (!doc) return null;
//       return {
//         question_id: doc.question_id,
//         question_title: doc.question_title || '',
//         question_text: doc.question_text || '',
//       };
//     }).filter(Boolean);

//     const answersMap = {};
//     docs.forEach(q => {
//       answersMap[q.question_id] = q.answer_text ?? '';
//     });

//     return res.json({ ok: true, questions: ordered, answersMap });

//   } catch (err) {
//     console.error('GET /:id/questions error', err);
//     return res.status(500).json({ ok: false, error: String(err) });
//   }
// });

// POST /api/interviews/:id/init-sampling
router.post('/:id/init-sampling', async (req, res) => {
  const { samplingPlan, buckets, extras } = req.body;
  await Interview.updateOne({ interviewId: req.params.id }, {
    $set: { samplingPlan, buckets, extras, currentPlanIndex: 0 }
  });
  return res.json({ ok: true });
});



export default router