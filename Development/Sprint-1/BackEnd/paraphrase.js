import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";

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

// Helper: normalize text for overlap checks
function normalizeTextForCompare(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
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

async function callGemini(prompt, retry = 0) {
  const url = ENDPOINT(MODEL);
  // Use a minimal request body: some Gemini endpoints reject top-level
  // fields like `temperature` and `maxOutputTokens` in this API shape.
  // Keep only `contents` which is accepted by the v1beta generateContent endpoint.
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
      const err = new Error(
        `HTTP ${res.status} ${res.statusText} - ${snippet}`
      );
      err.status = res.status;
      throw err;
    }

    // Try parse as JSON, otherwise extract candidate text
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // attempt to parse SDK-like response to extract candidate text
      try {
        const bodyObj = JSON.parse(text);
        const candidateText =
          bodyObj?.candidates?.[0]?.content?.parts?.[0]?.text ??
          bodyObj?.candidates?.[0]?.content?.[0]?.text ??
          null;
        if (candidateText) return candidateText.toString();
      } catch (e2) {
        // fall through
      }
      // return raw text (caller will try to extract JSON)
      return text;
    }

    const candidateText =
      parsed?.candidates?.[0]?.content?.parts?.[0]?.text ??
      parsed?.candidates?.[0]?.content?.[0]?.text ??
      parsed?.candidates?.[0]?.content ??
      null;

    if (!candidateText) return text;
    return candidateText.toString();
  } catch (err) {
    const status = err?.status ?? null;
    if (
      retry < 3 &&
      (status === 429 ||
        (status >= 500 && status < 600) ||
        err.message.includes("Timeout"))
    ) {
      const backoffMs =
        1000 * Math.pow(2, retry) + Math.floor(Math.random() * 300);
      console.warn(
        `Transient error (status=${status}). Retrying after ${backoffMs}ms. Attempt ${
          retry + 1
        }`
      );
      await new Promise((r) => setTimeout(r, backoffMs));
      return callGemini(prompt, retry + 1);
    }
    throw err;
  }
}

function extractJsonFromText(text) {
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

async function paraphraseOne(item) {
  const prompt = `SYSTEM INSTRUCTIONS:\n${SYSTEM_PROMPT}\n\nINPUT:\nTITLE:\n${
    item.question_title || ""
  }\n\nBODY:\n${item.question_text || ""}\n\nACCEPTED ANSWER:\n${
    item.answer_text || ""
  }\n\nReturn only the JSON object.`;

  try {
    // First attempt
    let respText = await callGemini(prompt);
    let parsed = null;
    if (respText && respText.trim().startsWith("{"))
      parsed = extractJsonFromText(respText);
    else parsed = extractJsonFromText(respText);

    if (!parsed) {
      console.warn(
        `Could not extract JSON for id=${
          item.question_id
        }. Response snippet:\n${(respText || "").slice(0, 400)}`
      );
      return { ok: false, reason: "no-json", raw: respText };
    }

    let q = (parsed.paraphrased_question || "").trim();
    let a = (parsed.paraphrased_answer || "").trim();

    // Quick similarity checks: if output is verbatim or contains long overlap, retry with a stronger instruction
    const origQ = `${item.question_title || ""} ${
      item.question_text || ""
    }`.trim();
    const origA = (item.answer_text || "").trim();
    const qTooSimilar = !q || q === origQ || hasLongOverlap(origQ, q, 6);
    const aTooSimilar = !a || a === origA || hasLongOverlap(origA, a, 6);

    if (qTooSimilar || aTooSimilar) {
      if (DEBUG)
        console.warn(
          `Output too similar for id=${item.question_id}; retrying with stronger instruction.`
        );
      const enhancedPrompt =
        prompt +
        "\n\nIMPORTANT: The previous JSON reused too much of the original wording. Rewrite both fields using different words; avoid reusing phrases longer than 6 words from the input. Output ONLY the JSON object with the same keys.";

      const respText2 = await callGemini(enhancedPrompt);
      let parsed2 = null;
      if (respText2 && respText2.trim().startsWith("{"))
        parsed2 = extractJsonFromText(respText2);
      else parsed2 = extractJsonFromText(respText2);

      if (!parsed2) {
        if (DEBUG)
          console.warn(
            `Retry did not return JSON for id=${item.question_id}. Snippet:\n${(
              respText2 || ""
            ).slice(0, 400)}`
          );
        return { ok: false, reason: "no-json-after-retry", raw: respText2 };
      }

      const q2 = (parsed2.paraphrased_question || "").trim();
      const a2 = (parsed2.paraphrased_answer || "").trim();

      const stillQTooSimilar =
        !q2 || q2 === origQ || hasLongOverlap(origQ, q2, 6);
      const stillATooSimilar =
        !a2 || a2 === origA || hasLongOverlap(origA, a2, 6);

      if (stillQTooSimilar || stillATooSimilar) {
        if (DEBUG)
          console.warn(`Retry still too similar for id=${item.question_id}.`);
        return { ok: false, reason: "too-similar", raw: respText2 };
      }

      return { ok: true, paraphrased_question: q2, paraphrased_answer: a2 };
    }

    // Accept output
    return { ok: true, paraphrased_question: q, paraphrased_answer: a };
  } catch (err) {
    return { ok: false, reason: "error", error: String(err) };
  }
}

async function run() {
  console.log("Loading input file:", INPUT_FILE);
  const raw = await fs.readFile(INPUT_FILE, "utf8");
  let items = JSON.parse(raw);
  if (!Array.isArray(items)) {
    console.error("Input JSON must be an array of Q/A objects.");
    process.exit(1);
  }

  // Allow quick tests: if TEST_COUNT is set, only process the first N items.
  const TEST_COUNT = parseInt(process.env.TEST_COUNT || "0", 10);
  if (TEST_COUNT > 0) {
    console.log(
      `TEST_COUNT=${TEST_COUNT} — processing only the first ${TEST_COUNT} items for quick testing.`
    );
    items = items.slice(0, TEST_COUNT);
  }

  const out = [];
  let i = 0;
  for (const item of items) {
    i++;
    console.log(`Processing ${i}/${items.length} id=${item.question_id}...`);
    const res = await paraphraseOne(item);
    if (!res.ok) {
      console.warn(
        `Skipping id=${item.question_id} due to ${res.reason || res.error}`
      );
      if (DEBUG)
        console.warn(
          "Full error object for debugging:",
          JSON.stringify(res, null, 2)
        );
      continue;
    }

    // keep original object but replace question_text and answer_text
    const outItem = {
      ...item,
      question_text: res.paraphrased_question,
      answer_text: res.paraphrased_answer,
    };
    out.push(outItem);
    // small delay to avoid bursts
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`Saving ${out.length} paraphrased Q/A pairs to ${OUTPUT_FILE}`);
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(out, null, 2), "utf8");
  console.log("Done.");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
