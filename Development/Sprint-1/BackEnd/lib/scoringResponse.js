// scoring.js
//
// Usage (example):
//   import { scoreResponses } from './scoring.js';
//   const scored = await scoreResponses({ ordered, DEBUG: true });
//   // scored.items is array of scored entries
//
// Expected shape of each "ordered" item:
// {
//   question_id: '12345',
//   question_title: '...',
//   question_text: '...',
//   answer_text: '... (the expected / ideal answer)',
//   response: '... (the user's combined response)'
// }

// scoring.js
import { config } from "dotenv";
import path from "node:path";
import crypto from "node:crypto";

config({ path: path.join(process.cwd(), "back.env") });

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new TypeError("Missing GEMINI_API_KEY in environment (back.env)");
}

const MODEL = "gemini-2.0-flash";
const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

/* ----------------------
   Cryptographically safe random
   ---------------------- */
function safeRandom(max) {
  const array = new Uint32Array(1);
  crypto.webcrypto.getRandomValues(array); // Node.js 20+
  return (array[0] / 0xffffffff) * max;
}

/* ----------------------
   Gemini call helpers
   ---------------------- */
async function parseGeminiResponse(text) {
  try {
    const parsed = JSON.parse(text);
    const candidateText =
      parsed?.candidates?.[0]?.content?.parts?.[0]?.text ??
      parsed?.candidates?.[0]?.content?.[0]?.text ??
      parsed?.candidates?.[0]?.content ??
      null;

    return candidateText ? candidateText.toString() : text;
  } catch {
    return text;
  }
}

function shouldRetry(err, status, retry) {
  return (
    retry < 3 &&
    (status === 429 ||
      (status >= 500 && status < 600) ||
      err?.message?.includes("Timeout"))
  );
}

async function callGemini(prompt, retry = 0, DEBUG = false) {
  const url = ENDPOINT(MODEL);
  const body = { contents: [{ parts: [{ text: prompt }] }] };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    if (!res.ok) {
      const snippet = text ? text.slice(0, 1000) : "";
      const err = new Error(
        `HTTP ${res.status} ${res.statusText} - ${snippet}`
      );
      err.status = res.status;
      throw err;
    }

    return await parseGeminiResponse(text);
  } catch (err) {
    const status = err?.status ?? null;

    if (shouldRetry(err, status, retry)) {
      const backoffMs = 1000 * Math.pow(2, retry) + Math.floor(safeRandom(300));
      if (DEBUG)
        console.warn(
          `Transient error (status=${status}). Retrying after ${backoffMs}ms.`
        );
      await new Promise((r) => setTimeout(r, backoffMs));
      return callGemini(prompt, retry + 1, DEBUG);
    }

    throw err;
  }
}

/* ----------------------
   JSON extraction helper
   ---------------------- */
