"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { User as UserIcon, FileText, CheckCircle, Trash2 } from "lucide-react";
import ResumeUpload from "app/components/ResumeUpload";
import { useSubscription } from "app/hooks/useSubscription";
import TierBadge from "app/components/subscription/TierBadge";
import UpgradePrompt from "app/components/subscription/UpgradePrompt";
import type { ResumeData } from "app/lib/resumeParser";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Skeleton } from "@/app/components/ui/skeleton";
import { PageHeader } from "@/app/components/ui/page-header";

export default function ProfilePage() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const { tier, isFree, isLoading: subLoading } = useSubscription();
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.resumeData) {
          setResumeData(data.resumeData);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProfile(false));
  }, []);

  const handleResumeUploaded = async (data: ResumeData | null) => {
    setResumeData(data);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: data }),
      });
      if (res.ok) {
        toast.success(data ? "Resume saved to profile" : "Resume removed");
      } else {
        toast.error("Failed to save resume");
      }
    } catch {
      toast.error("Failed to save resume");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveResume = async () => {
    await handleResumeUploaded(null);
  };

  if (!clerkLoaded || subLoading || loadingProfile) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your profile and resume for personalized interviews"
      />

      {/* User Info Card */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <UserIcon className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-foreground">
                {user?.fullName ?? user?.firstName ?? "User"}
              </h2>
              <TierBadge tier={tier} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </Card>

      {/* Resume Section */}
      <Card className="p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <FileText className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Resume / CV</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Upload your resume to get personalized interview questions based on your background
            </p>
          </div>
        </div>

        {isFree ? (
          <UpgradePrompt feature="Resume parsing for personalized questions" requiredTier="pro" />
        ) : resumeData ? (
          <div>
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
              <CheckCircle className="h-5 w-5 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Resume uploaded</p>
                <p className="text-xs text-muted-foreground truncate">
                  {resumeData.name}
                  {resumeData.skills?.length > 0 && ` · ${resumeData.skills.length} skills`}
                  {resumeData.experience?.length > 0 &&
                    ` · ${resumeData.experience.length} positions`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleRemoveResume}
                disabled={saving}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Parsed details */}
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              {resumeData.skills?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-foreground/70">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeData.skills.slice(0, 15).map((skill, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-normal">
                        {skill}
                      </Badge>
                    ))}
                    {resumeData.skills.length > 15 && (
                      <span className="text-xs text-muted-foreground">
                        +{resumeData.skills.length - 15} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {resumeData.experience?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-foreground/70">Experience</p>
                  <div className="space-y-1">
                    {resumeData.experience.slice(0, 3).map((exp, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {exp.title} at {exp.company}
                        {exp.duration && ` · ${exp.duration}`}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {resumeData.education?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-foreground/70">Education</p>
                  <div className="space-y-1">
                    {resumeData.education.slice(0, 2).map((edu, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {edu.degree} — {edu.institution}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Replace resume */}
            <div className="mt-4">
              <p className="mb-2 text-xs text-muted-foreground">
                Upload a new resume to replace the current one
              </p>
              <ResumeUpload onResumeData={handleResumeUploaded} disabled={saving} />
            </div>
          </div>
        ) : (
          <ResumeUpload onResumeData={handleResumeUploaded} disabled={saving} />
        )}

        {saving && (
          <p className="mt-3 text-center text-xs text-muted-foreground animate-pulse">
            Saving to profile...
          </p>
        )}
      </Card>
    </div>
  );
}
