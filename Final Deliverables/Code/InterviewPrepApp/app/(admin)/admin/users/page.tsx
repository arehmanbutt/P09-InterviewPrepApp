"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
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
import type { SubscriptionTier } from "app/models/User";

interface UserRow {
  clerkId: string;
  email: string;
  tier: SubscriptionTier;
  status: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (q) params.set("search", q);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 403) throw new Error("Not authorized");
      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, search, fetchUsers]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const tierVariant: Record<SubscriptionTier, "free" | "pro" | "business"> = {
    free: "free",
    pro: "pro",
    business: "business",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Users" description={`${total} total users`} />

      <Input
        startIcon={<Search />}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search by email..."
        className="max-w-sm"
      />

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="No users found"
              description="Try adjusting your search."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.clerkId}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={tierVariant[u.tier]}>
                      {u.tier.charAt(0).toUpperCase() + u.tier.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === "active" ? "success" : "muted"}>{u.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
