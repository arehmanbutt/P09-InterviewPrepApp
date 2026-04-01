/**
 * Question selection logic — runs server-side at interview creation time only.
 * Ported from InterviewPrepApp/BackEnd/lib/selectQuestions.js
 */

import { connectDB } from "./mongodb";
import Question from "app/models/Question";
import type { IPoolQuestion } from "./types";

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
  "python",
  "django",
  "flask",
  "java",
  "spring",
  "go",
  "golang",
  "rust",
  "c++",
  "sql",
  "nosql",
  "mongodb",
  "postgresql",
  "mysql",
  "redis",
  "kafka",
  "rabbitmq",
  "microservices",
  "ci",
  "cd",
  "devops",
  "terraform",
  "ansible",
  "nginx",
  "linux",
];

/**
 * Language/framework/tool-specific terms — used to determine if a DB question
 * is truly relevant to the job's technology stack (not just generic overlap).
 */
const TECH_SPECIFIC = new Set([
  "react",
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
  "jest",
  "mocha",
  "docker",
  "kubernetes",
  "redux",
  "zustand",
  "mobx",
  "python",
  "django",
  "flask",
  "java",
  "spring",
  "go",
  "golang",
  "rust",
  "c++",
  "sql",
  "nosql",
  "mongodb",
  "postgresql",
  "mysql",
  "redis",
  "kafka",
  "rabbitmq",
  "terraform",
  "ansible",
  "nginx",
  "linux",
  "graphql",
  "aws",
  "azure",
  "gcp",
]);

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

const GENERIC = new Set([
  "frontend",
  "backend",
  "engineer",
  "developer",
  "application",
  "applications",
  "web",
  "site",
  "sites",
  "build",
  "maintain",
  "software",
  "senior",
  "junior",
  "lead",
  "team",
]);

export function extractKeywords(jobTitle: string, jobDescription: string): string[] {
  const text = `${jobTitle} ${jobDescription}`.toLowerCase();

  const tokens = text
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[^a-z0-9._\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  // Detect curated tech terms
  const detectedTech = new Set<string>();
  for (const term of TECH_TERMS) {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) detectedTech.add(term.replace(".", "").toLowerCase());
  }

  // Build frequency map
  const freq = new Map<string, number>();
  for (const t of tokens) {
    const token = t.toLowerCase();
    if (STOPWORDS.has(token) || token.length <= 2 || /^\d+$/.test(token)) {
      continue;
    }
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  const freqSorted = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tok]) => tok);

  const extraKeywords = freqSorted.filter((k) => !GENERIC.has(k));

  return Array.from(new Set([...Array.from(detectedTech), ...extraKeywords])).slice(0, 12);
}

export async function selectQuestions(
  jobTitle: string,
  jobDescription: string,
  totalQuestions = 10,
): Promise<IPoolQuestion[]> {
  await connectDB();

  const keywords = extractKeywords(jobTitle, jobDescription);

  // Build query clauses
  const orClauses: Record<string, unknown>[] = [];
  if (keywords.length) {
    orClauses.push({ tags: { $in: keywords } });
    for (const k of keywords) {
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      orClauses.push({
        question_title: { $regex: `\\b${escaped}\\b`, $options: "i" },
      });
      orClauses.push({
        question_text: { $regex: `\\b${escaped}\\b`, $options: "i" },
      });
    }
  }

  // If no keywords, return top-ranked questions
  if (orClauses.length === 0) {
    const fallback = await Question.find({}).sort({ rank_value: -1 }).limit(totalQuestions).lean();
    return fallback.map(docToPoolQuestion);
  }

  // Fetch candidates
  const candidates = await Question.find({ $or: orClauses }).limit(200).lean();

  // Identify which extracted keywords are technology-specific
  const techKeywords = keywords.filter((k) => TECH_SPECIFIC.has(k));
  const techKwSet = new Set(techKeywords);

  // Score candidates
  const kwSet = new Set(keywords);
  const scored = candidates.map((doc) => {
    let score = 0;
    let techTagScore = 0;
    if (Array.isArray(doc.tags)) {
      for (const t of doc.tags) {
        const tag = t ? String(t).toLowerCase() : "";
        if (kwSet.has(tag)) score += 5;
        if (techKwSet.has(tag)) techTagScore += 5;
      }
    }
    const title = String(doc.question_title || "").toLowerCase();
    const textField = String(doc.question_text || "").toLowerCase();
    for (const k of keywords) {
      if (title.includes(k)) score += 3;
      if (textField.includes(k)) score += 1;
    }
    return { doc, score, techTagScore, rankKey: (doc.rank_value as number) ?? 0 };
  });

  // Filter to relevant questions:
  // If the job has tech-specific keywords (python, react, etc.), require that
  // the question matches at least one tech-specific term in its tags.
  // This prevents "performance" or "testing" in a Python job from pulling in
  // JavaScript questions that happen to cover those generic topics.
  let relevant;
  if (techKeywords.length > 0) {
    relevant = scored.filter((s) => s.techTagScore > 0);
  } else {
    relevant = scored.filter((s) => s.score > 0);
  }

  // Add random jitter as tiebreaker within equal-score groups
  const withJitter = relevant.map((s) => ({ ...s, jitter: Math.random() }));
  withJitter.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((b.rankKey || 0) !== (a.rankKey || 0)) return (b.rankKey || 0) - (a.rankKey || 0);
    return a.jitter - b.jitter;
  });

  const orderedDocs = withJitter.map((s) => s.doc);

  // Return only the relevant matches, up to totalQuestions
  // Do NOT pad with unrelated top-ranked questions — let the caller
  // decide to use OpenAI generation if there aren't enough relevant results
  const results = orderedDocs.slice(0, totalQuestions);
  return results.map(docToPoolQuestion);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToPoolQuestion(doc: any): IPoolQuestion {
  return {
    question_id: String(doc.question_id || doc._id),
    question_title: doc.question_title || "",
    question_text: doc.question_text || "",
    answer_text: doc.answer_text || "",
    tags: doc.tags || [],
    difficulty_score: Number(doc.difficulty_score) || 3,
  };
}
