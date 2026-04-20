"use client";

import { usePathname } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  "create-interview": "Create Interview",
  billing: "Billing",
  profile: "Profile",
  team: "Team",
  branding: "Branding",
  interviews: "Interviews",
  candidates: "Candidates",
  feedback: "Feedback",
  compare: "Compare",
  admin: "Admin",
  users: "Users",
  organizations: "Organizations",
  metrics: "Metrics",
  join: "Join",
  pricing: "Pricing",
  "coding-interview": "Coding",
  "coding-session": "Session",
};

export function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname();

  if (!pathname || pathname === "/") return [];

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Skip route group segments (e.g. (dashboard), (admin))
  const filteredSegments = segments.filter((s) => !s.startsWith("(") && !s.endsWith(")"));

  let accumulatedPath = "";

  filteredSegments.forEach((segment, index) => {
    accumulatedPath += `/${segment}`;

    // Skip dynamic segments (UUIDs, tokens, etc.)
    const isDynamic =
      /^[0-9a-f]{24}$/i.test(segment) || /^[0-9a-f-]{36}$/i.test(segment) || segment.length > 30;

    if (isDynamic) return;

    const label = ROUTE_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === filteredSegments.length - 1;

    breadcrumbs.push({
      label,
      href: isLast ? undefined : accumulatedPath,
    });
  });

  return breadcrumbs;
}
