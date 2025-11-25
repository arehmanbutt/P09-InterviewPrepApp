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

import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), "back.env") });

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment (back.env)");
}

const MODEL = "gemini-2.0-flash";
const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

/* ----------------------
   Helpers: Gemini caller
   ---------------------- */

async function callGemini(prompt, retry = 0, DEBUG = false) {
  const url = ENDPOINT(MODEL);
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    if (!res.ok) {
      const snippet = text ? text.slice(0, 1000) : "";
      const err = new Error(`HTTP ${res.status} ${res.statusText} - ${snippet}`);
      err.status = res.status;
      throw err;
    }

    // Try parse JSON-like SDK response or return raw body
    try {
      const parsed = JSON.parse(text);
      const candidateText =
        parsed?.candidates?.[0]?.content?.parts?.[0]?.text ??
        parsed?.candidates?.[0]?.content?.[0]?.text ??
        parsed?.candidates?.[0]?.content ??
        null;
      if (candidateText) return candidateText.toString();
      // fallback to returning stringified response
      return text;
    } catch (e) {
      return text;
    }
  } catch (err) {
    const status = err?.status ?? null;
    if (
      retry < 3 &&
      (status === 429 || (status >= 500 && status < 600) || err.message.includes("Timeout"))
    ) {
      const backoffMs = 1000 * Math.pow(2, retry) + Math.floor(Math.random() * 300);
      if (DEBUG) console.warn(`Transient error (status=${status}). Retrying after ${backoffMs}ms.`);
      await new Promise((r) => setTimeout(r, backoffMs));
      return callGemini(prompt, retry + 1, DEBUG);
    }
    throw err;
  }
}

function extractJsonFromText(text) {
  if (!text || typeof text !== "string") return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonText = text.slice(start, end + 1);
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    return null;
  }
}

/* ----------------------
   Fallback lexical scorer
   (used if LLM response not parseable)
   ---------------------- */

function lexicalScore(expected, response) {
  if (!response || !response.trim()) return { correctness: 0, depth: 0, communication: 1, metrics: 0 };

  const normalize = (s) =>
    (s || "").toLowerCase().replace(/[^a-z0-9\s]+/g, " ").split(/\s+/).filter(Boolean);

  const eTokens = normalize(expected);
  const rTokens = normalize(response);

  const eSet = new Set(eTokens);
  const matches = rTokens.filter((t) => eSet.has(t));
  const overlap = matches.length / Math.max(1, eTokens.length);

  const correctness = Math.min(5, Math.round(overlap * 5)); // rough
  const depth = Math.min(5, Math.round(Math.min(1, rTokens.length / Math.max(10, eTokens.length)) * 5));
  const communication = Math.min(5, Math.round(Math.min(1, rTokens.length / 20) * 5));
  const metrics = /[0-9]+/.test(response) ? 2 : 0;

  const missed = eTokens.slice(0, 30).filter((t) => !rTokens.includes(t)).slice(0, 10);
  return {
    correctness,
    depth,
    communication,
    metrics,
    misses: Array.from(new Set(missed)).slice(0, 10),
  };
}

/* ----------------------
   Main scoring: prompts Gemini to produce JSON
   ---------------------- */

function buildScoringPrompt({ questionTitle, questionText, expectedAnswer, userResponse }) {
  const q = (questionTitle ? `${questionTitle}\n` : "") + (questionText || "");
  return `
You are an expert technical interviewer and a grader. Given the INTERVIEW QUESTION, the IDEAL/EXPECTED ANSWER, and the CANDIDATE RESPONSE, produce a strict JSON object (and nothing else) that evaluates the candidate response.

Respond EXACTLY with a single JSON object with these keys:

{
  "question_id": "<string>",            // copy the question id (if available) or empty string
  "scores": {
    "correctness": <number 0-5>,        // how correct / relevant the response is
    "depth": <number 0-5>,              // how deep / detailed / technical the response is
    "communication": <number 0-5>,      // clarity / concision / organization
    "metrics": <number 0-5>             // evidence of numbers/estimations/impact when relevant
  },
  "overall_score": <number 0-5>,        // overall rating (0-5). Prefer averaging the above and rounding to nearest 0.25 or 0.5
  "missed_points": ["short bullet strings..."],  // list of specific expected concepts or phrases the candidate missed
  "positive_points": ["short bullet strings..."],// list of specific strengths found in the response (phrases/ideas)
  "rationale": "brief explanation (1-3 sentences) of why these scores were given"
}

RULES:
- Base scores on semantic content: do NOT require exact wording.
- If the candidate did not answer or answered "not sure", score low but still produce helpful missed_points.
- For missed_points, extract concise expected concepts from the IDEAL/EXPECTED ANSWER. Aim for 3-6 items where possible.
- Keep rationale short (1-3 sentences).
- Use numeric scores only (no percentages), range 0..5 inclusive. overall_score must be consistent with the component scores.
- Output ONLY the JSON object, nothing else (no preface). Ensure valid JSON.

INPUT FIELDS:
INTERVIEW QUESTION:
${q}

IDEAL/EXPECTED ANSWER:
${expectedAnswer || ""}

CANDIDATE RESPONSE:
${userResponse || ""}

Return JSON now.
`;
}

