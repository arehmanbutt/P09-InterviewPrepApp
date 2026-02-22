// // scoring.js
// //
// // Usage (example):
// //   import { scoreResponses } from './scoring.js';
// //   const scored = await scoreResponses({ ordered, DEBUG: true });
// //   // scored.items is array of scored entries
// //
// // Expected shape of each "ordered" item:
// // {
// //   question_id: '12345',
// //   question_title: '...',
// //   question_text: '...',
// //   answer_text: '... (the expected / ideal answer)',
// //   response: '... (the user's combined response)'
// // }

// import { config } from "dotenv";
// import path from "path";
// config({ path: path.join(process.cwd(), "back.env") });

// const API_KEY = process.env.GEMINI_API_KEY;
// if (!API_KEY) {
//   throw new Error("Missing GEMINI_API_KEY in environment (back.env)");
// }

// const MODEL = "gemini-2.0-flash";
// const ENDPOINT = (model) =>
//   `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

// /* ----------------------
//    Helpers: Gemini caller
//    ---------------------- */

// async function callGemini(prompt, retry = 0, DEBUG = false) {
//   const url = ENDPOINT(MODEL);
//   const body = {
//     contents: [{ parts: [{ text: prompt }] }],
//   };

//   try {
//     const res = await fetch(url, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body),
//     });

//     const text = await res.text();
    
//     if (!res.ok) {
//       console.error(`Gemini API error: HTTP ${res.status} - ${res.statusText}`);
//       const snippet = text ? text.slice(0, 1000) : "";
//       const err = new Error(`HTTP ${res.status} ${res.statusText} - ${snippet}`);
//       err.status = res.status;
//       throw err;
//     }

//     console.log('Gemini response text:', text.slice(0, 100)); // log first 500 chars

//     // Try parse JSON-like SDK response or return raw body
//     try {
//       console.log('Attempting to parse Gemini response JSON');
//       const parsed = JSON.parse(text);
//       const candidateText =
//         parsed?.candidates?.[0]?.content?.parts?.[0]?.text ??
//         parsed?.candidates?.[0]?.content?.[0]?.text ??
//         parsed?.candidates?.[0]?.content ??
//         null;
//       if (candidateText) return candidateText.toString();
//       // fallback to returning stringified response
//       return text;
//     } catch (e) {
//       return text;
//     }
//   } catch (err) {
//     const status = err?.status ?? null;
//     if (
//       retry < 3 &&
//       (status === 429 || (status >= 500 && status < 600) || err.message.includes("Timeout"))
//     ) {
//       const backoffMs = 1000 * Math.pow(2, retry) + Math.floor(Math.random() * 300);
//       if (DEBUG) console.warn(`Transient error (status=${status}). Retrying after ${backoffMs}ms.`);
//       await new Promise((r) => setTimeout(r, backoffMs));
//       return callGemini(prompt, retry + 1, DEBUG);
//     }
//     throw err;
//   }
// }

// function extractJsonFromText(text) {
//   if (!text || typeof text !== "string") return null;
//   const start = text.indexOf("{");
//   const end = text.lastIndexOf("}");
//   if (start === -1 || end === -1 || end <= start) return null;
//   const jsonText = text.slice(start, end + 1);
//   try {
//     return JSON.parse(jsonText);
//   } catch (e) {
//     return null;
//   }
// }

// /* ----------------------
//    Fallback lexical scorer
//    (used if LLM response not parseable)
//    ---------------------- */

// // function lexicalScore(expected, response) {
// //   if (!response || !response.trim()) return { correctness: 0, depth: 0, communication: 1, metrics: 0 };

// //   const normalize = (s) =>
// //     (s || "").toLowerCase().replace(/[^a-z0-9\s]+/g, " ").split(/\s+/).filter(Boolean);

// //   const eTokens = normalize(expected);
// //   const rTokens = normalize(response);

// //   const eSet = new Set(eTokens);
// //   const matches = rTokens.filter((t) => eSet.has(t));
// //   const overlap = matches.length / Math.max(1, eTokens.length);

// //   const correctness = Math.min(5, Math.round(overlap * 5)); // rough
// //   const depth = Math.min(5, Math.round(Math.min(1, rTokens.length / Math.max(10, eTokens.length)) * 5));
// //   const communication = Math.min(5, Math.round(Math.min(1, rTokens.length / 20) * 5));
// //   const metrics = /[0-9]+/.test(response) ? 2 : 0;

// //   const missed = eTokens.slice(0, 30).filter((t) => !rTokens.includes(t)).slice(0, 10);
// //   return {
// //     correctness,
// //     depth,
// //     communication,
// //     metrics,
// //     misses: Array.from(new Set(missed)).slice(0, 10),
// //   };
// // }
// function lexicalScore(expected, response) {
//   if (!response || !response.trim()) {
//     return { correctness: 0, depth: 0, communication: 1, metrics: 0, misses: [] };
//   }

//   const normalize = (s) =>
//     (s || "")
//       .toLowerCase()
//       .replace(/[^a-z0-9\s]+/g, " ")
//       .split(/\s+/)
//       .filter(Boolean);

//   const eTokens = normalize(expected);
//   const rTokens = normalize(response);

//   const eSet = new Set(eTokens);
//   const matches = rTokens.filter((t) => eSet.has(t));
//   const overlap = matches.length / Math.max(1, eTokens.length);

//   // 🔹 technical token detection FIRST
//   const technicalMatches = matches.filter(tok => tok.length > 3);

//   // 🔹 correctness
//   let correctness = Math.min(5, Math.round(overlap * 5));

//   // boost correctness if core concepts appear (paraphrase-safe)
//   if (technicalMatches.length >= 2 && correctness < 3) {
//     correctness = 3;
//   }

//   // penalize very short answers
//   if (response.trim().length < 10) {
//     correctness = Math.min(correctness, 1);
//   }

//   // 🔹 depth
//   let depth = Math.min(
//     5,
//     Math.round((technicalMatches.length / Math.max(1, eTokens.length)) * 5)
//   );

//   // avoid depth inflation from verbosity
//   if (rTokens.length < Math.max(8, eTokens.length / 2)) {
//     depth = Math.min(depth, 3);
//   }

