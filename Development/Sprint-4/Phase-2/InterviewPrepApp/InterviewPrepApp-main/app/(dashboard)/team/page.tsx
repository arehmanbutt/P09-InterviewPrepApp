"use client";

import { useOrganization } from "@clerk/nextjs";
import { OrganizationProfile, CreateOrganization } from "@clerk/nextjs";
import { Users } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { PageHeader } from "@/app/components/ui/page-header";
import { EmptyState } from "@/app/components/ui/empty-state";

export default function TeamPage() {
  const { organization, isLoaded } = useOrganization();

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <PageHeader
          title="Team Management"
          description="Create an organization to collaborate with your team"
        />
        <Card className="p-8">
          <EmptyState
            icon={Users}
            title="No Organization Yet"
            description="Create an organization to invite team members, share interviews, and access Business features like analytics and candidate comparison."
          />
          <div className="mt-8 flex justify-center">
            <CreateOrganization
              afterCreateOrganizationUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "bg-card border border-border shadow-none",
                  headerTitle: "text-foreground",
                  headerSubtitle: "text-muted-foreground",
                },
              }}
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Team Management"
        description={`Manage members, roles, and settings for ${organization.name}`}
      />

      <OrganizationProfile
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-card border border-border shadow-none w-full rounded-xl",
            navbar: "bg-muted/50 border-r border-border",
            navbarButton: "text-muted-foreground hover:text-foreground hover:bg-muted",
            navbarButtonActive: "text-foreground bg-muted",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            membersPageInviteButton: "bg-primary text-primary-foreground hover:bg-primary/90",
            tableHead: "text-muted-foreground",
            tableBody: "text-foreground",
          },
        }}
      />
    </div>
  );
}
