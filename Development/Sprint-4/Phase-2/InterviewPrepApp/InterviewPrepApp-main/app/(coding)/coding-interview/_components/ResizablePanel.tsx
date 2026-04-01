"use client";

import { GripVertical } from "lucide-react";
import { useResizable } from "../_lib/useResizable";

interface ResizablePanelProps {
  direction: "horizontal" | "vertical";
  initialRatio?: number;
  min?: number;
  max?: number;
  children: [React.ReactNode, React.ReactNode];
}

export default function ResizablePanel({
  direction,
  initialRatio = 40,
  min = 20,
  max = 80,
  children,
}: ResizablePanelProps) {
  const { ratio, isDragging, containerRef, handleMouseDown } = useResizable({
    direction,
    initialRatio,
    min,
    max,
  });

  const isH = direction === "horizontal";

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex ${isH ? "flex-row" : "flex-col"} overflow-hidden relative`}
    >
      {/* Pointer-events overlay during drag to prevent Monaco stealing mouse */}
      {isDragging && (
        <div
          className="absolute inset-0 z-50"
          style={{ cursor: isH ? "col-resize" : "row-resize" }}
        />
      )}

      <div
        className={`overflow-hidden ${isH ? "" : ""}`}
        style={isH ? { width: `${ratio}%` } : { height: `${ratio}%` }}
      >
        {children[0]}
      </div>

      {/* Drag handle */}
      <div
        className={`${
          isH ? "w-1 hover:w-1.5 cursor-col-resize" : "h-1 hover:h-1.5 cursor-row-resize"
        } bg-gray-700 hover:bg-[#3ecf8e] transition-all duration-150 relative group flex-shrink-0 ${
          isDragging ? "bg-[#3ecf8e]" : ""
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-white">
          <GripVertical className={`w-4 h-4 ${isH ? "" : "rotate-90"}`} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">{children[1]}</div>
    </div>
  );
}
