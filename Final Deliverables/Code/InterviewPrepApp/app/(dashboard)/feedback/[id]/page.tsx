import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUserId } from "app/lib/auth";
import { connectDB } from "app/lib/mongodb";
import Interview from "app/models/Interview";
import type { InterviewFeedback } from "app/models/Interview";
import { ArrowLeft, RefreshCw } from "lucide-react";
import ErrorBoundary from "../../../components/ErrorBoundary";
import DownloadReportButton from "../../../components/DownloadReportButton";
import FeedbackPageTabs from "../../../components/FeedbackPageTabs";
import type { TranscriptEntry } from "app/models/Interview";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { PageHeader } from "@/app/components/ui/page-header";

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
          <Card className="p-10 text-center">
            <h1 className="text-xl font-bold text-foreground mb-2">Interview Feedback</h1>
            <p className="text-muted-foreground mb-1">
              Feedback is not yet available for this interview.
            </p>
            <p className="text-sm text-muted-foreground/70 mb-6">
              Feedback typically takes 10-15 seconds to generate.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" asChild>
                <a href={`/feedback/${id}`}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title={interview.title as string}
          description={`${interview.company as string} · ${new Date(interview.createdAt as Date).toLocaleDateString()}`}
        >
          <div className="flex items-center gap-2">
            <DownloadReportButton reportUrl={`/api/interviews/${id}/report`} />
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </PageHeader>

        <FeedbackPageTabs
          feedback={feedback}
          transcript={(interview.transcript as TranscriptEntry[]) || []}
        />
      </div>
    </ErrorBoundary>
  );
}
