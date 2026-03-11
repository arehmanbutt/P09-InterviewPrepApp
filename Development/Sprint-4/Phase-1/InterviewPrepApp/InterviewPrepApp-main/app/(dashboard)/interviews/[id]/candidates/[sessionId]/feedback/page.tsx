import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import Interview from "app/models/Interview";
import CandidateSession from "app/models/CandidateSession";
import type { InterviewFeedback } from "app/models/Interview";
import { ArrowLeft, Download } from "lucide-react";
import FeedbackPageTabs from "app/components/FeedbackPageTabs";
import type { TranscriptEntry } from "app/models/Interview";

export default async function CreatorCandidateFeedbackPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;

  const userId = await getAuthUserId();
  if (!userId) notFound();

  await connectDB();

  // Verify creator owns this interview
  const interview = await Interview.findOne({ _id: id, userId }).lean();
  if (!interview) notFound();

  const session = await CandidateSession.findOne({
    _id: sessionId,
    interviewId: id,
  }).lean();
  if (!session) notFound();

  const feedback = session.feedback as InterviewFeedback | null;
  if (!feedback) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{session.candidateName as string}</h1>
          <p className="text-gray-400 text-sm">
            {session.candidateEmail as string} {session.candidateEmail ? "\u00B7 " : ""}
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
            href={`/interviews/${id}/candidates`}
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
