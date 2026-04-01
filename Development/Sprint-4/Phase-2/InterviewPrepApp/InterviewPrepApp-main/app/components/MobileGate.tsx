"use client";

import Link from "next/link";
import { Monitor } from "lucide-react";
import { useIsMobile } from "app/hooks/useIsMobile";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";

interface MobileGateProps {
  children: React.ReactNode;
}

export default function MobileGate({ children }: MobileGateProps) {
  const { isMobile, isLoaded } = useIsMobile();

  if (!isLoaded) return <>{children}</>;

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center bg-background">
        <Card className="p-10 max-w-sm w-full">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-primary/10 mx-auto">
            <Monitor className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-foreground">Desktop Required</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            The coding editor requires a larger screen. Please switch to a desktop or laptop device
            to access coding interviews.
          </p>
          <Button asChild className="w-full">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
