import fs from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import crypto from "node:crypto";

config({ path: "./back.env" });

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Missing GEMINI_API_KEY in environment (back.env).");
  process.exit(1);
}

const MODEL = "gemini-2.0-flash";
const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

const INPUT_FILE = path.join(process.cwd(), "so_selected_qas.json");
const OUTPUT_FILE = path.join(process.cwd(), "paraphrased_qas.json");
const DEBUG = process.env.DEBUG_PARAPHRASE === "1";

const SYSTEM_PROMPT = `
You are an expert technical interviewer and answer editor. For each StackOverflow question and its accepted answer given as input, do the following:

- Convert the StackOverflow question into a concise, one-sentence interview-style question that an interviewer would ask. Make it direct, focused, and framed so a candidate can answer it in an interview.
- Paraphrase the accepted answer into a short, clear, ideal answer (about 1-3 sentences). You MUST grasp and use the information provided in the accepted answer. If the accepted answer is incomplete, you may enhance or clarify it by producing the correct answer distilled from the given content — do not invent unrelated facts, but you may reorganize, summarize, and fill small gaps to make the answer suitable as an interviewer reference.

Return EXACTLY one JSON object (and nothing else) with these keys:
{
  "paraphrased_question": "...",
  "paraphrased_answer": "..."
}

Additional rules:
- Keep "paraphrased_question" to a single sentence suitable for an interview prompt.
- Keep "paraphrased_answer" concise, factual, and directly answering the question. Use the accepted answer as your source and enhance only to make the response correct and complete.
- If you cannot produce a valid interview question and answer from the input without inventing unsupported facts, return both fields as empty strings:
  { "paraphrased_question": "", "paraphrased_answer": "" }
`;

function safeRandom(max) {
  const array = new Uint32Array(1);
  crypto.webcrypto.getRandomValues(array); // Node.js 20+ compatible
  return (array[0] / 0xffffffff) * max;
}

/* ----------------------
   Utility functions
   ---------------------- */
function normalizeTextForCompare(s) {
  return (s || "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasLongOverlap(original, paraphrase, n = 6) {
  const o = normalizeTextForCompare(original).split(/\s+/).filter(Boolean);
  const p = normalizeTextForCompare(paraphrase);
  if (o.length < n) return false;
  for (let i = 0; i <= o.length - n; i++) {
    const seq = o.slice(i, i + n).join(" ");
    if (p.includes(seq)) return true;
  }
  return false;
}

/* ----------------------
   Gemini API call with safe retry
   ---------------------- */
async function callGemini(prompt, retry = 0) {
  const url = ENDPOINT(MODEL);
  const body = { contents: [{ parts: [{ text: prompt }] }] };

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

    const transient =
      res.status === 429 ||
      (res.status >= 500 && res.status < 600) ||
      text.includes("Timeout");

    if (retry < 3 && transient) {
      const backoffMs = 1000 * Math.pow(2, retry) + Math.floor(safeRandom(300));
      console.warn(`Transient error. Retry ${retry + 1} after ${backoffMs}ms`);
      await new Promise((r) => setTimeout(r, backoffMs));
      return callGemini(prompt, retry + 1);
    }

    throw err;
  }

  // Attempt to parse JSON from candidate
  try {
    const parsed = JSON.parse(text);
    const candidateText =
      parsed?.candidates?.[0]?.content?.parts?.[0]?.text ??
      parsed?.candidates?.[0]?.content?.[0]?.text ??
      parsed?.candidates?.[0]?.content;
    return candidateText?.toString() ?? text;
  } catch {
    return text;
  }
}

/* ----------------------
   JSON extraction
   ---------------------- */
function extractJsonFromText(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return JSON.parse(text.slice(start, end + 1));
}

/* ----------------------
   Paraphrase a single Q/A
   ---------------------- */
async function paraphraseOne(item) {
  const origQ = `${item.question_title || ""} ${
    item.question_text || ""
  }`.trim();
  const origA = (item.answer_text || "").trim();

  const basePrompt = `SYSTEM INSTRUCTIONS:\n${SYSTEM_PROMPT}\n\nINPUT:\nTITLE:\n${
    item.question_title || ""
  }\n\nBODY:\n${item.question_text || ""}\n\nACCEPTED ANSWER:\n${
    item.answer_text || ""
  }\n\nReturn only the JSON object.`;

  const attempt = async (prompt) => {
    const respText = await callGemini(prompt);
    return extractJsonFromText(respText) || null;
  };

  const evaluate = (parsed) => {
    const q = (parsed.paraphrased_question || "").trim();
    const a = (parsed.paraphrased_answer || "").trim();
    const qTooSimilar = !q || q === origQ || hasLongOverlap(origQ, q, 6);
    const aTooSimilar = !a || a === origA || hasLongOverlap(origA, a, 6);
    return { q, a, qTooSimilar, aTooSimilar };
  };

  try {
    const parsed1 = await attempt(basePrompt);
    if (!parsed1) return { ok: false, reason: "no-json" };

    let { q, a, qTooSimilar, aTooSimilar } = evaluate(parsed1);
    if (!qTooSimilar && !aTooSimilar)
      return { ok: true, paraphrased_question: q, paraphrased_answer: a };

    if (DEBUG)
      console.warn(`Retrying id=${item.question_id} with stronger rewrite.`);
    const retryPrompt =
      basePrompt +
      "\n\nIMPORTANT: Rewrite both fields with different wording; avoid phrases >6 words.";
    const parsed2 = await attempt(retryPrompt);
    if (!parsed2) return { ok: false, reason: "no-json-after-retry" };

    ({ q, a, qTooSimilar, aTooSimilar } = evaluate(parsed2));
    if (qTooSimilar || aTooSimilar) return { ok: false, reason: "too-similar" };

    return { ok: true, paraphrased_question: q, paraphrased_answer: a };
  } catch (err) {
    return { ok: false, reason: "error", error: String(err) };
  }
}

/* ----------------------
   Main top-level logic
   ---------------------- */
console.log("Loading input file:", INPUT_FILE);
const raw = await fs.readFile(INPUT_FILE, "utf8");
let items = JSON.parse(raw);
if (!Array.isArray(items)) {
  console.error("Input JSON must be an array.");
  process.exit(1);
}

const TEST_COUNT = Number.parseInt(process.env.TEST_COUNT || "0", 10);
if (TEST_COUNT > 0) {
  console.log(`TEST_COUNT=${TEST_COUNT} — processing only first ${TEST_COUNT}`);
  items = items.slice(0, TEST_COUNT);
}

const out = [];
let i = 0;
for (const item of items) {
  i++;
  console.log(`Processing ${i}/${items.length} id=${item.question_id}...`);
  const res = await paraphraseOne(item);
  if (!res.ok) {
    console.warn(`Skipping id=${item.question_id}: ${res.reason}`);
    if (DEBUG) console.warn(JSON.stringify(res, null, 2));
    continue;
  }
  out.push({
    ...item,
    question_text: res.paraphrased_question,
    answer_text: res.paraphrased_answer,
  });
  await new Promise((r) => setTimeout(r, 300));
}

console.log(`Saving ${out.length} items to ${OUTPUT_FILE}`);
await fs.writeFile(OUTPUT_FILE, JSON.stringify(out, null, 2), "utf8");
console.log("Done.");
