"use client";

import MonacoEditor from "@monaco-editor/react";
import type { Language } from "../../_lib/types";

interface CodeEditorProps {
  language: Language;
  code: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ language, code, onChange }: CodeEditorProps) {
  return (
    <MonacoEditor
      height="100%"
      language={language}
      value={code}
      onChange={(value) => onChange(value || "")}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        roundedSelection: false,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 16, bottom: 16 },
        fontFamily: "JetBrains Mono, Fira Code, monospace",
        fontLigatures: true,
      }}
    />
  );
}
