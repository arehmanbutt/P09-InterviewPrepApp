"use client";

import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
}

export default function StatCard({ label, value, subtitle, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-gray-400">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3ecf8e]/10">
          <Icon className="h-4 w-4 text-[#3ecf8e]" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}