//   // 🔹 communication
//   const communication = Math.min(
//     5,
//     Math.round(Math.min(1, rTokens.length / 20) * 5)
//   );

//   // 🔹 metrics
//   const metrics = /[0-9]+/.test(response) ? 2 : 0;

//   const missed = eTokens
//     .slice(0, 30)
//     .filter((t) => !rTokens.includes(t))
//     .slice(0, 10);

//   return {
//     correctness,
//     depth,
//     communication,
//     metrics,
//     misses: Array.from(new Set(missed)),
//   };
// }


// /* ----------------------
//    Main scoring: prompts Gemini to produce JSON
//    ---------------------- */

// function buildScoringPrompt({ questionTitle, questionText, expectedAnswer, userResponse }) {
//   console.log('Building scoring prompt with question text: ', questionText?.slice(0, 100));
//   const q = (questionTitle ? `${questionTitle}\n` : "") + (questionText || "");
//   return `
// You are an expert technical interviewer and a grader. Given the INTERVIEW QUESTION, the IDEAL/EXPECTED ANSWER, and the CANDIDATE RESPONSE, produce a strict JSON object (and nothing else) that evaluates the candidate response.

// Respond EXACTLY with a single JSON object with these keys:

// {
//   "question_id": "<string>",            // copy the question id (if available) or empty string
//   "scores": {
//     "correctness": <number 0-5>,        // how correct / relevant the response is
//     "depth": <number 0-5>,              // how deep / detailed / technical the response is
//     "communication": <number 0-5>,      // clarity / concision / organization
//     "metrics": <number 0-5>             // evidence of numbers/estimations/impact when relevant
//   },
//   "overall_score": <number 0-5>,        // overall rating (0-5). Prefer averaging the above and rounding to nearest 0.25 or 0.5
//   "missed_points": ["short bullet strings..."],  // list of specific expected concepts or phrases the candidate missed
//   "positive_points": ["short bullet strings..."],// list of specific strengths found in the response (phrases/ideas)
//   "rationale": "brief explanation (1-3 sentences) of why these scores were given"
// }

// RULES:
// - Base scores on semantic content: do NOT require exact wording.
// - If the candidate did not answer or answered "not sure", score low but still produce helpful missed_points.
// - For missed_points, extract concise expected concepts from the IDEAL/EXPECTED ANSWER. Aim for 3-6 items where possible.
// - Keep rationale short (1-3 sentences).
// - Use numeric scores only (no percentages), range 0..5 inclusive. overall_score must be consistent with the component scores.
// - Output ONLY the JSON object, nothing else (no preface). Ensure valid JSON.

// INPUT FIELDS:
// INTERVIEW QUESTION:
// ${q}

// IDEAL/EXPECTED ANSWER:
// ${expectedAnswer || ""}

// CANDIDATE RESPONSE:
// ${userResponse || ""}

// Return JSON now.
// `;
// }

// /* ----------------------
//    Exported function
//    ---------------------- */

// export async function scoreResponses({
//   ordered = [],
//   DEBUG = false,
//   sequential = true,
//   maxConcurrent = 1,
// } = {}) {
//   if (!Array.isArray(ordered)) {
//     throw new Error("ordered must be an array");
//   }

//   const results = [];

//   function isExplicitSkipOrDontKnow(s) {
//     if (!s || typeof s !== "string") return false;
//     const t = s.trim().toLowerCase();
//     return [
//       /\b(skip|pass)\b/,
//       /\bnot sure\b/,
//       /\bdon'?t know\b/,
//       /\bno idea\b/,
//       /\bmove on\b/,
//     ].some((re) => re.test(t));
//   }

//   async function scoreOne(item) {
//     const qid = String(item.question_id ?? "");
//     const expectedAnswer = item.answer_text || item.expected_answer || "";
//     const userResponse = item.response || item.user_response || "";

//     /* ---------- HARD SHORT-CIRCUIT ---------- */
//     if (isExplicitSkipOrDontKnow(userResponse)) {
//       return {
//         ok: true,
//         fallback: false,
//         question_id: qid,
//         scores: { correctness: 0, depth: 0, communication: 1, metrics: 0 },
//         overall_score: 0,
//         missed_points: [],
//         positive_points: [],
//         rationale: "Candidate explicitly skipped or indicated no knowledge.",
//         raw_llm_text: null,
//       };
//     }

//     const prompt = buildScoringPrompt({
//       questionTitle: item.question_title,
//       questionText: item.question_text,
//       expectedAnswer,
//       userResponse,
//     });

//     try {
//       const respText = await callGemini(prompt, 0, DEBUG);
//       const parsed = extractJsonFromText(respText);

//       if (!parsed) throw new Error("Unparseable JSON");

//       const raw = parsed.scores || {};
//       const scores = {
//         correctness: clamp(raw.correctness),
//         depth: clamp(raw.depth),
//         communication: clamp(raw.communication),
//         metrics: clamp(raw.metrics),
//       };

//       const weighted5 = weightedOverall(scores);
//       return {
//         ok: true,
//         fallback: false,
//         question_id: qid,
//         scores,
//         overall_score: weighted5,
//         missed_points: parsed.missed_points || [],
//         positive_points: parsed.positive_points || [],
//         rationale: parsed.rationale || "",
//         raw_llm_text: respText?.slice(0, 3000) ?? null,
//       };

//     } catch (err) {
//       /* ---------- FALLBACK ---------- */
//       const lex = lexicalScore(expectedAnswer, userResponse);
//       const scores = {
//         correctness: lex.correctness,
//         depth: lex.depth,
//         communication: lex.communication,
//         metrics: lex.metrics,
//       };

//       let weighted5 = weightedOverall(scores);

//       // Only penalize hard failures, not semantic mismatch
//       if (lex.correctness === 0 && lex.depth === 0) {
//         weighted5 *= 0.7;
//       }

//       weighted5 = round(weighted5);

