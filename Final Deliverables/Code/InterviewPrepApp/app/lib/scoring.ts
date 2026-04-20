/**
 * Topic-aware question scoring for adaptive interview selection.
 * Client-compatible — no server-only imports.
 */

import type { IPoolQuestion } from "./types";

// ---- Tag Normalization & Fuzzy Matching ----

const TAG_ALIASES: Record<string, string> = {
  asynchronous: "async",
  synchronous: "sync",
  js: "javascript",
  ts: "typescript",
  "react.js": "react",
  reactjs: "react",
  "react-hooks": "react",
  nextjs: "next",
  "next.js": "next",
  "node.js": "node",
  nodejs: "node",
  "vue.js": "vue",
  vuejs: "vue",
  "angular.js": "angular",
  angularjs: "angular",
  "version-control": "git",
  "version control": "git",
  "sql-joins": "sql",
  postgres: "postgresql",
  css3: "css",
  html5: "html",
  es6: "javascript",
  ecmascript: "javascript",
  oop: "object-oriented",
  "object oriented": "object-oriented",
  "ci/cd": "ci-cd",
  "ci cd": "ci-cd",
  restful: "rest",
  "rest-api": "rest",
  "graphql-api": "graphql",
  "unit-testing": "testing",
  "unit testing": "testing",
  "integration-testing": "testing",
  expressjs: "express",
  "express.js": "express",
  "spring-boot": "spring",
  springboot: "spring",
  scss: "css",
  "my-sql": "mysql",
};

/** Normalize a single tag to its canonical form */
export function normalizeTag(tag: string): string {
  const lower = tag.toLowerCase().trim();
  return TAG_ALIASES[lower] ?? lower;
}

/** Check if two tags match (exact after normalization + substring containment) */
export function tagsMatch(llmTag: string, poolTag: string): boolean {
  const a = normalizeTag(llmTag);
  const b = normalizeTag(poolTag);
  if (a === b) return true;
  // Require minimum length of 5 for substring matching to prevent
  // false positives like "sql" matching "mysql", "loop" matching "event-loop"
  const MIN_SUBSTR_LEN = 5;
  if (a.length >= MIN_SUBSTR_LEN && b.length >= MIN_SUBSTR_LEN) {
    if (a.includes(b) || b.includes(a)) return true;
  }
  return false;
}

// ---- Question Scoring ----

const TOPIC_WEIGHT = 0.7;
const DIFFICULTY_WEIGHT = 0.3;

export interface ScoredCandidate {
  question: IPoolQuestion;
  topicScore: number;
  difficultyScore: number;
  totalScore: number;
}

/**
 * Score a candidate question based on topic match and difficulty fit.
 */
export function scoreCandidate(
  question: IPoolQuestion,
  suggestedTopics: string[],
  targetDifficulty: number,
): ScoredCandidate {
  // Topic score: fraction of question tags that match any suggested topic
  let matchCount = 0;
  for (const qTag of question.tags) {
    for (const llmTopic of suggestedTopics) {
      if (tagsMatch(llmTopic, qTag)) {
        matchCount++;
        break;
      }
    }
  }

  const tagCoverage = question.tags.length > 0 ? matchCount / question.tags.length : 0;
  const topicCoverage =
    suggestedTopics.length > 0
      ? Math.min(matchCount, suggestedTopics.length) / suggestedTopics.length
      : 0;
  const topicScore = Math.max(tagCoverage, topicCoverage);

  // Difficulty score: inverse of distance from target (0-1)
  const diffDist = Math.abs(question.difficulty_score - targetDifficulty);
  const difficultyScore = 1 - diffDist / 4;

  const totalScore = TOPIC_WEIGHT * topicScore + DIFFICULTY_WEIGHT * difficultyScore;

  return { question, topicScore, difficultyScore, totalScore };
}

/**
 * Score and rank all remaining questions in the pool.
 * Returns sorted array (best first).
 */
export function rankCandidates(
  pool: IPoolQuestion[],
  suggestedTopics: string[],
  targetDifficulty: number,
): ScoredCandidate[] {
  return pool
    .map((q) => scoreCandidate(q, suggestedTopics, targetDifficulty))
    .sort((a, b) => b.totalScore - a.totalScore);
}
