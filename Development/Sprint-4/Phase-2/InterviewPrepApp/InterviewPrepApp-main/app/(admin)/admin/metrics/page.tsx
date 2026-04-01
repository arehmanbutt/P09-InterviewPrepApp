"use client";

import { redirect } from "next/navigation";

// Metrics page redirects to overview for now — charts will be added as data grows
export default function AdminMetricsPage() {
  redirect("/admin");
}