/* ----------------------
   Exported function
   ---------------------- */

export async function scoreResponses({
  ordered = [],
  DEBUG = false,
  sequential = true, // run sequentially by default to avoid rate bursts
  maxConcurrent = 1,
} = {}) {
  if (!Array.isArray(ordered)) {
    throw new Error("ordered must be an array");
  }

  const results = [];

  // processor for one item
  async function scoreOne(item) {
    const qid = item.question_id ? String(item.question_id) : "";
    const questionTitle = item.question_title || "";
    const questionText = item.question_text || "";
    const expectedAnswer = item.answer_text || item.expected_answer || "";
    const userResponse = item.response || item.user_response || item.userResponse || "";

    // Build prompt and call Gemini
    const prompt = buildScoringPrompt({ questionTitle, questionText, expectedAnswer, userResponse });

    if (DEBUG) {
      console.log("Scoring: qid=", qid, " prompt length:", prompt.length);
    }

    try {
      const respText = await callGemini(prompt, 0, DEBUG);
      if (DEBUG) console.log("Gemini response snippet:", (respText || "").slice(0, 800));

      const parsed = extractJsonFromText(respText);
      if (!parsed) {
        if (DEBUG) console.warn("Gemini did not return parseable JSON, falling back to lexical scorer.");
        // fallback: lexical scoring
        const lex = lexicalScore(expectedAnswer, userResponse);
        const componentScores = {
          correctness: lex.correctness,
          depth: lex.depth,
          communication: lex.communication,
          metrics: lex.metrics,
        };
        const overall = Math.round((Object.values(componentScores).reduce((a, b) => a + b, 0) / 4) * 2) / 2;
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

      // Ensure numeric fields exist & normalize
      const scores = parsed.scores || {};
      const numericScores = {
        correctness: Number.isFinite(scores.correctness) ? Number(scores.correctness) : 0,
        depth: Number.isFinite(scores.depth) ? Number(scores.depth) : 0,
        communication: Number.isFinite(scores.communication) ? Number(scores.communication) : 0,
        metrics: Number.isFinite(scores.metrics) ? Number(scores.metrics) : 0,
      };

      // clamp to 0..5 and round to nearest 0.25
      for (const k of Object.keys(numericScores)) {
        let v = numericScores[k];
        if (typeof v !== "number" || Number.isNaN(v)) v = 0;
        v = Math.max(0, Math.min(5, v));
        numericScores[k] = Math.round(v * 4) / 4;
      }

      let overall = parsed.overall_score;
      if (!Number.isFinite(overall)) {
        overall = (numericScores.correctness + numericScores.depth + numericScores.communication + numericScores.metrics) / 4;
      }
      overall = Math.max(0, Math.min(5, overall));
      overall = Math.round(overall * 4) / 4;

      const missed = Array.isArray(parsed.missed_points) ? parsed.missed_points.map(String) : [];
      const positive = Array.isArray(parsed.positive_points) ? parsed.positive_points.map(String) : [];
      const rationale = parsed.rationale ? String(parsed.rationale).slice(0, 800) : "";

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
    } catch (err) {
      if (DEBUG) console.error("scoreOne error:", err);
      const lex = lexicalScore(expectedAnswer, userResponse);
      const componentScores = {
        correctness: lex.correctness,
        depth: lex.depth,
        communication: lex.communication,
        metrics: lex.metrics,
      };
      const overall = Math.round((Object.values(componentScores).reduce((a, b) => a + b, 0) / 4) * 2) / 2;
      return {
        ok: false,
        fallback: true,
        question_id: qid,
        scores: componentScores,
        overall_score: overall,
        missed_points: lex.misses || [],
        positive_points: [],
        rationale: `Exception during LLM call: ${String(err).slice(0, 300)}`,
      };
    }
  }

  if (sequential || maxConcurrent <= 1) {
    for (const item of ordered) {
      const out = await scoreOne(item);
      results.push({ ...item, score: out });
    }
  } else {
    // simple concurrency pool
    const pool = [];
    const executing = [];
    const concurrency = Math.max(1, Math.min(maxConcurrent, ordered.length));
    for (const item of ordered) {
      const p = (async () => {
        const out = await scoreOne(item);
        results.push({ ...item, score: out });
      })();
      pool.push(p);
      if (pool.length >= concurrency) {
        await Promise.race(pool);
        // remove finished
        for (let i = pool.length - 1; i >= 0; i--) {
          if (pool[i].then) {
            // can't reliably check settled promise without extra lib; keep it simple:
          }
        }
      }
    }
    await Promise.all(pool);
  }

  // Aggregate: average overall (weighted by existence)
  const overallList = results
    .map((r) => r.score?.overall_score)
    .filter((v) => typeof v === "number" && !Number.isNaN(v));
  const aggregateOverall =
    overallList.length > 0 ? Math.round((overallList.reduce((a, b) => a + b, 0) / overallList.length) * 100) / 100 : null;

  return {
    ok: true,
    items: results,
    aggregateOverall,
    count: results.length,
  };
}

/* ----------------------
   Export default helpers for CommonJS/ES interop
   ---------------------- */

export default {
  scoreResponses,
};
