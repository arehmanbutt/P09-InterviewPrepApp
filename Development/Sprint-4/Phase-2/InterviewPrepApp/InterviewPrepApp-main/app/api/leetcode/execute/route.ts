import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "app/lib/mongodb";
import { getAuthUserId } from "app/lib/auth";
import { Problem } from "app/models/LeetcodeQuestion";
import CodingInterview from "app/models/CodingInterview";
import Submission from "app/models/Submission";

/** Maps frontend language names to Piston language identifiers */
const LANGUAGE_ALIASES: Record<string, string> = {
  javascript: "javascript",
  python: "python",
  cpp: "gcc",
};

// Normalize: strip trailing slashes and any path, always use /api/v2
const PISTON_HOST = (process.env.PISTON_API_URL || "http://localhost:2000")
  .replace(/\/+$/, "")
  .replace(/\/api\/v2(\/.*)?$/, "");
const PISTON_EXEC_URL = `${PISTON_HOST}/api/v2/execute`;
const PISTON_RUNTIMES_URL = `${PISTON_HOST}/api/v2/runtimes`;

/** Cache of resolved language → version from Piston runtimes endpoint */
let runtimeCache: Record<string, string> | null = null;

async function resolveRuntimes(): Promise<Record<string, string>> {
  if (runtimeCache) return runtimeCache;

  const res = await fetch(PISTON_RUNTIMES_URL);
  if (!res.ok) throw new Error(`Failed to fetch Piston runtimes: ${res.status}`);
  const runtimes: { language: string; version: string; aliases?: string[] }[] = await res.json();

  const map: Record<string, string> = {};
  for (const rt of runtimes) {
    map[rt.language] = rt.version;
    for (const alias of rt.aliases ?? []) {
      map[alias] = rt.version;
    }
  }
  runtimeCache = map;
  return map;
}

/** Normalize output for comparison: trim each line's trailing whitespace, normalize line endings */
function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

/**
 * Deep-compare two values for LeetCode-style output matching.
 * Handles JSON arrays/objects, whitespace differences, boolean formatting, etc.
 */
function leetcodeOutputMatch(actual: string, expected: string): boolean {
  const a = actual.trim();
  const e = expected.trim();

  // Exact match
  if (a === e) return true;

  // Try JSON deep compare (handles [0,1] vs [0, 1], etc.)
  try {
    const aJson = JSON.parse(a);
    const eJson = JSON.parse(e);
    return JSON.stringify(aJson) === JSON.stringify(eJson);
  } catch {
    // Not valid JSON — continue
  }

  // Boolean normalization
  if (
    ((a === "true" || a === "True") && (e === "true" || e === "True")) ||
    ((a === "false" || a === "False") && (e === "false" || e === "False"))
  ) {
    return true;
  }

  // Float tolerance (5 decimal places)
  const aNum = parseFloat(a);
  const eNum = parseFloat(e);
  if (!isNaN(aNum) && !isNaN(eNum)) {
    return Math.abs(aNum - eNum) < 1e-4;
  }

  return false;
}