//       return {
//         ok: false,
//         fallback: true,
//         question_id: qid,
//         scores,
//         overall_score: weighted5,
//         missed_points: lex.misses || [],
//         positive_points: [],
//         rationale: `Fallback scoring used: ${String(err).slice(0, 120)}`,
//         raw_llm_text: null,
//       };
//     }
//   }

//   for (const item of ordered) {
//     const out = await scoreOne(item);
//     results.push({ ...item, score: out });
//   }

//   return {
//     ok: true,
//     items: results,
//     count: results.length,
//   };
// }

// /* ---------- HELPERS ---------- */

// function clamp(v) {
//   v = Number(v);
//   if (!Number.isFinite(v)) return 0;
//   return Math.max(0, Math.min(5, Math.round(v * 4) / 4));
// }

// function weightedOverall(scores) {
//   const W = {
//     correctness: 0.75,   // 🔼 correctness dominates
//     depth: 0.15,
//     communication: 0.10,
//     metrics: 0.0,        // metrics should NEVER tank correctness
//   };

//   let sum = 0;
//   for (const k in W) {
//     sum += W[k] * (scores[k] || 0);
//   }

//   // Guardrail: if correctness ≥ 3, overall cannot be "very low"
//   if ((scores.correctness || 0) >= 3) {
//     sum = Math.max(sum, 2.5);
//   }

//   return round(sum);
// }


// function round(v) {
//   return Math.round(v * 100) / 100;
// }

// /* ----------------------
//    Export default helpers for CommonJS/ES interop
//    ---------------------- */

// export async function scoreSingleQuestion({
//   question_id = '',
//   question_title = '',
//   question_text = '',
//   expected_answer = '',
//   user_response = '',
//   DEBUG = false,
// } = {}) {
//   try {

//     const lowerResp = (user_response || '').toLowerCase();
//     if (['not sure','don\'t know','pass','skip','move on','i don\'t know'].some(p => lowerResp.includes(p))) {
//       return { ok: true, score: 0.0, category: 'very_low', details: { overall_score_5: 0, componentScores: { correctness:0, depth:0, communication:0, metrics:0 }, rationale: 'Explicit low answer (not sure/skip)' } };
//     }
//     // Reuse your existing scoreResponses function for consistency.
//     // Build the single-item "ordered" array in the same shape scoreResponses expects.
//     const item = {
//       question_id: String(question_id ?? ''),
//       question_title: question_title ?? '',
//       question_text: question_text ?? '',
//       answer_text: expected_answer ?? '',
//       response: user_response ?? '',
//     };

//     console.log('Scoring single question with ID:', item.question_id);
//     // Run the same pipeline (sequential, single item)
//     const out = await scoreResponses({ ordered: [item], DEBUG, sequential: true });

//     // scoreResponses returns { ok: true, items: [ { ...item, score: outScore } ], ... }
//     const scoredItem = (out && Array.isArray(out.items) && out.items[0]) || null;
//     const scoreObj = scoredItem?.score || null;

//     let overall5 = null;
//     let fallback = true;
//     let componentScores = null;
//     let missed = [];
//     let positive = [];
//     let rationale = '';
//     let raw_llm_text = null;

//     if (scoreObj) {
//       overall5 = Number.isFinite(scoreObj.overall_score) ? Number(scoreObj.overall_score) : null;
//       componentScores = scoreObj.scores ?? null;
//       missed = Array.isArray(scoreObj.missed_points) ? scoreObj.missed_points : [];
//       positive = Array.isArray(scoreObj.positive_points) ? scoreObj.positive_points : [];
//       rationale = String(scoreObj.rationale ?? '');
//       raw_llm_text = scoreObj.raw_llm_text ?? null;
//       fallback = Boolean(scoreObj.fallback);
//     }

//     // If overall5 not available, set to 0 and keep fallback true
//     if (!Number.isFinite(overall5)) {
//       overall5 = 0;
//     }

//     // Map 0..5 -> 0..1
//     // const score01 = Math.max(0, Math.min(1, overall5 / 5));
//     const score5 = Number(scoreObj?.overall_score ?? 0);
//     const score01 = Math.max(0, Math.min(1, score5 / 5));
    
//     let category = 'very_low';
//     if (score01 < 0.3) category = 'very_low';
//     else if (score01 < 0.6) category = 'borderline';
//     else if (score01 < 0.8) category = 'acceptable';
//     else category = 'strong';

//     return {
//       ok: true,
//       score: Number(Math.round(score01 * 100) / 100), // two-decimal
//       category,
//       details: {
//         overall_score_5: overall5,
//         componentScores,
//         missed_points: missed,
//         positive_points: positive,
//         rationale,
//         raw_llm_text,
//         fallback,
//       },
//     };
//   } catch (err) {
//     // If something goes wrong, return a conservative "very_low" with fallback info
//     console.error('scoreSingleQuestion error:', err && (err.stack || String(err)));
//     return {
//       ok: false,
//       score: 0,
//       score5: 0,
//       category: 'very_low',
//       details: { error: String(err) },
//     };
//   }
// }

// export default {
//   scoreResponses,
//   scoreSingleQuestion,
// };
// scoring.js (manual-scoring fallback implementation)
// Replace your existing scoring.js with this file (or apply the minimal changes inside).

//-----------------------------------------------------------------------------------------------------

// import { config } from "dotenv";
// import path from "path";
// config({ path: path.join(process.cwd(), "back.env") });

// // NOTE: We intentionally do NOT require or use GEMINI_API_KEY here.
// // This file provides a deterministic manual scorer to use while LLM problems persist.

// /* ----------------------
//    Heuristic lexical scorer (primary scoring engine)
//    ---------------------- */

// function normalizeText(s = "") {
//   return (s || "")
//     .toString()
//     .toLowerCase()
//     .replace(/[`"'“”‘’]/g, "")
//     .replace(/[^a-z0-9\s]+/g, " ")
//     .split(/\s+/)
//     .filter(Boolean);
// }

// function lexicalScore(expected, response) {
//   // returns correctness, depth, communication, metrics and misses (array)
//   if (!response || !response.trim()) {
//     return { correctness: 0, depth: 0, communication: 1, metrics: 0, misses: [] };
//   }

