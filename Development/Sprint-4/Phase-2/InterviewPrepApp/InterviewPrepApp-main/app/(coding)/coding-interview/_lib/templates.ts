import type { Language, Example, Problem } from "./types";

/**
 * Get the code template for a problem.
 * For LeetCode problems, uses the DB-stored function stub.
 * For competitive problems, uses the stdin/stdout boilerplate.
 */
export function getTemplateForProblem(problem: Problem, language: Language): string {
  if (problem.problem_format === "leetcode" && problem.code_templates?.[language]) {
    return problem.code_templates[language]!;
  }
  return getDefaultTemplate(language, problem.has_t);
}

export function getDefaultTemplate(language: Language, hasT: boolean): string {
  if (hasT) {
    switch (language) {
      case "python":
        return `import sys\ninput = sys.stdin.readline\n\ndef solve():\n    # Write your solution here\n    pass\n\nt = int(input())\nfor _ in range(t):\n    solve()`;
      case "cpp":
        return `#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solve() {\n    // Write your solution here\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int t;\n    cin >> t;\n    while (t--) solve();\n    return 0;\n}`;
      case "javascript":
      default:
        return `const lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');\nlet idx = 0;\nconst t = parseInt(lines[idx++]);\n\nfor (let i = 0; i < t; i++) {\n    // Read input using lines[idx++]\n    // Write your solution here\n}`;
    }
  } else {
    switch (language) {
      case "python":
        return `import sys\ninput = sys.stdin.readline\n\n# Write your solution here\n`;
      case "cpp":
        return `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Write your solution here\n    return 0;\n}`;
      case "javascript":
      default:
        return `const lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');\nlet idx = 0;\n\n// Read input using lines[idx++]\n// Write your solution here\n`;
    }
  }
}

export function splitBatchForDisplay(examples: Example[], hasT: boolean): Example[] {
  if (!hasT || examples.length !== 1) {
    return examples.filter((ex) => ex.input.trim() !== "" || ex.output.trim() !== "").slice(0, 2);
  }

  const single = examples[0]!;
  const inputLines = single.input.split("\n").filter((l) => l.trim() !== "");
  const outputLines = single.output.split("\n").filter((l) => l.trim() !== "");
  const first = inputLines[0]?.trim() ?? "";
  const t = parseInt(first, 10);

  if (isNaN(t) || String(t) !== first || t <= 1) {
    return [single];
  }

  const body = inputLines.slice(1);
  const inferredLines = Math.max(1, Math.floor(body.length / t));
  const outputPerCase = Math.max(1, Math.floor(outputLines.length / t));

  if (body.length % inferredLines !== 0 || outputLines.length % outputPerCase !== 0) {
    return [single];
  }

  const splitExamples: Example[] = [];
  for (let i = 0; i < Math.min(t, 2); i++) {
    const inp = body
      .slice(i * inferredLines, (i + 1) * inferredLines)
      .join("\n")
      .trim();
    const out = outputLines
      .slice(i * outputPerCase, (i + 1) * outputPerCase)
      .join("\n")
      .trim();
    if (inp || out) splitExamples.push({ input: inp, output: out });
  }

  return splitExamples.length > 0 ? splitExamples : [single];
}

export function cleanStatementBody(raw: string): string {
  return raw
    .replace(/^[A-Z0-9]+\.\s+.+\n?/, "")
    .replace(/time limit per test[\s\S]{0,80}?(second[s]?)/gi, "")
    .replace(/memory limit per test[\s\S]{0,80}?(megabyte[s]?)/gi, "")
    .replace(/^input\s*$/gim, "")
    .replace(/^output\s*$/gim, "")
    .replace(/^standard input\s*$/gim, "")
    .replace(/^standard output\s*$/gim, "")
    .replace(
      /\n?(The first line contains|The only line|Each line|Input Format|Output Format|Constraints|Additional constraint|Note\s*$|Example[s]?\s*$)[\s\S]*/im,
      "",
    )
    .replace(/\${1,3}([^$]+)\${1,3}/g, "$1")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\texttt\{([^}]*)\}/g, "$1")
    .replace(/\\textbf\{([^}]*)\}/g, "$1")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\le\b/g, "≤")
    .replace(/\\ge\b/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\cdot/g, "·")
    .replace(/\\ldots/g, "...")
    .replace(/\\times/g, "×")
    .replace(/\\infty/g, "∞")
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "text-green-400";
    case "medium":
      return "text-yellow-400";
    case "hard":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}
