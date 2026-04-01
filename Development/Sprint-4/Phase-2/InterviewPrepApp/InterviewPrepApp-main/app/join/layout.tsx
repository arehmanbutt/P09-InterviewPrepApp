/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import BrandProvider from "../components/branding/BrandProvider";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import { Mic } from "lucide-react";

interface OrgBranding {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  companyName: string | null;
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [branding, setBranding] = useState<OrgBranding | null>(null);

  useEffect(() => {
    const match = pathname.match(/^\/join\/([^/]+)/);
    if (!match) return;
    const token = match[1];

    fetch(`/api/interviews/join/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.branding) setBranding(data.branding);
      })
      .catch(() => {
        // Branding is optional
      });
  }, [pathname]);

  const displayName = branding?.companyName ?? "InterviewPrepApp";
  const primaryColor = branding?.primaryColor ?? null;

  return (
    <BrandProvider primaryColor={branding?.primaryColor} secondaryColor={branding?.secondaryColor}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="container mx-auto px-4 h-14 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2.5">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt={displayName} className="h-7 w-7 object-contain" />
              ) : (
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: primaryColor ?? "hsl(var(--primary))" }}
                >
                  <Mic className="h-4 w-4" />
                </div>
              )}
              <span
                className="font-semibold text-sm"
                style={{ color: primaryColor ?? "hsl(var(--foreground))" }}
              >
                {displayName}
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-10">{children}</main>
      </div>
    </BrandProvider>
  );
}
