import { useState, useRef, useCallback, useEffect } from "react";

interface UseResizableOptions {
  direction: "horizontal" | "vertical";
  initialRatio: number;
  min: number;
  max: number;
}

export function useResizable({ direction, initialRatio, min, max }: UseResizableOptions) {
  const [ratio, setRatio] = useState(initialRatio);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newRatio: number;
      if (direction === "horizontal") {
        newRatio = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        newRatio = ((e.clientY - rect.top) / rect.height) * 100;
      }
      setRatio(Math.min(Math.max(newRatio, min), max));
    },
    [isDragging, direction, min, max],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return { ratio, isDragging, containerRef, handleMouseDown };
}