//   const eTokens = normalizeText(expected || "");
//   const rTokens = normalizeText(response || "");

//   const eSet = new Set(eTokens);
//   const matches = rTokens.filter((t) => eSet.has(t));
//   const overlap = eTokens.length ? matches.length / eTokens.length : 0;

//   // technicalMatches = tokens likely to be domain terms (length>3 and not stopwords)
//   const technicalMatches = matches.filter((tok) => tok.length > 3);

//   // CORRECTNESS: overlap with boosting from technical matches and phrase matches
//   let correctness = Math.min(5, Math.round(overlap * 5));
//   if (technicalMatches.length >= 2 && correctness < 3) correctness = 3;

//   // If candidate mentions exact key phrases from expected answer, boost further
//   const phraseBoosters = ["react.reactnode", "reactnode", "react node", "react.reactnode"];
//   const respLower = response.toLowerCase();
//   for (const p of phraseBoosters) {
//     if (respLower.includes(p) && correctness < 4) correctness = Math.max(correctness, 4);
//   }

//   // penalize tiny answers (short explicit "not sure" handled elsewhere)
//   if (response.trim().length < 10) correctness = Math.min(correctness, 1);

//   // DEPTH: measure presence of technical tokens relative to expected tokens
//   let depth = Math.min(5, Math.round((technicalMatches.length / Math.max(1, eTokens.length)) * 5));
//   // If answer is long and contains many tokens, increase depth modestly
//   if (rTokens.length > Math.max(20, eTokens.length)) {
//     depth = Math.min(5, depth + 1);
//   }
//   // Avoid high depth for low-length responses
//   if (rTokens.length < Math.max(8, eTokens.length / 2) && depth > 3) depth = 3;

//   // COMMUNICATION: clarity/length indicator (balanced)
//   const communication = Math.min(5, Math.round(Math.min(1, rTokens.length / 20) * 5));

//   // METRICS: evidence of numbers/estimations present
//   const metrics = /\b\d+(\.\d+)?\b/.test(response) ? 2 : 0;

//   // missed points: top tokens from expected that are not in response
//   const missed = (eTokens.slice(0, 40) || []).filter((t) => !rTokens.includes(t)).slice(0, 10);

//   return {
//     correctness,
//     depth,
//     communication,
//     metrics,
//     misses: Array.from(new Set(missed)),
//   };
// }

// /* ----------------------
//    Helpers: mapping, weights, rounding
//    ---------------------- */

// function clamp(v) {
//   v = Number(v);
//   if (!Number.isFinite(v)) return 0;
//   return Math.max(0, Math.min(5, Math.round(v * 4) / 4));
// }

// function round(v) {
//   return Math.round(v * 100) / 100;
// }

// function weightedOverall(scores) {
//   const W = {
//     correctness: 0.75, // correctness dominates
//     depth: 0.15,
//     communication: 0.10,
//     metrics: 0.0,
//   };
//   let sum = 0;
//   for (const k in W) sum += W[k] * (scores[k] || 0);
//   // guardrail to avoid extremely low overall when correctness is moderate
//   if ((scores.correctness || 0) >= 3) sum = Math.max(sum, 2.5);
//   return round(sum);
// }

// /* ----------------------
//    Utility: detect explicit skips / don't know
//    ---------------------- */

// function isExplicitSkipOrDontKnow(s) {
//   if (!s || typeof s !== "string") return false;
//   const t = s.trim().toLowerCase();
//   return [
//     /\b(skip|pass)\b/,
//     /\bnot sure\b/,
//     /\bdon'?t know\b/,
//     /\bno idea\b/,
//     /\bmove on\b/,
//   ].some((re) => re.test(t));
// }

// /* ----------------------
//    scoreResponses — deterministic, no LLM
//    Input: ordered: array of items (question_id, answer_text, response, ...)
//    Returns array with .score similar to old shape
//    ---------------------- */

// export async function scoreResponses({
//   ordered = [],
//   DEBUG = false,
//   sequential = true,
//   maxConcurrent = 1,
// } = {}) {
//   if (!Array.isArray(ordered)) throw new Error("ordered must be an array");

//   const results = [];

//   async function scoreOne(item) {
//     const qid = String(item.question_id ?? "");
//     const expectedAnswer = item.answer_text || item.expected_answer || "";
//     const userResponse = item.response || item.user_response || "";

//     if (isExplicitSkipOrDontKnow(userResponse)) {
//       return {
//         ok: true,
//         fallback: true,
//         question_id: qid,
//         scores: { correctness: 0, depth: 0, communication: 1, metrics: 0 },
//         overall_score: 0,
//         missed_points: [],
//         positive_points: [],
//         rationale: "Candidate explicitly skipped or indicated no knowledge.",
//         raw_llm_text: null,
//       };
//     }

//     // Use lexical heuristics
//     const lex = lexicalScore(expectedAnswer, userResponse);

//     const scores = {
//       correctness: clamp(lex.correctness),
//       depth: clamp(lex.depth),
//       communication: clamp(lex.communication),
//       metrics: clamp(lex.metrics),
//     };

//     const missed_points = lex.misses || lex.misses || [];
//     // build positive_points: first few matched technical tokens or short phrases
//     const eTokens = normalizeText(expectedAnswer).slice(0, 40);
//     const rTokens = normalizeText(userResponse);
//     const matched = rTokens.filter((t) => eTokens.includes(t)).slice(0, 6);
//     const positive_points = matched.length ? matched.map((t) => `mentioned "${t}"`) : [];

//     const weighted5 = weightedOverall(scores);

//     const rationale = `Heuristic scoring: correctness=${scores.correctness}, depth=${scores.depth}, communication=${scores.communication}.`;

//     return {
//       ok: true,
//       fallback: true,
//       question_id: qid,
//       scores,
//       overall_score: weighted5,
//       missed_points,
//       positive_points,
//       rationale,
//       raw_llm_text: null,
//     };
//   }

//   if (sequential || maxConcurrent <= 1) {
//     for (const it of ordered) {
//       const out = await scoreOne(it);
//       results.push({ ...it, score: out });
//     }
//   } else {
//     // basic concurrency for completeness
//     const proms = ordered.map((it) => scoreOne(it).then((out) => ({ ...it, score: out })));
//     const settled = await Promise.all(proms);
//     results.push(...settled);
//   }

