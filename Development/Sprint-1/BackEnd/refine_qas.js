// refine_qas_fetch.js
// Usage: node refine_qas_fetch.js
// Node 18+ recommended (global fetch). Ensure process.env.GEMINI_API_KEY is set.

import fs from 'fs/promises';
import path from 'path';
import { config } from 'dotenv';

config({ path: './back.env' }); // optional, remove if not using

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY in environment.');
  process.exit(1);
}

// Choose a model; gemini-2.0-flash is used here because it accepts the `contents.parts` format.
const MODEL = 'gemini-2.0-flash';
// endpoint (we attach key as query param)
const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

const INPUT_FILE = path.join(process.cwd(), 'so_selected_qas.json');
const OUTPUT_FILE = path.join(process.cwd(), 'refined_qas.json');

const SYSTEM_PROMPT = `
You are an expert technical interview question refiner.

Given a single StackOverflow Q/A (title, body, accepted answer), perform these tasks and return ONLY valid JSON (no extra text):

1) If the Q/A pair is NOT suitable for interview usage (debug logs, pasted errors, screenshots, extremely local project debugging, or otherwise not useful for evaluating a candidate), return:
   {"suitable": false}

2) If it IS suitable, return:
{
  "suitable": true,
  "question": "<single concise interview-style question (one sentence)>",
  "answer": "<concise interview-style answer (one paragraph, clear steps or explanation)>"
}

Guidelines:
- Do not invent facts. Paraphrase / clean the question and paraphrase the accepted answer (do not add new claims).
- Keep the question short (one sentence) and the answer clear and structured (one short paragraph).
- If unsure whether it's suitable, prefer to mark as unsuitable.
Return EXACTLY one JSON object and nothing else.
`;

async function callGemini(prompt, retry = 0) {
  const url = ENDPOINT(MODEL);
  const body = {
    // tune these params if you want different verbosity/creativity
    temperature: 0.1,
    maxOutputTokens: 800,
    contents: [{ parts: [{ text: prompt }] }],
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    if (!res.ok) {
      // Try to include server response to help debugging
      const snippet = text ? text.slice(0, 1000) : '';
      const err = new Error(`HTTP ${res.status} ${res.statusText} - ${snippet}`);
      err.status = res.status;
      throw err;
    }

    // Parse JSON response robustly: different models/versions may nest content differently
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Not valid top-level JSON — try extracting candidate text
      let candidateText;
      try {
        const parsedBody = JSON.parse(text);
        // typical structure: { candidates: [ { content: { parts: [ { text } ] } } ] }
        candidateText =
          parsedBody?.candidates?.[0]?.content?.parts?.[0]?.text ??
          parsedBody?.candidates?.[0]?.content?.[0]?.text ??
          parsedBody?.candidates?.[0]?.content?.[0]?.content ??
          parsedBody?.candidates?.[0]?.content?.parts?.[0]?.content;
      } catch (e2) {
        throw new Error('Could not parse response body nor extract candidate text');
      }
      if (!candidateText) throw new Error('No candidate text found in API response');
      return candidateText.toString();
    }

    // If parsed is JSON (SDK-like response), extract the generated text
    const candidateText =
      parsed?.candidates?.[0]?.content?.parts?.[0]?.text ??
      parsed?.candidates?.[0]?.content?.[0]?.text ??
      parsed?.candidates?.[0]?.content?.[0]?.content ??
      parsed?.candidates?.[0]?.content ??
      null;

    if (!candidateText) {
      // fallback: return whole response string (caller will try to parse JSON out of it)
      return text;
    }

    return candidateText.toString();
  } catch (err) {
    // retry logic for 429 / 5xx transient errors
    const status = err?.status ?? null;
    if (retry < 3 && (status === 429 || (status >= 500 && status < 600) || err.message.includes('Timeout'))) {
      const backoffMs = 1000 * Math.pow(2, retry) + Math.floor(Math.random() * 300);
      console.warn(`Transient error (status=${status}). Retrying after ${backoffMs}ms. Attempt ${retry + 1}`);
      await new Promise((r) => setTimeout(r, backoffMs));
      return callGemini(prompt, retry + 1);
    }
    throw err;
  }
}

function extractJsonFromText(text) {
  // attempt to extract first JSON object in string (robust for LLM outputs)
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonText = text.slice(start, end + 1);
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    // try to fix common trailing commas etc. — keep simple, otherwise return null
    return null;
  }
}

async function refineOne(item) {
  const userPrompt = `
SYSTEM INSTRUCTIONS:
${SYSTEM_PROMPT}

INPUT:
QUESTION TITLE:
${item.question_title || ''}

QUESTION BODY:
${item.question_text || ''}

ACCEPTED ANSWER:
${item.answer_text || ''}

Return only one valid JSON object per the SYSTEM INSTRUCTIONS above.
  `;

  try {
    const answerText = await callGemini(userPrompt);
    // attempt to parse JSON. The model should return only JSON, but we defend.
    let parsed = null;
    // if answerText already looks like a JSON string (starts with {)
    if (answerText.trim().startsWith('{')) {
      parsed = extractJsonFromText(answerText);
    } else {
      // sometimes API wraps text in candidate object names; attempt to extract JSON substring
      parsed = extractJsonFromText(answerText);
    }

    if (!parsed) {
      console.warn(`Could not extract JSON for id=${item.question_id}. Response snippet:\n${answerText.slice(0, 400)}`);
      return { ok: false, reason: 'no-json', raw: answerText };
    }

    // Validate expected keys
    if (parsed.suitable === false) {
      return { ok: true, suitable: false };
    }
    if (parsed.suitable === true && typeof parsed.question === 'string' && typeof parsed.answer === 'string') {
      // sanitize strings a bit
      const q = parsed.question.trim();
      const a = parsed.answer.trim();
      if (!q || !a) return { ok: false, reason: 'empty-fields' };
      return { ok: true, suitable: true, question: q, answer: a };
    }

    return { ok: false, reason: 'invalid-structure', parsed };
  } catch (err) {
    return { ok: false, reason: 'error', error: String(err) };
  }
}

async function run() {
  console.log('Loading input file:', INPUT_FILE);
  const raw = await fs.readFile(INPUT_FILE, 'utf8');
  let items = JSON.parse(raw);
  if (!Array.isArray(items)) {
    console.error('Input JSON must be an array of Q/A objects.');
    process.exit(1);
  }

  const out = [];
  let i = 0;
  for (const item of items) {
    i++;
    console.log(`Processing ${i}/${items.length} id=${item.question_id}...`);
    const res = await refineOne(item);
    if (!res.ok) {
      console.warn(`Skipping id=${item.question_id} due to ${res.reason || res.error}`);
      continue;
    }
    if (res.suitable === false) {
      console.log(`Skipped unsuitable id=${item.question_id}`);
      continue;
    }
    out.push({
      question_id: item.question_id,
      question_url: item.question_url,
      paraphrased_question: res.question,
      paraphrased_answer: res.answer,
      original_tags: item.question_tags || [],
      original_score: item.question_score ?? 0,
    });
    // small delay to avoid bursts
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`Saving ${out.length} refined Q/A pairs to ${OUTPUT_FILE}`);
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(out, null, 2), 'utf8');
  console.log('Done.');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
