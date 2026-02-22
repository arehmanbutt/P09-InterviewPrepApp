// src/components/TranscriptScores.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

type PerQuestion = {
  question_id: string;
  combined_text?: string;
  score?: {
    overall_score?: number|null;
    coverage_score?: number|null;
    reasoning_score?: number|null;
    communication_score?: number|null;
    missed_points?: string[];
  } | null;
};

export default function TranscriptScores({ interviewId }: { interviewId: string }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const API = import.meta.env.VITE_API_URL || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [overall, setOverall] = useState<number|null>(null);
  const [items, setItems] = useState<PerQuestion[]>([]);

  async function getHeaders() {
    const headers: Record<string,string> = { "Content-Type": "application/json" };
    if (isLoaded && isSignedIn && getToken) {
      try {
        const token = await getToken({ template: "interview-backend" });
        if (token) headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        console.warn("getToken failed", err);
      }
    }
    return headers;
  }

  useEffect(() => {
    if (!interviewId) return;
    let mounted = true;

    async function fetchTranscript() {
      setLoading(true);
      setError(null);
      try {
        const headers = await getHeaders();
        const res = await fetch(`${API}/api/transcripts/${interviewId}`, {
          method: "GET",
          headers,
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(body?.message || `Server returned ${res.status}`);
        }
        const t = body?.transcript;
        if (!mounted) return;

        setOverall(t?.overallScore ?? null);
        // normalize perQuestion to our shape
        setItems((t?.perQuestion ?? []).map((p: any) => ({
          question_id: String(p.question_id),
          combined_text: p.combined_text ?? "",
          score: p.score ?? null,
        })));
      } catch (err: any) {
        console.error("fetchTranscript error", err);
        if (!mounted) return;
        setError(err?.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchTranscript();

    return () => { mounted = false; };
  }, [interviewId, isLoaded, isSignedIn]);

  if (!interviewId) return <div className="p-3 text-sm text-red-400">No interview selected</div>;
  if (loading) return <div className="p-3 text-sm text-gray-400">Loading scores…</div>;
  if (error) return <div className="p-3 text-sm text-red-400">Error: {error}</div>;

  return (
    <div className="p-4 bg-white/5 rounded-md">
      <h3 className="text-lg font-medium">Interview Scores</h3>
      <div className="mt-2 text-sm">Overall score: <strong>{overall ?? "N/A"}</strong></div>

      <div className="mt-4 space-y-3">
        {items.length === 0 && <div className="text-sm text-gray-400">No per-question data</div>}
        {items.map((q) => (
          <div key={q.question_id} className="p-3 bg-black/20 rounded">
            <div className="flex items-baseline justify-between">
              <div className="text-sm text-gray-100">Question ID: {q.question_id}</div>
              <div className="text-sm">
                Score: <strong>{q.score?.overall_score ?? "N/A"}</strong>
              </div>
            </div>
            {q.combined_text && <div className="mt-2 text-sm text-gray-300">Response: {q.combined_text}</div>}
            {q.score?.missed_points && q.score.missed_points.length > 0 && (
              <div className="mt-2 text-sm text-amber-300">
                <div className="font-medium">Missed points:</div>
                <ul className="list-disc ml-5">
                  {q.score.missed_points.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
