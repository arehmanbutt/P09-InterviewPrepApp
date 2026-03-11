import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import CandidateSession from "app/models/CandidateSession";
import type { InterviewFeedback } from "app/models/Interview";
import Interview from "app/models/Interview";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import FeedbackPageTabs from "app/components/FeedbackPageTabs";
import type { TranscriptEntry } from "app/models/Interview";

export default async function CandidateFeedbackPage({
  params,
}: {
  params: Promise<{ token: string; sessionId: string }>;
}) {
  const { token, sessionId } = await params;

  const userId = await getAuthUserId();
  if (!userId) notFound();

  await connectDB();

  const session = await CandidateSession.findOne({ _id: sessionId }).lean();
  if (!session || (session.candidateUserId as string) !== userId) notFound();

  const interview = await Interview.findOne({ _id: session.interviewId })
    .select("title company")
    .lean();

  const feedback = session.feedback as InterviewFeedback | null;

  if (!feedback) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Interview Feedback</h1>
          <p className="text-gray-400 mb-1">Feedback is not yet available.</p>
          <p className="text-gray-500 text-sm mb-6">
            Feedback typically takes 10-15 seconds to generate.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href={`/join/${token}/feedback/${sessionId}`}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              <RefreshCw size={14} />
              Refresh
            </a>
            <Link
              href={`/join/${token}`}
              className="inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {(interview?.title as string) || "Interview Feedback"}
          </h1>
          <p className="text-gray-400 text-sm">
            {(interview?.company as string) || ""} {interview?.company ? "\u00B7 " : ""}
            {new Date(session.createdAt as Date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/candidate-sessions/${sessionId}/report`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg bg-[#3ecf8e] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#33b87a]"
          >
            <Download size={16} />
            Download PDF
          </a>
          <Link
            href={`/join/${token}`}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
      </div>

      <FeedbackPageTabs
        feedback={feedback}
        transcript={(session.transcript as TranscriptEntry[]) || []}
      />
    </div>
  );
}
