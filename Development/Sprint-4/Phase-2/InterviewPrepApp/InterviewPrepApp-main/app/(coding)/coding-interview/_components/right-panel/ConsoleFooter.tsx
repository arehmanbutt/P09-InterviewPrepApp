"use client";

import { ChevronUp, ChevronDown, Play, Loader2 } from "lucide-react";

interface ConsoleFooterProps {
  consoleExpanded: boolean;
  onToggleConsole: () => void;
  onRun: () => void;
  onSubmit: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
  disabled: boolean;
}

export default function ConsoleFooter({
  consoleExpanded,
  onToggleConsole,
  onRun,
  onSubmit,
  isRunning,
  isSubmitting,
  disabled,
}: ConsoleFooterProps) {
  return (
    <div className="bg-card border-t border-border px-4 py-2 flex items-center justify-between flex-shrink-0">
      <button
        onClick={onToggleConsole}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
      >
        {consoleExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5" />
        )}
        Console
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={onRun}
          disabled={disabled || isRunning || isSubmitting}
          className="flex items-center gap-1.5 bg-muted hover:bg-muted/70 text-foreground px-3.5 py-1.5 rounded-md text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          Run
        </button>
        <button
          onClick={onSubmit}
          disabled={disabled || isRunning || isSubmitting}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 py-1.5 rounded-md text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          Submit
        </button>
      </div>
    </div>
  );
}
