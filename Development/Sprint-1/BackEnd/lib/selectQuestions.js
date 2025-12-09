/**
 * selectQuestions(jobTitle, jobDescription, n)
 * - keeps your current scoring / keyword extraction logic
 * - after choosing candidate ids, immediately confirms which of those ids exist in DB
 *   (handles question_id stored as string or number)
 * - if some selected ids are missing, it fills the remainder from DB-ranked fallback
 * - returns an array of question_id strings (length <= n)
 */

// server/lib/selectQuestions.js
import Question from "../models/Question.js";

function tokenize(text) {
  return String(text || "")
    .replaceAll(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replaceAll(/[^a-z0-9._\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

// Detect tech terms appearing in text
function detectTechTerms(text, TECH_TERMS) {
  const detected = new Set();

  for (const term of TECH_TERMS) {
    const escaped = term.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&"); // safe escape
    const re = new RegExp(String.raw`\b${escaped}\b`, "i");

    if (re.test(text)) detected.add(term.replaceAll(".", "").toLowerCase());
  }

  return detected;
}

// Build frequency map
function buildFrequency(tokens, STOPWORDS) {
  const freq = new Map();

  for (const t of tokens) {
    const token = t.toLowerCase();
    if (STOPWORDS.has(token)) continue;
    if (token.length <= 2) continue;
    if (/^\d+$/.test(token)) continue;

    freq.set(token, (freq.get(token) || 0) + 1);
  }

  return freq;
}

// Build OR clauses for MongoDB query
function buildOrClauses(keywords) {
  if (!keywords.length) return [];

  const clauses = [{ tags: { $in: keywords } }];

  for (const k of keywords) {
    const escaped = k.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = String.raw`\b${escaped}\b`;

    // push both title and text regex clauses at once
    clauses.push(
      { question_title: { $regex: pattern, $options: "i" } },
      { question_text: { $regex: pattern, $options: "i" } }
    );
  }

  return clauses;
}

// Score a single candidate
function scoreCandidate(doc, keywords, kwSet) {
  let score = 0;

  if (Array.isArray(doc.tags)) {
    for (const t of doc.tags) {
      if (kwSet.has(String(t).toLowerCase())) score += 5;
    }
  }

  const title = String(doc.question_title || "").toLowerCase();
  const textField = String(doc.question_text || "").toLowerCase();

  for (const k of keywords) {
    if (title.includes(k)) score += 3;
    if (textField.includes(k)) score += 1;
  }

  return {
    doc,
    score,
    rankKey: doc.rank_value ?? 0,
  };
}

/* -------------------------------------------------- MAIN FUNCTION -------------------------------------------------- */

export async function selectQuestions(
  jobTitle = "",
  jobDescription = "",
  n = 10
) {
  const text = `${jobTitle} ${jobDescription}`.toLowerCase();

  // Known tech terms
  const TECH_TERMS = [
    "react",
    "react.js",
    "reactjs",
    "angular",
    "vue",
    "vuejs",
    "javascript",
    "js",
    "typescript",
    "ts",
    "html",
    "css",
    "sass",
    "less",
    "webpack",
    "vite",
    "rollup",
    "babel",
    "node",
    "express",
    "performance",
    "optimization",
    "accessibility",
    "a11y",
    "wcag",
    "testing",
    "unit",
    "integration",
    "jest",
    "mocha",
    "ssr",
    "ssg",
    "server-side",
    "server side",
    "static site",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "cloud",
    "git",
    "github",
    "rest",
    "graphql",
    "api",
    "redux",
    "zustand",
    "mobx",
  ];

  const STOPWORDS = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "have",
    "will",
    "are",
    "you",
    "your",
    "our",
    "we",
    "a",
    "an",
    "to",
    "of",
    "in",
    "on",
    "as",
    "is",
    "be",
    "by",
    "or",
    "it",
    "at",
    "role",
    "job",
    "description",
    "responsible",
    "responsibilities",
    "experience",
    "required",
    "preferred",
    "skills",
    "knowledge",
  ]);

  const tokens = tokenize(text);
  const detectedTech = detectTechTerms(text, TECH_TERMS);
  const freq = buildFrequency(tokens, STOPWORDS);

  const GENERIC = new Set([
    "frontend",
    "engineer",
    "developer",
    "application",
    "applications",
    "web",
    "site",
    "sites",
    "build",
    "maintain",
  ]);

  const freqSorted = [...freq.entries()]
    .sort((a, b) => (a[1] > b[1] ? -1 : 1))
    .map(([t]) => t);

  const extraKeywords = freqSorted.filter((k) => !GENERIC.has(k));

  const keywords = Array.from(
    new Set([...detectedTech, ...extraKeywords])
  ).slice(0, 12);

  const orClauses = buildOrClauses(keywords);

  // No keyword match → fallback to highest ranked questions
  if (orClauses.length === 0) {
    const fallback = await Question.find({})
      .sort({ rank_value: -1 })
      .limit(n)
      .lean();

    return fallback.map((r) => String(r.question_id));
  }

  const candidates = await Question.find({ $or: orClauses }).limit(200).lean();

  const kwSet = new Set(keywords);

  const scored = candidates
    .map((doc) => scoreCandidate(doc, keywords, kwSet))
    .sort((a, b) => {
      // sort by score desc, then rankKey desc
      const s = b.score - a.score || b.rankKey - a.rankKey;
      return s;
    })
    .map((s) => s.doc);

  let results = [...scored];

  // Fill remaining slots if needed
  if (results.length < n) {
    const need = n - results.length;
    const excludeIds = new Set(results.map((r) => r.question_id));

    const fallback = await Question.find({
      question_id: { $nin: [...excludeIds] },
    })
      .sort({ rank_value: -1 })
      .limit(need)
      .lean();

    results = [...results, ...fallback];
  }

  // Normalize IDs
  const candidateIds = results.map((r) => r.question_id).filter(Boolean);
  const idsAsStr = [...new Set(candidateIds.map(String))];
  const idsAsNum = [
    ...new Set(candidateIds.map(Number).filter(Number.isFinite)),
  ];

  // Confirm which IDs exist in DB
  const foundDocs = await Question.find({
    $or: [
      { question_id: { $in: idsAsStr } },
      ...(idsAsNum.length ? [{ question_id: { $in: idsAsNum } }] : []),
    ],
  }).lean();

  const foundSet = new Set(foundDocs.map((d) => String(d.question_id)));
  const confirmed = idsAsStr.filter((id) => foundSet.has(id)).slice(0, n);

  // Fill missing if needed
  if (confirmed.length < n) {
    const need = n - confirmed.length;

    const fallback = await Question.find({
      question_id: { $nin: confirmed },
    })
      .sort({ rank_value: -1 })
      .limit(need)
      .lean();

    return [...confirmed, ...fallback.map((d) => String(d.question_id))].slice(
      0,
      n
    );
  }

  return confirmed;
}
