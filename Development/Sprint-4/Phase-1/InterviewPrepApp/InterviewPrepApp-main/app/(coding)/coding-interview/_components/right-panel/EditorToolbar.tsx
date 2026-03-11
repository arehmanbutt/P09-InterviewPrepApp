"use client";

import { RotateCcw } from "lucide-react";

interface EditorToolbarProps {
  onReset: () => void;
}

export default function EditorToolbar({ onReset }: EditorToolbarProps) {
  return (
    <div className="bg-[#1a1a1a] border-b border-gray-800 px-4 py-1.5 flex items-center justify-between flex-shrink-0">
      <span className="text-xs text-gray-400 font-medium">Code</span>
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition"
      >
        <RotateCcw className="w-3 h-3" />
        Reset
      </button>
    </div>
  );
}
