import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import Interview from "app/models/Interview";
import type { InterviewFeedback } from "app/models/Interview";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import ErrorBoundary from "../../../components/ErrorBoundary";
import FeedbackPageTabs from "../../../components/FeedbackPageTabs";
import type { TranscriptEntry } from "app/models/Interview";

export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId();
  if (!userId) notFound();

  await connectDB();
  const interview = await Interview.findOne({ _id: id, userId }).lean();
  if (!interview) notFound();

  const feedback = interview.feedback as InterviewFeedback | null;

  if (!feedback) {
    return (
      <ErrorBoundary>
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Interview Feedback</h1>
            <p className="text-gray-400 mb-1">Feedback is not yet available for this interview.</p>
            <p className="text-gray-500 text-sm mb-6">
              Feedback typically takes 10-15 seconds to generate.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a
                href={`/feedback/${id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                <RefreshCw size={14} />
                Refresh
              </a>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{interview.title as string}</h1>
            <p className="text-gray-400 text-sm">
              {interview.company as string} &middot;{" "}
              {new Date(interview.createdAt as Date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/interviews/${id}/report`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg bg-[#3ecf8e] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#33b87a]"
            >
              <Download size={16} />
              Download PDF
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>
          </div>
        </div>

        <FeedbackPageTabs
          feedback={feedback}
          transcript={(interview.transcript as TranscriptEntry[]) || []}
        />
      </div>
    </ErrorBoundary>
  );
}
