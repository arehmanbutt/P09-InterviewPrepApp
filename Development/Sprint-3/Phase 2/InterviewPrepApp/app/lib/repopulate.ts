// repopulate.ts
// Run: npx ts-node repopulate.ts new_dataset.json
// This drops the existing problems collection and repopulates from scratch with all data fixes applied.

import fs from "fs";
import mongoose from "mongoose";
import { Problem } from "../models/LeetcodeQuestion";

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

// ─── Known problem classifications (from dataset analysis) ───────────────────

const KNOWN_NO_T = new Set(["2181H", "2172K", "2145E"]);

const KNOWN_INTERACTIVE = new Set([
  "2193G",
  "2190C",
  "2179G",
  "2178E",
  "2178D",
  "2171F",
  "2170D",
  "2165C",
  "2164D",
  "2163D1",
  "2162G",
  "2162D",
]);

// ─── Types ───────────────────────────────────────────────────────────────────

type RawProblem = {
  id?: string;
  contestId?: number;
  index?: string;
  title?: string;
  tags?: unknown;
  difficulty_bucket?: string;
  cf_rating?: number;
  statement_markdown?: string | null;
  visible_examples?: unknown;
  [k: string]: unknown;
};

// ─── String cleaning helpers ─────────────────────────────────────────────────

/** Strip leading/trailing whitespace and normalize internal newlines */
function cleanInput(s: string): string {
  return s
    .replace(/\r\n/g, "\n") // normalize line endings
    .replace(/^\n+/, "") // remove leading newlines
    .replace(/\n+$/, "") // remove trailing newlines
    .trim();
}

function cleanOutput(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/^\n+/, "") // remove leading newlines
    .replace(/\n+$/, "") // remove trailing newlines
    .split("\n")
    .map((line) => line.trimEnd()) // remove trailing spaces from each line
    .join("\n")
    .trim();
}

// ─── Detection helpers ────────────────────────────────────────────────────────

/**
 * Detect has_t from the problem statement text rather than input data.
 * Codeforces problems use standard language like:
 *   "The first line contains the number of test cases t"
 *   "Each test case contains multiple test cases"
 * This catches 474/487 problems (97.3%). The remaining 13 are genuinely no-t.
 */
function detectHasTFromStatement(statement: string): boolean {
  const s = statement.toLowerCase();
  if (/number of test cases/.test(s)) return true;
  if (/multiple test cases/.test(s)) return true;
  if (/first line.*contains.*\bt\b/i.test(statement)) return true;
  if (/(\bt\b)\s*(—|--|-|:)\s*the number of test cases/i.test(statement)) return true;
  if (/each test case/i.test(statement)) return true;
  return false;
}

function detectInteractive(_input: string, output: string): boolean {
  const outLines = output.split("\n").map((l) => l.trim());
  const hasQuery = outLines.some((l) => l.startsWith("?"));
  const hasAnswer = outLines.some((l) => l.startsWith("!"));
  return hasQuery && hasAnswer;
}

function detectOutputType(output: string): "string" | "float" | "yes_no" {
  const lines = output
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return "string";

  // Check float
  const hasFloat = lines.some((l) => {
    const n = parseFloat(l);
    return !isNaN(n) && l.includes(".");
  });
  if (hasFloat) return "float";

  // Check yes/no
  const allYesNo = lines.every((l) => ["yes", "no"].includes(l.toLowerCase()));
  if (allYesNo) return "yes_no";

  return "string";
}

// ─── Example normalization ────────────────────────────────────────────────────

/**
 * Parse raw blobs, clean whitespace, classify example_type:
 * - Single blob → "batch"
 * - Multiple blobs → "individual"
 * No splitting, no has_t guessing — the caller determines has_t from the statement.
 */
function normalizeExamples(raw: unknown): {
  examples: { input: string; output: string }[];
  example_type: "batch" | "individual";
} {
  if (!raw) return { examples: [], example_type: "batch" };

  // Collect raw pairs
  let rawPairs: { input: string; output: string }[] = [];

  if (
    Array.isArray(raw) &&
    raw.length > 0 &&
    raw.every((x) => x && typeof x === "object" && ("input" in x || "output" in x))
  ) {
    rawPairs = (raw as { input?: unknown; output?: unknown }[]).map((obj) => ({
      input: String(obj.input ?? ""),
      output: String(obj.output ?? ""),
    }));
  } else if (raw && typeof raw === "object" && ("input" in raw || "output" in raw)) {
    const obj = raw as { input?: unknown; output?: unknown };
    rawPairs = [{ input: String(obj.input ?? ""), output: String(obj.output ?? "") }];
  } else {
    return { examples: [], example_type: "batch" };
  }

  // Clean all pairs
  const cleaned = rawPairs.map((p) => ({
    input: cleanInput(p.input),
    output: cleanOutput(p.output),
  }));

  // Filter out pairs where both input and output are empty
  const valid = cleaned.filter((p) => p.input.trim() !== "" || p.output.trim() !== "");

  if (valid.length === 0) return { examples: [], example_type: "batch" };

  return {
    examples: valid,
    example_type: valid.length === 1 ? "batch" : "individual",
  };
}

