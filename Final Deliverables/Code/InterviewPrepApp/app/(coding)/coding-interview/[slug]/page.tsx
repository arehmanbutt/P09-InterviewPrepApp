"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Problem } from "../_lib/types";
import CodingWorkspace from "../_components/CodingWorkspace";
import MobileGate from "app/components/MobileGate";

export default function ProblemPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProblem() {
      try {
        // Try fetching by titleSlug first, then by id
        const res = await fetch(`/api/leetcode/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setProblem(data.data ?? data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchProblem();
  }, [slug]);

  if (loading) {
    return (
      <div className="h-screen bg-[#0b0b0b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3ecf8e]" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="h-screen bg-[#0b0b0b] flex items-center justify-center text-gray-400">
        Problem not found.
      </div>
    );
  }

  return (
    <MobileGate>
      <CodingWorkspace problems={[problem]} />
    </MobileGate>
  );
}