async function runOnPiston(code: string, language: string, stdin: string) {
  const pistonLang = LANGUAGE_ALIASES[language];
  if (!pistonLang) throw new Error(`Unsupported language: ${language}`);

  const runtimes = await resolveRuntimes();
  const version = runtimes[pistonLang];
  if (!version) throw new Error(`Runtime "${pistonLang}" not installed in Piston`);

  console.log(
    `[PISTON REQUEST] language=${pistonLang} version=${version} stdin length=${stdin.length}`,
  );
  const response = await fetch(PISTON_EXEC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: pistonLang,
      version,
      files: [{ content: code }],
      stdin,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[PISTON ERROR] status=${response.status} body=${text}`);
    throw new Error(`Piston HTTP ${response.status}: ${text}`);
  }

  const json = await response.json();
  console.log(
    `[PISTON RESPONSE] stdout length=${json.run?.stdout?.length} stderr length=${json.run?.stderr?.length} code=${json.run?.code}`,
  );
  return json;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { code, language, problemId, includeHidden, codingInterviewId } = body;
    console.log("hidden: ", includeHidden);

    if (!code || !language || !problemId) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    const problem = await Problem.findOne({ id: problemId });
    if (!problem) {
      return NextResponse.json({ success: false, error: "Problem not found" }, { status: 404 });
    }

    // Block interactive problems
    if (problem.is_interactive) {
      return NextResponse.json(
        {
          success: false,
          error: "Interactive problems cannot be executed automatically.",
        },
        { status: 400 },
      );
    }

    const isLeetCode = problem.problem_format === "leetcode";
    const examples = problem.examples || [];
    if (examples.length === 0) {
      return NextResponse.json({ success: false, error: "No test cases" }, { status: 400 });
    }

    const results = [];

    if (isLeetCode) {
      // --- LeetCode-style: append driver code, run on Piston ---
      const driverCode = (problem as unknown as Record<string, unknown>).driver_code as
        | Record<string, string>
        | undefined;
      const driver = driverCode?.[language];
      if (!driver) {
        return NextResponse.json(
          { success: false, error: `No driver code for language: ${language}` },
          { status: 400 },
        );
      }
      const fullCode = code + "\n\n" + driver;

      for (let i = 0; i < examples.length; i++) {
        const ex = examples[i];
        const rawInput = (ex?.input ?? "").trim();
        const rawExpected = (ex?.output ?? "").trim();

        let output = "",
          error = null,
          time = "N/A",
          passed = false;
        try {
          const startTime = Date.now();
          const result = await runOnPiston(fullCode, language, rawInput);
          const elapsed = Date.now() - startTime;

          output = normalizeOutput(result.run?.stdout ?? "");
          const stderr = (result.run?.stderr ?? "").trim();
          const exitCode = result.run?.code;
          time = `${elapsed}ms`;

          if (exitCode !== 0 && exitCode !== undefined) {
            error = stderr || `Exit code: ${exitCode}`;
            passed = false;
          } else {
            passed = leetcodeOutputMatch(output, rawExpected);
            if (stderr) {
              error = stderr;
            }
          }
        } catch (err: unknown) {
          error = err instanceof Error ? err.message : String(err);
          console.error(`[TEST CASE ${i + 1}] EXCEPTION: ${error}`);
        }

        results.push({
          testCase: i + 1,
          passed,
          input: rawInput.length > 200 ? rawInput.slice(0, 200) + "..." : rawInput,
          expected: rawExpected,
          output: output || "(no output)",
          time,
          error,
          hidden: false,
        });
      }

      // Run hidden tests for LeetCode problems when submitting
      if (includeHidden) {
        const hiddenExamples = problem.hidden_tests ?? [];
        for (let i = 0; i < hiddenExamples.length; i++) {
          const ex = hiddenExamples[i];
          const hiddenInput = (ex?.input ?? "").trim();
          const hiddenExpected = (ex?.output ?? "").trim();
          if (!hiddenInput || !hiddenExpected) continue;

          let output = "",
            error = null,
            time = "N/A",
            passed = false;
          try {
            const startTime = Date.now();
            const result = await runOnPiston(fullCode, language, hiddenInput);
            const elapsed = Date.now() - startTime;

            output = normalizeOutput(result.run?.stdout ?? "");
            const stderr = (result.run?.stderr ?? "").trim();
            const exitCode = result.run?.code;
            time = `${elapsed}ms`;

            if (exitCode !== 0 && exitCode !== undefined) {
              error = stderr || `Exit code: ${exitCode}`;
              passed = false;
            } else {
              passed = leetcodeOutputMatch(output, hiddenExpected);
              if (stderr) {
                error = stderr;
              }
            }
          } catch (err: unknown) {
            error = err instanceof Error ? err.message : String(err);
            console.error(`[HIDDEN TEST ${i + 1}] EXCEPTION: ${error}`);
          }

          results.push({
            testCase: examples.length + i + 1,
            passed,
            input: hiddenInput.length > 200 ? hiddenInput.slice(0, 200) + "..." : hiddenInput,
            expected: hiddenExpected,
            output: output || "(no output)",
            time,
            error,
            hidden: true,
          });
        }
      }
    } else {
      // --- Existing competitive path ---
      for (let i = 0; i < examples.length; i++) {
        const ex = examples[i];
        const rawInput = (ex?.input ?? "").trim();
        const rawExpected = ex?.output ?? "";
        const input = rawInput;
        const expected = normalizeOutput(rawExpected);

        let output = "",
          error = null,
          time = "N/A",
          passed = false;
        try {
          const startTime = Date.now();
          const result = await runOnPiston(code, language, input);
          const elapsed = Date.now() - startTime;

          output = normalizeOutput(result.run?.stdout ?? "");
          const stderr = (result.run?.stderr ?? "").trim();
          const exitCode = result.run?.code;
          time = `${elapsed}ms`;

          if (exitCode !== 0 && exitCode !== undefined) {
            error = stderr || `Exit code: ${exitCode}`;
            passed = false;
          } else {
            passed = output === expected;
            if (stderr) {
              error = stderr;
            }
          }
        } catch (err: unknown) {
          error = err instanceof Error ? err.message : String(err);
          console.error(`[TEST CASE ${i + 1}] EXCEPTION: ${error}`);
        }

        results.push({
          testCase: i + 1,
          passed,
          input: rawInput.length > 200 ? rawInput.slice(0, 200) + "..." : rawInput,
          expected,
          output: output || "(no output)",
          time,
          error,
          hidden: includeHidden ? false : i >= 2,
        });
      }

      if (includeHidden) {
        console.log("[HIDDEN] includeHidden=", includeHidden);
        console.log("[HIDDEN] hidden_tests count=", problem.hidden_tests?.length ?? 0);
        const hiddenExamples = problem.hidden_tests ?? [];
        for (let i = 0; i < hiddenExamples.length; i++) {
          const ex = hiddenExamples[i];
          const rawInput = (ex?.input ?? "").trim();
          const expected = (ex?.output ?? "").trim();
          if (!rawInput || !expected) continue;

          const firstLine = rawInput.split("\n")[0]?.trim() ?? "";
          const alreadyHasBatchHeader = /^\d+$/.test(firstLine) && rawInput.split("\n").length > 1;
          const input = problem.has_t && !alreadyHasBatchHeader ? `1\n${rawInput}` : rawInput;

          let output = "",
            error = null,
            passed = false,
            time = "N/A";
          try {
            const startTime = Date.now();
            const result = await runOnPiston(code, language, input);
            const elapsed = Date.now() - startTime;

            output = normalizeOutput(result.run?.stdout ?? "");
            const stderr = (result.run?.stderr ?? "").trim();
            const exitCode = result.run?.code;
            time = `${elapsed}ms`;

            if (exitCode !== 0 && exitCode !== undefined) {
              error = stderr || `Exit code: ${exitCode}`;
              passed = false;
            } else {
              passed = output === expected;
              if (stderr) {
                error = stderr;
              }
            }
          } catch (err: unknown) {
            error = err instanceof Error ? err.message : String(err);
            console.error(`[TEST CASE ${i + 1}] EXCEPTION: ${error}`);
          }

          results.push({
            testCase: examples.length + i + 1,
            passed,
            input: rawInput.length > 200 ? rawInput.slice(0, 200) + "..." : rawInput,
            expected,
            output: output || "(no output)",
            time,
            error,
            hidden: true,
          });
        }
      }
    }

    const allPassed = results.every((r) => r.passed);
    const totalPassed = results.filter((r) => r.passed).length;
    const totalTests = results.length;
    const avgTime = results[0]?.time ?? "N/A";

    // Save submission if this was a submit action (includeHidden)
    if (includeHidden) {
      const submissionStatus = allPassed ? "accepted" : "wrong_answer";

      try {
        const userId = await getAuthUserId();

        // Save to CodingInterview if part of a session
        if (codingInterviewId && userId) {
          const interview = await CodingInterview.findById(codingInterviewId);
          if (interview && interview.userId === userId) {
            const sub = interview.submissions.find((s) => s.problemId === problemId);
            if (sub) {
              sub.language = language;
              sub.code = code;
              sub.status = submissionStatus;
              sub.testsPassed = totalPassed;
              sub.testsTotal = totalTests;
              sub.runtime = avgTime;
              sub.submittedAt = new Date();
            }
            await interview.save();
          }
        }

        // Always save to standalone Submission for the problem browser
        if (userId) {
          await Submission.create({
            userId,
            problemId,
            language,
            code,
            status: submissionStatus,
            testsPassed: totalPassed,
            testsTotal: totalTests,
            runtime: avgTime,
          });
        }
      } catch (saveErr) {
        // Don't fail the execution response if saving fails
        console.error("[SAVE SUBMISSION] Error:", saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      allPassed,
      results,
    });
  } catch (error: unknown) {
    console.error("[EXECUTE] Unhandled error:", error);
    const errorString = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorString }, { status: 500 });
  }
}
