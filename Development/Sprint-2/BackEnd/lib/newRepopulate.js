// lib/newRepopulate.js  (fixed)
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import Question from '../models/Question.js'; // <- adjust path if needed
import { config } from 'dotenv';

config({ path: '../back.env' });

// --- Helper utilities ---
const safeStr = v => (v === undefined || v === null) ? '' : String(v);

function wordCount(text) {
  if (!text) return 0;
  return (String(text).trim().match(/\S+/g) || []).length;
}

function extractAcronyms(text) {
  if (!text) return [];
  const m = String(text).match(/\b[A-Z]{2,}\b/g);
  return m ? Array.from(new Set(m)) : [];
}

function normalizeRange(value, min, max) {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

function safeLogNorm(value, cap, base = 10) {
  const num = Math.log10(1 + Math.max(0, Number(value) || 0));
  const den = Math.log10(1 + Math.max(1, cap));
  return den === 0 ? 0 : Math.min(1, num / den);
}

function automationScoreToDifficulty(score) {
  if (score <= 0.18) return 1;
  if (score <= 0.36) return 2;
  if (score <= 0.62) return 3;
  if (score <= 0.82) return 4;
  return 5;
}

function computeDifficultyMetadata(item) {
  // fallbacks based on your sample JSON
  const questionText = safeStr(item.question_text || item.question_title || item.question || '');
  const answerText = safeStr(item.answer_text || item.answer || '');
  const tags = Array.isArray(item.question_tags) ? item.question_tags
              : Array.isArray(item.tags) ? item.tags
              : (item.question_tags ? String(item.question_tags).split(',') : []);

  const questionScore = Number(item.question_score ?? item.score ?? 0);
  const answerScore = Number(item.answer_score ?? item.answer_upvotes ?? 0);
  // your sample contains answer_word_count
  const answerWordCount = Number(item.answer_word_count ?? wordCount(answerText));

  // 1) answer_length_norm (0..1)
  let answer_length_norm = 0;
  if (answerWordCount > 300) answer_length_norm = 1.0;
  else if (answerWordCount >= 150) answer_length_norm = 0.5;
  else answer_length_norm = 0.0;

  // 2) concept_count_norm
  const acronyms = extractAcronyms(questionText + ' ' + answerText);
  const tagSet = new Set((tags || []).map(t => String(t).toLowerCase().trim()).filter(Boolean));
  // define concept count with consistent variable name
  const concept_candidates_count = tagSet.size + acronyms.length;
  let concept_count_norm = 0;
  if (concept_candidates_count <= 0) concept_count_norm = 0;
  else if (concept_candidates_count <= 2) concept_count_norm = 0.33;
  else if (concept_candidates_count <= 4) concept_count_norm = 0.66;
  else concept_count_norm = 1.0;

  // 3) abstraction_flag
  const abstractionKeywords = [
    'design', 'architecture', 'architectural', 'scale', 'scalability',
    'tradeoff', 'trade-off', 'tradeoffs', 'performance', 'patterns',
    'best practice', 'best-practice', 'complexity', 'latency', 'throughput'
  ];
  const low = (questionText + ' ' + safeStr(item.question_title || '')).toLowerCase();
  const abstraction_flag = abstractionKeywords.some(k => low.includes(k)) ? 1.0 : 0.0;

  // 4) community_norm
  const q_norm = safeLogNorm(questionScore, 500);
  const a_norm = safeLogNorm(answerScore, 500);
  const v_norm = safeLogNorm(Number(item.question_view_count ?? item.view_count ?? 0), 1_000_000);
  const community_norm = (0.4 * q_norm) + (0.4 * a_norm) + (0.2 * v_norm);

  // 5) answer_variance_norm
  const rawAnswerVariance = Number(item.answer_variance ?? item.distinct_answers_count ?? item.num_answers ?? 0);
  let answer_variance_norm = 0;
  if (rawAnswerVariance <= 0) answer_variance_norm = 0;
  else if (rawAnswerVariance === 1) answer_variance_norm = 0.2;
  else if (rawAnswerVariance === 2) answer_variance_norm = 0.4;
  else if (rawAnswerVariance === 3) answer_variance_norm = 0.6;
  else answer_variance_norm = 1.0;

  // weights
  const weights = {
    answer_length: 0.30,
    concept_count: 0.25,
    abstraction_flag: 0.20,
    community: 0.15,
    answer_variance: 0.10
  };

  const automation_score =
    weights.answer_length * answer_length_norm +
    weights.concept_count * concept_count_norm +
    weights.abstraction_flag * abstraction_flag +
    weights.community * community_norm +
    weights.answer_variance * answer_variance_norm;

  const score_clamped = Math.max(0, Math.min(1, automation_score));
  const difficulty_int = automationScoreToDifficulty(score_clamped);

  return {
    difficulty_int,
    difficulty_score_raw: Number(score_clamped.toFixed(4)),
    difficulty_source: 'auto',
    difficulty_metadata: {
      answer_word_count: answerWordCount,
      answer_length_norm: Number(answer_length_norm.toFixed(3)),
      concept_candidates_count,
      concept_count_norm: Number(concept_count_norm.toFixed(3)),
      acronyms_found: acronyms,
      abstraction_flag,
      community_norm: Number(community_norm.toFixed(4)),
      component_norms: {
        q_norm: Number(q_norm.toFixed(4)),
        a_norm: Number(a_norm.toFixed(4)),
        v_norm: Number(v_norm.toFixed(4))
      },
      answer_variance_raw: rawAnswerVariance,
      answer_variance_norm: Number(answer_variance_norm.toFixed(3)),
      weights
    }
  };
}

// --- Main import flow (same as before) ---
async function main() {
  const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGO;
  if (!MONGO) {
    console.error('Missing MONGO_URL in env (back.env). Aborting.');
    process.exit(1);
  }

  await mongoose.connect(MONGO, {});

  try {
    console.log('Connected to MongoDB');

    const del = await Question.deleteMany({});
    console.log(`Deleted ${del.deletedCount} documents from Question collection.`);

    const filePath = path.join(process.cwd(), '../paraphrased_qas.json');
    console.log('Reading import file:', filePath);
    const raw = await fs.readFile(filePath, 'utf8');
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) {
      throw new Error('paraphrased_qas.json is not an array');
    }
    console.log(`Found ${items.length} items to import.`);

    const ops = items.map(it => {
      const qidRaw = (it.question_id !== undefined && it.question_id !== null) ? it.question_id : null;
      const qid = qidRaw !== null ? String(qidRaw) : null;
      const filter = qid ? { question_id: qid } : { question_text: String(it.question_text || it.question || '') };

      const diff = computeDifficultyMetadata(it);

      const updateSet = {
        question_id: qid,
        question_title: it.question_title || it.title || '',
        question_text: it.question_text || it.question || '',
        answer_text: it.answer_text || it.answer || '',
        tags: Array.isArray(it.question_tags) ? it.question_tags : (Array.isArray(it.tags) ? it.tags : []),
        rank_value: it.rank_value ?? it.rank_value ?? 0,
        difficulty_score: diff.difficulty_int
      };

      const update = {
        $set: updateSet,
        $setOnInsert: { createdAt: new Date() }
      };

      return { updateOne: { filter, update, upsert: true } };
    });

    if (ops.length === 0) {
      console.log('No operations to run. Exiting.');
      await mongoose.disconnect();
      return;
    }

    const res = await Question.bulkWrite(ops, { ordered: false });
    console.log('BulkWrite result:', {
      upserted: res.upsertedCount ?? 0,
    });

    console.log('Reimport + difficulty tagging finished successfully.');
  } catch (err) {
    console.error('Error during import:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
