import { useState, useRef, useEffect } from "react";
import type { Language, Problem } from "./types";
import { getTemplateForProblem } from "./templates";

function getCodeKey(problemId: string, lang: string, prefix?: string) {
  if (prefix) return `${prefix}-${problemId}-${lang}`;
  return `${problemId}-${lang}`;
}

export function useCodePersistence(
  problem: Problem | undefined,
  language: Language,
  sessionPrefix?: string,
) {
  const [code, setCode] = useState("");
  const codeMapRef = useRef<Record<string, string>>({});
  const currentCodeKey = useRef("");

  useEffect(() => {
    if (!problem) return;
    const key = getCodeKey(problem.id, language, sessionPrefix);
    if (key === currentCodeKey.current) return;
    currentCodeKey.current = key;

    // Try in-memory cache first
    if (codeMapRef.current[key] !== undefined) {
      setCode(codeMapRef.current[key]);
      return;
    }

    // Try localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`code-${key}`);
      if (saved !== null) {
        codeMapRef.current[key] = saved;
        setCode(saved);
        return;
      }
    }

    // Fall back to template
    const template = getTemplateForProblem(problem, language);
    codeMapRef.current[key] = template;
    setCode(template);
  }, [problem, language, sessionPrefix]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (problem) {
      const key = getCodeKey(problem.id, language, sessionPrefix);
      codeMapRef.current[key] = newCode;
      // Persist to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`code-${key}`, newCode);
        } catch {
          // localStorage full, ignore
        }
      }
    }
  };

  const resetCode = () => {
    if (!problem) return;
    const template = getTemplateForProblem(problem, language);
    const key = getCodeKey(problem.id, language, sessionPrefix);
    setCode(template);
    codeMapRef.current[key] = template;
    if (typeof window !== "undefined") {
      localStorage.setItem(`code-${key}`, template);
    }
  };

  return { code, setCode: handleCodeChange, resetCode };
}
