/**
 * Seed script — imports question bank from combined_2.json into MongoDB.
 * Uses a 5-component weighted scoring algorithm for difficulty assignment.
 *
 * Usage: npx tsx scripts/seed-questions.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import mongoose from "mongoose";

// Load .env.local manually since we're outside Next.js
function loadEnvFile(filePath: string) {
  try {
    const content = readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // file not found is ok
  }
}

loadEnvFile(join(process.cwd(), ".env.local"));

const MONGO_URL = process.env.MONGO_URL;
if (!MONGO_URL) {
  console.error("MONGO_URL not found in .env.local");
  process.exit(1);
}

// --- Difficulty scoring helpers (ported from newRepopulate.js) ---

const safeStr = (v: unknown): string => (v === undefined || v === null ? "" : String(v));

function wordCount(text: string): number {
  if (!text) return 0;
  return (String(text).trim().match(/\S+/g) || []).length;
}

function extractAcronyms(text: string): string[] {
  if (!text) return [];
  const m = String(text).match(/\b[A-Z]{2,}\b/g);
  return m ? Array.from(new Set(m)) : [];
}

function safeLogNorm(value: number, cap: number): number {
  const num = Math.log10(1 + Math.max(0, Number(value) || 0));
  const den = Math.log10(1 + Math.max(1, cap));
  return den === 0 ? 0 : Math.min(1, num / den);
}

function automationScoreToDifficulty(score: number): number {
  if (score <= 0.18) return 1;
  if (score <= 0.36) return 2;
  if (score <= 0.62) return 3;
  if (score <= 0.82) return 4;
  return 5;
}

function computeDifficultyScore(item: RawQuestion): number {
  const questionText = safeStr(item.question_text || item.question_title || "");
  const answerText = safeStr(item.answer_text || "");
  const tags: string[] = Array.isArray(item.tags) ? item.tags : [];

  const answerWordCount = wordCount(answerText);

  // 1) answer_length_norm (weight: 0.30)
  let answer_length_norm = 0;
  if (answerWordCount > 300) answer_length_norm = 1.0;
  else if (answerWordCount >= 150) answer_length_norm = 0.5;

  // 2) concept_count_norm (weight: 0.25)
  const acronyms = extractAcronyms(questionText + " " + answerText);
  const tagSet = new Set(tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean));
  const conceptCount = tagSet.size + acronyms.length;
  let concept_count_norm = 0;
  if (conceptCount <= 0) concept_count_norm = 0;
  else if (conceptCount <= 2) concept_count_norm = 0.33;
  else if (conceptCount <= 4) concept_count_norm = 0.66;
  else concept_count_norm = 1.0;

  // 3) abstraction_flag (weight: 0.20)
  const abstractionKeywords = [
    "design",
    "architecture",
    "architectural",
    "scale",
    "scalability",
    "tradeoff",
    "trade-off",
    "tradeoffs",
    "performance",
    "patterns",
    "best practice",
    "best-practice",
    "complexity",
    "latency",
    "throughput",
  ];
  const low = (questionText + " " + safeStr(item.question_title || "")).toLowerCase();
  const abstraction_flag = abstractionKeywords.some((k) => low.includes(k)) ? 1.0 : 0.0;

  // 4) community_norm (weight: 0.15) — no community data in combined_2.json
  const community_norm =
    0.4 * safeLogNorm(0, 500) + 0.4 * safeLogNorm(0, 500) + 0.2 * safeLogNorm(0, 1_000_000);

  // 5) answer_variance_norm (weight: 0.10) — no variance data in combined_2.json
  const answer_variance_norm = 0;

  const automation_score =
    0.3 * answer_length_norm +
    0.25 * concept_count_norm +
    0.2 * abstraction_flag +
    0.15 * community_norm +
    0.1 * answer_variance_norm;

  return automationScoreToDifficulty(Math.max(0, Math.min(1, automation_score)));
}

interface RawQuestion {
  question_id: string;
  question_title: string;
  question_text: string;
  answer_text: string;
  tags: string[];
  rank_value?: number;
}

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URL!);
  console.log("Connected.");

  const collection = mongoose.connection.collection("questions");

  // Clear collection for a clean repopulation
  const del = await collection.deleteMany({});
  console.log(`Deleted ${del.deletedCount} documents from Question collection.`);

  const dataPath = join(__dirname, "data", "combined_2.json");
  const raw: RawQuestion[] = JSON.parse(readFileSync(dataPath, "utf-8"));
  console.log(`Found ${raw.length} items to import.`);

  const ops = raw.map((item) => {
    const qid =
      item.question_id !== undefined && item.question_id !== null ? String(item.question_id) : null;
    const filter = qid ? { question_id: qid } : { question_text: String(item.question_text || "") };

    const difficulty = computeDifficultyScore(item);

    return {
      updateOne: {
        filter,
        update: {
          $set: {
            question_id: qid,
            question_title: item.question_title || "",
            question_text: item.question_text || "",
            answer_text: item.answer_text || "",
            tags: Array.isArray(item.tags) ? item.tags : [],
            rank_value: item.rank_value ?? 0,
            difficulty_score: difficulty,
          },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    };
  });

  if (ops.length === 0) {
    console.log("No operations to run. Exiting.");
    await mongoose.disconnect();
    return;
  }

  const res = await collection.bulkWrite(ops, { ordered: false });
  console.log("BulkWrite result:", {
    upserted: res.upsertedCount ?? 0,
  });

  // Log difficulty distribution
  const pipeline = [
    { $group: { _id: "$difficulty_score", count: { $sum: 1 } } },
    { $sort: { _id: 1 as const } },
  ];
  const dist = await collection.aggregate(pipeline).toArray();
  console.log("Difficulty distribution:", dist.map((d) => `${d._id}: ${d.count}`).join(", "));

  await mongoose.disconnect();
  console.log("Disconnected.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
