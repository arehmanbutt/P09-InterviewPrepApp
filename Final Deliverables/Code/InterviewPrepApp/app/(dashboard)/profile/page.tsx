"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  User as UserIcon,
  FileText,
  CheckCircle,
  Trash2,
  Briefcase,
  AlignLeft,
  Clock,
  Camera,
} from "lucide-react";
import ResumeUpload from "app/components/ResumeUpload";
import { useSubscription } from "app/hooks/useSubscription";
import TierBadge from "app/components/subscription/TierBadge";
import UpgradePrompt from "app/components/subscription/UpgradePrompt";
import type { ResumeData } from "app/lib/resumeParser";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { PageHeader } from "@/app/components/ui/page-header";

interface InterviewSummary {
  id: string;
  title: string;
  createdAt: string;
  overallScore: number | null;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">No score</span>;
  const color =
    score >= 80
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : score >= 60
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {score}/100
    </span>
  );
}

export default function ProfilePage() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const { tier, isFree, isLoading: subLoading } = useSubscription();

  // Resume state
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile edit state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [loadingMongo, setLoadingMongo] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Interview history state
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(true);

  // Seed Clerk name fields once user loads
  useEffect(() => {
    if (clerkLoaded && user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
    }
  }, [clerkLoaded, user]);

  // Fetch resume data from existing /api/profile
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.resumeData) setResumeData(data.resumeData);
      })
      .catch(console.error)
      .finally(() => setLoadingProfile(false));
  }, []);

  // Fetch jobTitle + bio from MongoDB
  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setJobTitle(data.jobTitle ?? "");
          setBio(data.bio ?? "");
        }
      })
      .catch(console.error)
      .finally(() => setLoadingMongo(false));
  }, []);

  // Fetch interview history
  useEffect(() => {
    fetch("/api/user/interviews-summary")
      .then((r) => r.json())
      .then((data) => {
        if (data.interviews) setInterviews(data.interviews);
      })
      .catch(console.error)
      .finally(() => setLoadingInterviews(false));
  }, []);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      // Update Clerk name
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });

      // Update MongoDB fields
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, bio }),
      });

      if (!res.ok) throw new Error("MongoDB update failed");

      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

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

  const isPageLoading = !clerkLoaded || subLoading || loadingProfile || loadingMongo;

  if (isPageLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your profile and resume for personalized interviews"
      />

      {/* Avatar + Identity Card */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.fullName ?? "Profile photo"}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-2 ring-border">
                <UserIcon className="h-8 w-8 text-primary" />
              </div>
            )}
            <button
              onClick={() => openUserProfile()}
              title="Change photo"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted transition-colors"
            >
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Name + email */}
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
            {jobTitle && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{jobTitle}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Edit Profile Card */}
      <Card className="p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <UserIcon className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Edit Profile</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Update your display name, job title, and bio
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">First name</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                disabled={savingProfile}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">Last name</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                disabled={savingProfile}
              />
            </div>
          </div>

          {/* Job title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70 flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              Job title
            </label>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer"
              disabled={savingProfile}
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70 flex items-center gap-1">
              <AlignLeft className="h-3.5 w-3.5" />
              About me
            </label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short bio about yourself..."
              rows={3}
              disabled={savingProfile}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm">
              {savingProfile ? "Saving..." : "Save profile"}
            </Button>
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

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Clock className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Your last 5 completed interviews</p>
          </div>
        </div>

        {loadingInterviews ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : interviews.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No completed interviews yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Start a practice session to see your history here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {interviews.map((iv) => (
              <li key={iv.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{iv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(iv.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <ScoreBadge score={iv.overallScore} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
