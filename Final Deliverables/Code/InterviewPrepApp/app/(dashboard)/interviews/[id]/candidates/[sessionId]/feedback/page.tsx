import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import Interview from "app/models/Interview";
import CandidateSession from "app/models/CandidateSession";
import type { InterviewFeedback } from "app/models/Interview";
import { ArrowLeft } from "lucide-react";
import FeedbackPageTabs from "app/components/FeedbackPageTabs";
import DownloadReportButton from "app/components/DownloadReportButton";
import type { TranscriptEntry } from "app/models/Interview";
import { Button } from "@/app/components/ui/button";
import { PageHeader } from "@/app/components/ui/page-header";

export default async function CreatorCandidateFeedbackPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;

  const userId = await getAuthUserId();
  if (!userId) notFound();

  await connectDB();

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
      <PageHeader
        title={session.candidateName as string}
        description={`${session.candidateEmail as string}${session.candidateEmail ? " · " : ""}${new Date(session.createdAt as Date).toLocaleDateString()}`}
      >
        <div className="flex items-center gap-2">
          <DownloadReportButton reportUrl={`/api/candidate-sessions/${sessionId}/report`} />
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/interviews/${id}/candidates`}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </PageHeader>

      <FeedbackPageTabs
        feedback={feedback}
        transcript={(session.transcript as TranscriptEntry[]) || []}
      />
    </div>
  );
}
