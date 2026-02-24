"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Users, Star, Copy, Check, Loader2, ArrowRight } from "lucide-react";

interface CandidateRow {
  _id: string;
  candidateName: string;
  candidateEmail: string;
  status: "scheduled" | "in-progress" | "completed";
  overallScore: number | null;
  createdAt: string;
}

const statusConfig = {
  scheduled: { label: "Scheduled", color: "bg-blue-500/20 text-blue-400" },
  "in-progress": {
    label: "In Progress",
    color: "bg-yellow-500/20 text-yellow-400",
  },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400" },
} as const;

export default function CandidatesPage() {
  const { id } = useParams<{ id: string }>();
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/interviews/${id}/candidates`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCandidates(data);
      })
      .catch(() => {
        toast.error("Failed to load candidates");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopyLink = async () => {
    try {
      // Fetch interview to get shareToken
      const res = await fetch(`/api/interviews/${id}`);
      const interview = await res.json();
      if (interview.shareToken) {
        await navigator.clipboard.writeText(
          `${window.location.origin}/join/${interview.shareToken}`,
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Invite link copied to clipboard");
      }
    } catch {
      toast.error("Failed to copy invite link");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[#3ecf8e]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users size={24} />
              Candidates
            </h1>
            <p className="text-sm text-gray-400">
              {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy Invite Link
            </>
          )}
        </button>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 backdrop-blur text-center">
          <Users size={48} className="text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No candidates yet</h2>
          <p className="text-gray-400">Share the invite link with candidates to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th
                  scope="col"
                  className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Candidate
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Score
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {candidates.map((c) => {
                const status = statusConfig[c.status];
                return (
                  <tr key={c._id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <p className="text-white font-medium text-sm">{c.candidateName}</p>
                      {c.candidateEmail && (
                        <p className="text-gray-500 text-xs">{c.candidateEmail}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {c.overallScore !== null ? (
                        <div className="flex items-center gap-1">
                          <Star size={14} className="fill-[#3ecf8e] text-[#3ecf8e]" />
                          <span className="text-white text-sm font-medium">
                            {c.overallScore.toFixed(1)}
                          </span>
                          <span className="text-gray-500 text-xs">/5</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">--</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-sm">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {c.status === "completed" && c.overallScore !== null && (
                        <Link
                          href={`/interviews/${id}/candidates/${c._id}/feedback`}
                          className="inline-flex items-center gap-1 text-sm text-[#3ecf8e] transition hover:text-[#33b87a]"
                        >
                          View Feedback
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