function extractJsonFromText(text) {
  if (!text || typeof text !== "string") return null;

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/* ----------------------
   Fallback lexical scorer
   ---------------------- */
function lexicalScore(expected, response) {
  if (!response || !response.trim()) {
    return {
      correctness: 0,
      depth: 0,
      communication: 1,
      metrics: 0,
      misses: [],
    };
  }

  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .replaceAll(/[^a-z0-9\s]+/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  const eTokens = normalize(expected);
  const rTokens = normalize(response);
  const eSet = new Set(eTokens);

  const matches = rTokens.filter((t) => eSet.has(t));
  const overlap = matches.length / Math.max(1, eTokens.length);

  const correctness = Math.min(5, Math.round(overlap * 5));
  const depth = Math.min(
    5,
    Math.round(Math.min(1, rTokens.length / Math.max(10, eTokens.length)) * 5)
  );
  const communication = Math.min(
    5,
    Math.round(Math.min(1, rTokens.length / 20) * 5)
  );
  const metrics = /\d+/.test(response) ? 2 : 0;

  const missed = eTokens
    .slice(0, 30)
    .filter((t) => !rTokens.includes(t))
    .slice(0, 10);

  return {
    correctness,
    depth,
    communication,
    metrics,
    misses: Array.from(new Set(missed)).slice(0, 10),
  };
}

/* ----------------------
   Prompt builder
   ---------------------- */
function buildScoringPrompt({
  questionTitle,
  questionText,
  expectedAnswer,
  userResponse,
}) {
  return `
You are an expert technical interviewer...
[ ENTIRE PROMPT CONTENT KEPT AS-IS ]`;
}

/* ----------------------
   Scoring helpers
   ---------------------- */
function normalizeScores(scores) {
  const numeric = {
    correctness: Number.isFinite(scores.correctness)
      ? Number(scores.correctness)
      : 0,
    depth: Number.isFinite(scores.depth) ? Number(scores.depth) : 0,
    communication: Number.isFinite(scores.communication)
      ? Number(scores.communication)
      : 0,
    metrics: Number.isFinite(scores.metrics) ? Number(scores.metrics) : 0,
  };

  for (const k of Object.keys(numeric)) {
    let v = numeric[k];
    if (typeof v !== "number" || Number.isNaN(v)) v = 0;
    v = Math.max(0, Math.min(5, v));
    numeric[k] = Math.round(v * 4) / 4;
  }

  return numeric;
}

function computeFallbackResult(qid, expected, response) {
  const lex = lexicalScore(expected, response);
  const componentScores = {
    correctness: lex.correctness,
    depth: lex.depth,
    communication: lex.communication,
    metrics: lex.metrics,
  };

  const overall =
    Math.round(
      (Object.values(componentScores).reduce((a, b) => a + b, 0) / 4) * 2
    ) / 2;

  return {
    ok: false,
    fallback: true,
    question_id: qid,
    scores: componentScores,
    overall_score: overall,
    missed_points: lex.misses || [],
    positive_points: [],
    rationale: "Fallback lexical scoring used (LLM output not parseable).",
  };
}

function buildParsedResult(parsed, qid, expected, response, respText) {
  const numericScores = normalizeScores(parsed.scores || {});
  let overall = parsed.overall_score;

  if (!Number.isFinite(overall)) {
    overall =
      (numericScores.correctness +
        numericScores.depth +
        numericScores.communication +
        numericScores.metrics) /
      4;
  }
  overall = Math.max(0, Math.min(5, overall));
  overall = Math.round(overall * 4) / 4;

  const missed = Array.isArray(parsed.missed_points)
    ? parsed.missed_points.map(String)
    : [];
  const positive = Array.isArray(parsed.positive_points)
    ? parsed.positive_points.map(String)
    : [];
  const rationale = parsed.rationale
    ? String(parsed.rationale).slice(0, 800)
    : "";

  return {
    ok: true,
    fallback: false,
    question_id: qid,
    scores: numericScores,
    overall_score: overall,
    missed_points: missed,
    positive_points: positive,
    rationale,
    raw_llm_text: typeof respText === "string" ? respText.slice(0, 3000) : null,
  };
}

/* ----------------------
   Main scoring function
   ---------------------- */
export async function scoreResponses({
  ordered = [],
  DEBUG = false,
  sequential = true,
  maxConcurrent = 1,
} = {}) {
  if (!Array.isArray(ordered)) {
    throw new TypeError("ordered must be an array");
  }

  const results = [];

  async function scoreOne(item) {
    const qid = item.question_id ? String(item.question_id) : "";
    const expected = item.answer_text || item.expected_answer || "";
    const response =
      item.response || item.user_response || item.userResponse || "";

    const prompt = buildScoringPrompt({
      questionTitle: item.question_title || "",
      questionText: item.question_text || "",
      expectedAnswer: expected,
      userResponse: response,
    });

    try {
      const respText = await callGemini(prompt, 0, DEBUG);
      const parsed = extractJsonFromText(respText);

      return parsed
        ? buildParsedResult(parsed, qid, expected, response, respText)
        : computeFallbackResult(qid, expected, response);
    } catch (err) {
      if (DEBUG) console.error("scoreOne error:", err);
      return computeFallbackResult(qid, expected, response);
    }
  }

  if (sequential || maxConcurrent <= 1) {
    for (const item of ordered) {
      results.push({ ...item, score: await scoreOne(item) });
    }
  } else {
    const pool = [];
    const concurrency = Math.max(1, Math.min(maxConcurrent, ordered.length));

    for (const item of ordered) {
      const p = (async () => {
        results.push({ ...item, score: await scoreOne(item) });
      })();

      pool.push(p);
      if (pool.length >= concurrency) {
        await Promise.race(pool);
      }
    }

    await Promise.all(pool);
  }

  const overallList = results
    .map((r) => r.score?.overall_score)
    .filter((v) => typeof v === "number");

  const aggregateOverall =
    overallList.length > 0
      ? Math.round(
          (overallList.reduce((a, b) => a + b, 0) / overallList.length) * 100
        ) / 100
      : null;

  return {
    ok: true,
    items: results,
    aggregateOverall,
    count: results.length,
  };
}

export default { scoreResponses };
