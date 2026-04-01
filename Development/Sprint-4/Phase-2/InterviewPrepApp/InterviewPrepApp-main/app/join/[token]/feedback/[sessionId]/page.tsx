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
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { PageHeader } from "@/app/components/ui/page-header";

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
        <Card className="p-10 text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Interview Feedback</h1>
          <p className="text-muted-foreground mb-1">Feedback is not yet available.</p>
          <p className="text-sm text-muted-foreground/70 mb-6">
            Feedback typically takes 10-15 seconds to generate.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="secondary" size="sm" asChild>
              <a href={`/join/${token}/feedback/${sessionId}`}>
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href={`/join/${token}`}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={(interview?.title as string) || "Interview Feedback"}
        description={`${(interview?.company as string) || ""}${interview?.company ? " · " : ""}${new Date(session.createdAt as Date).toLocaleDateString()}`}
      >
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <a href={`/api/candidate-sessions/${sessionId}/report`} target="_blank">
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/join/${token}`}>
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
