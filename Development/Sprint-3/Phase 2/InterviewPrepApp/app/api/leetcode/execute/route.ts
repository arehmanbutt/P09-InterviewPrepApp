import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "app/lib/mongodb";
import { Problem } from "app/models/LeetcodeQuestion";

/** Maps frontend language names to Piston language identifiers */
const LANGUAGE_ALIASES: Record<string, string> = {
  javascript: "node",
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
    const { code, language, problemId } = body;

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

    const examples = problem.examples || [];
    if (examples.length === 0) {
      return NextResponse.json({ success: false, error: "No test cases" }, { status: 400 });
    }

    const results = [];
    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      const rawInput = (ex?.input ?? "").trim();
      const rawExpected = ex?.output ?? "";

      // Send raw input as-is — templates now match the problem's has_t flag
      const input = rawInput;

      const expected = normalizeOutput(rawExpected);

      let output = "",
        error = null,
        time = "N/A",
        passed = false;
      try {
        const result = await runOnPiston(code, language, input);
        output = normalizeOutput(result.run?.stdout ?? "");
        const stderr = (result.run?.stderr ?? "").trim();
        const exitCode = result.run?.code;
        time = result.run?.wall_time ? `${result.run.wall_time}s` : "N/A";

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
        hidden: i >= 2,
      });
    }

    const allPassed = results.every((r) => r.passed);

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