//   return { ok: true, items: results, count: results.length };
// }

// /* ----------------------
//    scoreSingleQuestion — wrap single call to scoreResponses
//    ---------------------- */

// export async function scoreSingleQuestion({
//   question_id = '',
//   question_title = '',
//   question_text = '',
//   expected_answer = '',
//   user_response = '',
//   DEBUG = false,
// } = {}) {
//   try {
//     const lowerResp = (user_response || '').toLowerCase();
//     if (['not sure','don\'t know','pass','skip','move on','i don\'t know'].some(p => lowerResp.includes(p))) {
//       return {
//         ok: true,
//         score: 0.0,
//         category: 'very_low',
//         details: {
//           overall_score_5: 0,
//           componentScores: { correctness: 0, depth: 0, communication: 0, metrics: 0 },
//           rationale: 'Explicit low answer (not sure/skip)'
//         }
//       };
//     }

//     const item = {
//       question_id: String(question_id ?? ''),
//       question_title: question_title ?? '',
//       question_text: question_text ?? '',
//       answer_text: expected_answer ?? '',
//       response: user_response ?? '',
//     };

//     const out = await scoreResponses({ ordered: [item], DEBUG, sequential: true });
//     const scoredItem = (out && Array.isArray(out.items) && out.items[0]) || null;
//     const scoreObj = scoredItem?.score || null;

//     const overall5 = Number.isFinite(scoreObj?.overall_score) ? Number(scoreObj.overall_score) : 0;
//     const componentScores = scoreObj?.scores ?? { correctness: 0, depth: 0, communication: 0, metrics: 0 };

//     const score01 = Math.max(0, Math.min(1, overall5 / 5));
//     let category = 'very_low';
//     if (score01 < 0.3) category = 'very_low';
//     else if (score01 < 0.6) category = 'borderline';
//     else if (score01 < 0.8) category = 'acceptable';
//     else category = 'strong';

//     return {
//       ok: true,
//       score: Number(Math.round(score01 * 100) / 100),
//       category,
//       details: {
//         overall_score_5: overall5,
//         componentScores,
//         missed_points: scoreObj?.missed_points || [],
//         positive_points: scoreObj?.positive_points || [],
//         rationale: String(scoreObj?.rationale || ''),
//         raw_llm_text: null,
//         fallback: true,
//       }
//     };
//   } catch (err) {
//     console.error('scoreSingleQuestion error:', err && (err.stack || String(err)));
//     return {
//       ok: false,
//       score: 0,
//       score5: 0,
//       category: 'very_low',
//       details: { error: String(err) },
//     };
//   }
// }

// export default {
//   scoreResponses,
//   scoreSingleQuestion,
// };

import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), "back.env") });

// NOTE: OpenRouter integration added below. If OPENROUTER_API_KEY is not set or USE_OPENROUTER is false,
// the code behaves exactly as before (lexical fallback only).

/* ----------------------
   OpenRouter LLM caller (minimal, robust)
   ---------------------- */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || ""; // must match a model you have access to in OpenRouter
const USE_OPENROUTER_GLOBAL = String(process.env.USE_OPENROUTER || "false").toLowerCase() === "true";
const OPENROUTER_TIMEOUT_MS = 12000;

async function callOpenRouter(prompt, retry = 0, DEBUG = false) {
  if (!OPENROUTER_API_KEY || !OPENROUTER_MODEL) {
    throw new Error("OpenRouter key or model not configured");
  }

  const url = "https://openrouter.ai/api/v1/chat/completions";

  const body = {
    model: OPENROUTER_MODEL,
    messages: [
      { role: "user", content: [{ type: "text", text: prompt }] }
    ],
    // you can add temperature/top_p etc if you want
    temperature: 0.0,
    max_tokens: 8000,
  };

  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = OPENROUTER_TIMEOUT_MS;
    let timeoutId;
    if (controller) timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    });

    if (controller) clearTimeout(timeoutId);

    const text = await res.text();

    if (!res.ok) {
      // Try to parse error JSON for clarity
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (e) { /* ignore */ }
      const msg = parsed?.error ?? parsed ?? text;
      const err = new Error(`OpenRouter API error: HTTP ${res.status} ${res.statusText} - ${JSON.stringify(msg).slice(0, 300)}`);
      err.status = res.status;
      err.raw = parsed ?? text;
      // Expose retry info if present
      const retryAfter = res.headers.get && res.headers.get("retry-after");
      if (retryAfter) err.retryAfter = Number(retryAfter);
      throw err;
    }

    // Attempt parse JSON response
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (e) { parsed = null; }

    // Try to extract textual content robustly
    let candidateText = null;
    if (parsed) {
      // try OpenAI-like structure
      candidateText =
        parsed?.choices?.[0]?.message?.content?.[0]?.text ??
        parsed?.choices?.[0]?.message?.content ??
        parsed?.choices?.[0]?.message?.content?.[0]?.content ??
        parsed?.choices?.[0]?.text ??
        null;
      // fallback: sometimes content is stringified in choices[0].message.content[0].text
      if (!candidateText && Array.isArray(parsed?.choices)) {
        const c = parsed.choices[0];
        if (typeof c === "object" && c !== null) {
          // search nested
          const str = JSON.stringify(c).slice(0, 10000);
          candidateText = str;
        }
      }
    } else {
      candidateText = text;
    }

    if (!candidateText && DEBUG) {
      console.warn("OpenRouter: no candidate text extracted. Raw response:", text.slice(0, 1000));
    }

    return candidateText ? String(candidateText) : text;
  } catch (err) {
    // Retry logic for transient errors (429, 5xx, or timeouts)
    const status = err?.status ?? null;
    if (
      retry < 3 &&
      (status === 429 || (status >= 500 && status < 600) || err.name === "AbortError")
    ) {
      const retryAfter = err?.retryAfter ? err.retryAfter * 1000 : null;
      const backoffMs = (retryAfter ?? (1000 * Math.pow(2, retry))) + Math.floor(Math.random() * 300);
      if (DEBUG) console.warn(`[OpenRouter] transient error (status=${status}). Retrying after ${backoffMs}ms.`);
      await new Promise((r) => setTimeout(r, backoffMs));
      return callOpenRouter(prompt, retry + 1, DEBUG);
    }
    throw err;
  }
}

