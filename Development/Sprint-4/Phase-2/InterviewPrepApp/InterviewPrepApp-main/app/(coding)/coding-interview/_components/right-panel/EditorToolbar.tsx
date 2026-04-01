"use client";

import { RotateCcw } from "lucide-react";

interface EditorToolbarProps {
  onReset: () => void;
}

export default function EditorToolbar({ onReset }: EditorToolbarProps) {
  return (
    <div className="bg-card border-b border-border px-4 py-1.5 flex items-center justify-between flex-shrink-0">
      <span className="text-xs text-muted-foreground font-medium">Code</span>
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
      >
        <RotateCcw className="w-3 h-3" />
        Reset
      </button>
    </div>
  );
}
