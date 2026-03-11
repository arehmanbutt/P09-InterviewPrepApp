"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

interface JoinInfo {
  status: "canJoin" | "resume" | "completed";
  sessionId?: string;
  interviewId?: string;
  title?: string;
  company?: string;
  description?: string;
  totalQuestions?: number;
  error?: string;
}

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [info, setInfo] = useState<JoinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/interviews/join/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          const errorMsg = data.error || "Failed to load interview";
          setError(errorMsg);
          toast.error(errorMsg);
          return;
        }
        setInfo(data);
      })
      .catch(() => {
        setError("Failed to load interview");
        toast.error("Failed to load interview");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/interviews/join/${token}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || "Failed to join interview";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      toast.success("Joining interview...");
      router.push(`/join/${token}/session/${data.sessionId}`);
    } catch {
      setError("Failed to join interview");
      toast.error("Failed to join interview");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[#3ecf8e]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <h1 className="text-xl font-bold text-white mb-2">Unable to Join</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  if (info.status === "completed") {
    return (
      <div className="max-w-md mx-auto">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur text-center">
          <CheckCircle2 size={48} className="text-[#3ecf8e] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Already Completed</h1>
          <p className="text-gray-400 mb-6">You have already completed this interview.</p>
          <button
            onClick={() => router.push(`/join/${token}/feedback/${info.sessionId}`)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3ecf8e] px-5 py-2.5 font-medium text-black transition hover:bg-[#33b87a]"
          >
            View Feedback
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (info.status === "resume") {
    return (
      <div className="max-w-md mx-auto">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur text-center">
          <h1 className="text-xl font-bold text-white mb-2">Interview In Progress</h1>
          <p className="text-gray-400 mb-6">
            You have an interview session in progress. Resume where you left off.
          </p>
          <button
            onClick={() => router.push(`/join/${token}/session/${info.sessionId}`)}
            className="inline-flex items-center gap-2 rounded-lg bg-yellow-500/20 px-5 py-2.5 font-medium text-yellow-400 transition hover:bg-yellow-500/30"
          >
            Resume Interview
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // canJoin
  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <h1 className="text-2xl font-bold text-white mb-1">{info.title}</h1>
        <p className="text-gray-400 mb-4">{info.company}</p>

        {info.description && (
          <p className="text-gray-300 text-sm mb-4 line-clamp-4">{info.description}</p>
        )}

        <div className="rounded-lg bg-white/5 px-4 py-3 mb-6">
          <p className="text-sm text-gray-400">
            <span className="text-white font-medium">{info.totalQuestions}</span> questions prepared
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#3ecf8e] px-5 py-3 font-semibold text-black transition hover:bg-[#33b87a] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {joining && <Loader2 size={18} className="animate-spin" />}
          {joining ? "Joining..." : "Start Interview"}
        </button>
      </div>
    </div>
  );
}