/* ----------------------
   Heuristic lexical scorer (primary scoring engine)
   (unchanged)
   ---------------------- */

function normalizeText(s = "") {
  return (s || "")
    .toString()
    .toLowerCase()
    .replace(/[`"'“”‘’]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function lexicalScore(expected, response) {
  if (!response || !response.trim()) {
    return { correctness: 0, depth: 0, communication: 1, metrics: 0, misses: [] };
  }

  const eTokens = normalizeText(expected || "");
  const rTokens = normalizeText(response || "");

  const eSet = new Set(eTokens);
  const matches = rTokens.filter((t) => eSet.has(t));
  const overlap = eTokens.length ? matches.length / eTokens.length : 0;

  const technicalMatches = matches.filter((tok) => tok.length > 3);

  let correctness = Math.min(5, Math.round(overlap * 5));
  if (technicalMatches.length >= 2 && correctness < 3) correctness = 3;

  const phraseBoosters = ["react.reactnode", "reactnode", "react node", "react.reactnode"];
  const respLower = response.toLowerCase();
  for (const p of phraseBoosters) {
    if (respLower.includes(p) && correctness < 4) correctness = Math.max(correctness, 4);
  }

  if (response.trim().length < 10) correctness = Math.min(correctness, 1);

  let depth = Math.min(5, Math.round((technicalMatches.length / Math.max(1, eTokens.length)) * 5));
  if (rTokens.length > Math.max(20, eTokens.length)) {
    depth = Math.min(5, depth + 1);
  }
  if (rTokens.length < Math.max(8, eTokens.length / 2) && depth > 3) depth = 3;

  const communication = Math.min(5, Math.round(Math.min(1, rTokens.length / 20) * 5));
  const metrics = /\b\d+(\.\d+)?\b/.test(response) ? 2 : 0;
  const missed = (eTokens.slice(0, 40) || []).filter((t) => !rTokens.includes(t)).slice(0, 10);

  return {
    correctness,
    depth,
    communication,
    metrics,
    misses: Array.from(new Set(missed)),
  };
}

/* ----------------------
   Helpers: clamp, round, weightedOverall, skip detection (unchanged)
   ---------------------- */

function clamp(v) {
  v = Number(v);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(5, Math.round(v * 4) / 4));
}

function round(v) {
  return Math.round(v * 100) / 100;
}

function weightedOverall(scores) {
  const W = {
    correctness: 0.75,
    depth: 0.15,
    communication: 0.10,
    metrics: 0.0,
  };
  let sum = 0;
  for (const k in W) sum += W[k] * (scores[k] || 0);
  if ((scores.correctness || 0) >= 3) sum = Math.max(sum, 2.5);
  return round(sum);
}

function isExplicitSkipOrDontKnow(s) {
  if (!s || typeof s !== "string") return false;
  const t = s.trim().toLowerCase();
  return [
    /\b(skip|pass)\b/,
    /\bnot sure\b/,
    /\bdon'?t know\b/,
    /\bno idea\b/,
    /\bmove on\b/,
  ].some((re) => re.test(t));
}

const STOPWORDS = new Set([
  "the","a","an","of","in","on","at","for","to","and","or","by","with","is","are","be","it","that","this","these","those","as","from","which"
]);

function cleanConcepts(pointsArray) {
  // Input: array of { point: "...", confidence: 0.x } or strings
  if (!Array.isArray(pointsArray)) return [];
  const seen = new Set();
  const out = [];
  for (let p of pointsArray) {
    if (!p) continue;
    let text = typeof p === "string" ? p : (p.point || "");
    text = text.trim();
    if (!text) continue;
    // remove leading/trailing stopwords and collapse whitespace
    const toks = text.split(/\s+/).filter(Boolean);
    // remove single-token stopwords & tiny tokens
    const filtered = toks.filter(t => !(STOPWORDS.has(t.toLowerCase()) || t.length <= 2));
    if (filtered.length === 0) continue;
    const normalized = filtered.join(" ").toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    const confidence = (typeof p === "object" && Number.isFinite(p.confidence)) ? Math.max(0, Math.min(1, p.confidence)) : 0.6;
    out.push({ point: capitalizeFirst(filtered.join(" ")), confidence });
    if (out.length >= 6) break; // enforce 6 item limit
  }
  return out;
}

function capitalizeFirst(s) { 
  return s.charAt(0).toUpperCase() + s.slice(1); 
}

/* ----------------------
   LLM prompt builder (same JSON spec you had for Gemini)
   ---------------------- */

// function buildLLMScoringPrompt({ questionTitle, questionText, expectedAnswer, userResponse }) {
//   const q = (questionTitle ? `${questionTitle}\n` : "") + (questionText || "");
//   return `
// You are an expert technical interviewer and a grader. Given the INTERVIEW QUESTION, the IDEAL/EXPECTED ANSWER, and the CANDIDATE RESPONSE, produce a strict JSON object (and nothing else) that evaluates the candidate response.

// Respond EXACTLY with a single JSON object with these keys:

// {
//   "question_id": "<string>",
//   "scores": {
//     "correctness": <number 0-5>,
//     "depth": <number 0-5>,
//     "communication": <number 0-5>,
//     "metrics": <number 0-5>
//   },
//   "overall_score": <number 0-5>,
//   "missed_points": ["short bullet strings..."],
//   "positive_points": ["short bullet strings..."],
//   "rationale": "brief explanation (1-3 sentences) of why these scores were given"
// }

// RULES:
// - Output ONLY the JSON object, nothing else.
// - Use numeric scores only 0..5.
// - Keep rationale short (1-3 sentences).

// INPUT FIELDS:
// INTERVIEW QUESTION:
// ${q}

// IDEAL/EXPECTED ANSWER:
// ${expectedAnswer || ""}

// CANDIDATE RESPONSE:
// ${userResponse || ""}

// Return JSON now.
//   `;
// }
function buildLLMScoringPrompt({ questionTitle, questionText, expectedAnswer, userResponse }) {
  const q = (questionTitle ? `${questionTitle}\n` : "") + (questionText || "");
  return `
    You are an expert technical interviewer and a careful grader. Your job: compare the IDEAL/EXPECTED ANSWER (reference) to the CANDIDATE RESPONSE and produce ONE valid JSON object and NOTHING ELSE.  
    Important behavior rules (must follow exactly):
    1. **Concept-level matching**: When extracting missed_points or positive_points, always return short *concept phrases* (3-6 words max) that represent meaningful ideas or steps — NOT exact function words or single prepositions. Do not include "of", "the", "a", "and", or other stopwords as separate missed points.
    2. **Paraphrase-tolerant**: Treat synonyms and paraphrases as satisfying a concept. If the candidate used a paraphrase that captures the same idea, do **not** mark it as missed.
    3. **Be helpful**: missed_points should be specific and actionable (e.g., "mention time complexity O(n)" or "explain queue usage for level-order traversal"), not raw tokens.
    4. **Confidence**: For each missed_point and positive_point provide 'confidence' (0.0-1.0).
    5. **Limit**: Aim for 2–6 missed_points and 1–6 positive_points where applicable.
    6. **Output only valid JSON** (no commentary). If a field is empty, return an empty array or sensible default.

    OUTPUT SCHEMA (exact keys, types):
    {
      "question_id": "<string>",
      "scores": { "correctness": <0-5>, "depth": <0-5>, "communication": <0-5>, "metrics": <0-5> },
      "overall_score": <0-5>,
      "missed_points": [ { "point": "<short phrase>", "confidence": <0.0-1.0> } ],
      "positive_points": [ { "point": "<short phrase>", "confidence": <0.0-1.0> } ],
      "rationale": "<1-3 sentence explanation>"
    }

    RULES FOR SCORING:
    - Use your own knowledge to evaluate correctness and depth; do not rely only on exact token overlap.
    - overall_score should be consistent with the component scores (approx average, allow 0.25/0.5 resolution).
    - Keep rationale concise and tied to the components.

    FEW-SHOT EXAMPLES (follow these formats exactly):

    Example 1:
    IDEAL: "Use BFS (queue-based) for level order traversal. Mention time complexity O(n) and that BFS uses a queue; explain marking visited for graphs to avoid cycles."
    CANDIDATE: "Use breadth-first search with a queue to visit nodes level by level. It's O(n)."
    EXPECTED JSON:
    {
      "question_id":"ex1",
      "scores": { "correctness": 4.5, "depth": 3.0, "communication": 4.0, "metrics": 2.0 },
      "overall_score": 3.5,
      "missed_points": [
        { "point":"mention visited-set or marking visited to avoid cycles", "confidence": 0.9 },
        { "point":"explicitly state queue semantics for graph cycles", "confidence": 0.6 }
      ],
      "positive_points": [
        { "point":"correctly identified BFS and queue usage", "confidence": 0.95 },
        { "point":"stated time complexity O(n)", "confidence": 0.9 }
      ],
      "rationale":"Candidate correctly described BFS and complexity but omitted cycle-handling detail (visited set) and did not fully explain queue semantics for graphs."
    }

    Example 2:
    IDEAL: "Explain difference between pass-by-value and pass-by-reference. Example in JS: primitives copied, objects by reference."
    CANDIDATE: "In JS primitives are copied, objects are references — so changing object props affects callers."
    EXPECTED JSON:
    {
      "question_id":"ex2",
      "scores": { "correctness": 5.0, "depth": 4.0, "communication": 4.5, "metrics": 0.0 },
      "overall_score": 4.5,
      "missed_points": [],
      "positive_points": [
        { "point":"gave correct JS example distinguishing primitives vs objects", "confidence": 0.95 }
      ],
      "rationale":"Clear, accurate explanation with an example; nothing significant missing."
    }

    NOW YOUR INPUT:
    INTERVIEW QUESTION:
    ${q}

    IDEAL/EXPECTED ANSWER:
    ${expectedAnswer || ""}

    CANDIDATE RESPONSE:
    ${userResponse || ""}

    Return the JSON now.
  `.trim();
}

/* ----------------------
   scoreResponses — deterministic, no LLM by default
   (small change: accepts useLLM in options and will attempt LLM if enabled & configured)
   ---------------------- */

export async function scoreResponses({
  ordered = [],
  DEBUG = false,
  sequential = true,
  maxConcurrent = 1,
  useLLM = false,            // NEW optional param; default false to preserve behavior
} = {}) {
  if (!Array.isArray(ordered)) throw new Error("ordered must be an array");

  // Only enable LLM if global env flag or passed option AND OpenRouter configured
  const enableLLM = useLLM || USE_OPENROUTER_GLOBAL;
  const results = [];

  async function scoreOne(item) {
    const qid = String(item.question_id ?? "");
    const expectedAnswer = item.answer_text || item.expected_answer || "";
    const userResponse = item.response || item.user_response || "";

    if (isExplicitSkipOrDontKnow(userResponse)) {
      return {
        ok: true,
        fallback: true,
        question_id: qid,
        scores: { correctness: 0, depth: 0, communication: 1, metrics: 0 },
        overall_score: 0,
        missed_points: [],
        positive_points: [],
        rationale: "Candidate explicitly skipped or indicated no knowledge.",
        raw_llm_text: null,
      };
    }

    // If LLM enabled and configured, attempt LLM first. If it fails, fallback to lexical.
    if (enableLLM && OPENROUTER_API_KEY && OPENROUTER_MODEL) {
      try {
        const prompt = buildLLMScoringPrompt({
          questionTitle: item.question_title || "",
          questionText: item.question_text || item.question_text_raw || "",
          expectedAnswer,
          userResponse,
        });
        if (DEBUG) console.log("[LLM] Sending prompt:", prompt.slice(0, 400));
        const llmRaw = await callOpenRouter(prompt, 0, DEBUG);
        if (DEBUG) console.log("[LLM] raw response snippet:", String(llmRaw).slice(0, 400));

        // Try to extract a JSON payload from the LLM's text
        const extracted = extractJsonFromText(llmRaw);
        let parsed = null;
        if (extracted) {
          try { parsed = JSON.parse(extracted); } catch (e) { parsed = null; }
        } else {
          // try parse direct if it's already JSON
          try { parsed = JSON.parse(llmRaw); } catch (e) { parsed = null; }
        }

        if (parsed && parsed.scores) {
          // Map LLM scores to your expected shape with clamping/rounding
          const rawScores = parsed.scores || parsed.score || {};
          const scores = {
            correctness: clamp(rawScores.correctness ?? rawScores.correct ?? 0),
            depth: clamp(rawScores.depth ?? 0),
            communication: clamp(rawScores.communication ?? 0),
            metrics: clamp(rawScores.metrics ?? 0),
          };
          const overall = Number.isFinite(parsed.overall_score) ? parsed.overall_score : weightedOverall(scores);
          const missed = Array.isArray(parsed.missed_points) ? parsed.missed_points : (parsed.missed_points || []);
          const positive = Array.isArray(parsed.positive_points) ? parsed.positive_points : (parsed.positive_points || []);
          const rationale = String(parsed.rationale || "");

          const missed_points = cleanConcepts(missed);
          const positive_points = cleanConcepts(positive);

          return {
            ok: true,
            fallback: false,
            question_id: qid,
            scores,
            overall_score: overall,
            missed_points: missed_points,
            positive_points: positive_points,
            rationale,
            raw_llm_text: String(llmRaw),
          };
        } else {
          if (DEBUG) console.warn("[LLM] LLM response parse failed, falling back to lexical. Raw:", String(llmRaw).slice(0, 400));
          // fall through to lexical logic below
        }
      } catch (err) {
        if (DEBUG) console.warn("[LLM] callOpenRouter failed, falling back to lexical. Error:", err && (err.stack || String(err)));
        // fall through to lexical fallback
      }
    }

    // Use lexical heuristics (existing behavior)
    const lex = lexicalScore(expectedAnswer, userResponse);

    const scores = {
      correctness: clamp(lex.correctness),
      depth: clamp(lex.depth),
      communication: clamp(lex.communication),
      metrics: clamp(lex.metrics),
    };

    const missed_points = lex.misses || lex.misses || [];
    const eTokens = normalizeText(expectedAnswer).slice(0, 40);
    const rTokens = normalizeText(userResponse);
    const matched = rTokens.filter((t) => eTokens.includes(t)).slice(0, 6);
    const positive_points = matched.length ? matched.map((t) => `mentioned "${t}"`) : [];

    const weighted5 = weightedOverall(scores);
    const rationale = `Heuristic scoring: correctness=${scores.correctness}, depth=${scores.depth}, communication=${scores.communication}.`;

    return {
      ok: true,
      fallback: true,
      question_id: qid,
      scores,
      overall_score: weighted5,
      missed_points,
      positive_points,
      rationale,
      raw_llm_text: null,
    };
  }

  if (sequential || maxConcurrent <= 1) {
    for (const it of ordered) {
      const out = await scoreOne(it);
      results.push({ ...it, score: out });
    }
  } else {
    const proms = ordered.map((it) => scoreOne(it).then((out) => ({ ...it, score: out })));
    const settled = await Promise.all(proms);
    results.push(...settled);
  }

  return { ok: true, items: results, count: results.length };
}

/* ----------------------
   extractJsonFromText (same helper you had earlier or added)
   ---------------------- */
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
   scoreSingleQuestion — unchanged (still uses scoreResponses)
   ---------------------- */

export async function scoreSingleQuestion({
  question_id = '',
  question_title = '',
  question_text = '',
  expected_answer = '',
  user_response = '',
  DEBUG = false,
} = {}) {
  try {
    const lowerResp = (user_response || '').toLowerCase();
    if (['not sure','don\'t know','pass','skip','move on','i don\'t know'].some(p => lowerResp.includes(p))) {
      return {
        ok: true,
        score: 0.0,
        category: 'very_low',
        details: {
          overall_score_5: 0,
          componentScores: { correctness: 0, depth: 0, communication: 0, metrics: 0 },
          rationale: 'Explicit low answer (not sure/skip)'
        }
      };
    }

    const item = {
      question_id: String(question_id ?? ''),
      question_title: question_title ?? '',
      question_text: question_text ?? '',
      answer_text: expected_answer ?? '',
      response: user_response ?? '',
    };

    // NOTE: pass useLLM param if you want to enable LLM for this call only
    const out = await scoreResponses({ ordered: [item], DEBUG, sequential: true, useLLM: false });
    const scoredItem = (out && Array.isArray(out.items) && out.items[0]) || null;
    const scoreObj = scoredItem?.score || null;

    const overall5 = Number.isFinite(scoreObj?.overall_score) ? Number(scoreObj.overall_score) : 0;
    const componentScores = scoreObj?.scores ?? { correctness: 0, depth: 0, communication: 0, metrics: 0 };

    const score01 = Math.max(0, Math.min(1, overall5 / 5));
    let category = 'very_low';
    if (score01 < 0.3) category = 'very_low';
    else if (score01 < 0.6) category = 'borderline';
    else if (score01 < 0.8) category = 'acceptable';
    else category = 'strong';

    return {
      ok: true,
      score: Number(Math.round(score01 * 100) / 100),
      category,
      details: {
        overall_score_5: overall5,
        componentScores,
        missed_points: scoreObj?.missed_points || [],
        positive_points: scoreObj?.positive_points || [],
        rationale: String(scoreObj?.rationale || ''),
        raw_llm_text: null,
        fallback: true,
      }
    };
  } catch (err) {
    console.error('scoreSingleQuestion error:', err && (err.stack || String(err)));
    return {
      ok: false,
      score: 0,
      score5: 0,
      category: 'very_low',
      details: { error: String(err) },
    };
  }
}

export default {
  scoreResponses,
  scoreSingleQuestion,
};
