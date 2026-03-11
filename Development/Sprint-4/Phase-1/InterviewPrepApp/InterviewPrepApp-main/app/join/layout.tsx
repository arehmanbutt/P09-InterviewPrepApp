"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import GlobalGradient from "../components/landing/GlobalGradient";

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      <GlobalGradient />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b0b]/90 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-[#3ecf8e]">
            InterviewPrepApp
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
