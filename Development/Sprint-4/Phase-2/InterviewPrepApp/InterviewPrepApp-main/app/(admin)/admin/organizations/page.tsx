"use client";

import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Card } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { PageHeader } from "@/app/components/ui/page-header";
import { EmptyState } from "@/app/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/data-table";

interface OrgRow {
  clerkOrgId: string;
  plan: string;
  seatLimit: number;
  branding: { companyName: string | null };
  createdAt: string;
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/organizations")
      .then((r) => {
        if (r.status === 403) throw new Error("Not authorized");
        return r.json();
      })
      .then((data) => setOrgs((data.organizations as OrgRow[]) ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Organizations" />

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Building2} title="No organizations yet" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Org ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((o) => (
                <TableRow key={o.clerkOrgId}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {o.clerkOrgId.slice(0, 16)}…
                  </TableCell>
                  <TableCell className="font-medium">{o.branding?.companyName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={o.plan === "business" ? "business" : "muted"}>{o.plan}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{o.seatLimit}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