// ─── Statement parsing ────────────────────────────────────────────────────────

function firstNonEmptyLine(s?: string | null): string {
  if (!s) return "";
  for (const l of s.split(/\r?\n/)) if (l.trim()) return l.trim();
  return "";
}

function parseStatement(mdRaw?: string | null) {
  const defaultRes = { time: null as string | null, memory: null as string | null, body: "" };
  if (!mdRaw) return defaultRes;
  const md = String(mdRaw).replace(/\r\n/g, "\n");

  const timeRe = /time limit per test[\s\S]{0,80}?([0-9]+(?:\.[0-9]+)?\s*(?:seconds?|s))/i;
  const memRe = /memory limit per test[\s\S]{0,80}?([0-9]+(?:\.[0-9]+)?\s*(?:megabytes?|mb))/i;

  const timeMatch = md.match(timeRe);
  const memMatch = md.match(memRe);

  const time = timeMatch?.[1]?.trim() ?? null;
  const memory = memMatch?.[1]?.trim() ?? null;

  let body = md;
  if (timeMatch) body = body.replace(timeMatch[0], "");
  if (memMatch) body = body.replace(memMatch[0], "");

  const cutRe = /(Input\s*$|input\s*$|Output\s*$|output\s*$|Example\s*$|Examples\s*$|Note\s*$)/im;
  const idx = body.search(cutRe);
  if (idx !== -1) body = body.slice(0, idx);

  const leading = firstNonEmptyLine(body);
  if (leading && /^[A-Z]\.\s+/.test(leading)) {
    const pos = body.indexOf("\n");
    if (pos !== -1) body = body.slice(pos + 1);
  }

  body = body.replace(/\n{3,}/g, "\n\n").trim();
  return { time, memory, body };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const inputFile = argv[0] ?? "dataset.json";

  if (!fs.existsSync(inputFile)) {
    console.error("File not found:", inputFile);
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URL;
  if (!mongoUri) {
    console.error("Please set MONGO_URL environment variable.");
    process.exit(2);
  }

  let arr: RawProblem[] = [];
  try {
    arr = JSON.parse(fs.readFileSync(inputFile, "utf-8")) as RawProblem[];
    if (!Array.isArray(arr)) throw new Error("Expected top-level array");
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    process.exit(3);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  // Drop existing collection for clean repopulation
  console.log("Dropping existing problems collection...");
  await Problem.deleteMany({});
  console.log("Collection cleared.");

  let processed = 0;
  let skipped = 0;

  for (const rec of arr) {
    const id = rec.id ?? `${rec.contestId ?? ""}${rec.index ?? ""}`;
    const title = rec.title ?? firstNonEmptyLine(rec.statement_markdown ?? "") ?? id;
    const tags = Array.isArray(rec.tags) ? rec.tags.map(String) : [];
    const difficulty =
      rec.difficulty_bucket ??
      (rec.cf_rating !== null && rec.cf_rating !== undefined
        ? rec.cf_rating <= 1200
          ? "easy"
          : rec.cf_rating <= 1700
            ? "medium"
            : "hard"
        : "unknown");

    const parsed = parseStatement(rec.statement_markdown);

    const { examples, example_type } = normalizeExamples(rec.visible_examples);

    // Skip problems with no usable examples
    if (examples.length === 0) {
      console.log(`SKIP ${id} — no valid examples`);
      skipped++;
      continue;
    }

    // Skip problems where all examples have empty input AND empty output
    const allEmpty = examples.every((ex) => ex.input.trim() === "" && ex.output.trim() === "");
    if (allEmpty) {
      console.log(`SKIP ${id} — all examples empty`);
      skipped++;
      continue;
    }

    // Detect has_t from problem statement text (robust, catches 97.3% of cases)
    const hasTFromStatement = detectHasTFromStatement(rec.statement_markdown ?? "");
    const has_t = KNOWN_NO_T.has(id) ? false : hasTFromStatement;

    const firstExample = examples[0]!;
    const is_interactive =
      KNOWN_INTERACTIVE.has(id) || detectInteractive(firstExample.input, firstExample.output);

    const output_type = detectOutputType(examples.map((e) => e.output).join("\n"));

    const doc = {
      id,
      title,
      tags,
      difficulty_bucket: difficulty,
      time_limit: parsed.time,
      memory_limit: parsed.memory,
      stmt_body: parsed.body || String(rec.statement_markdown ?? "").trim(),
      examples,
      code_templates: {}, // no LLM — use static templates at runtime
      io_schema: {
        input_type: "unknown",
        output_type,
        input_format: "",
        output_format: "",
      },
      has_t,
      is_interactive,
      example_type,
    };

    try {
      await Problem.create(doc);
      processed++;
      if (processed % 50 === 0) {
        console.log(`Processed ${processed} / ${arr.length}...`);
      }
    } catch (e) {
      console.error(`Insert failed for ${id}:`, e);
    }
  }

  console.log(`\nDone.`);
  console.log(`  Inserted: ${processed}`);
  console.log(`  Skipped (no examples): ${skipped}`);
  console.log(`  Total in file: ${arr.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(10);
});
