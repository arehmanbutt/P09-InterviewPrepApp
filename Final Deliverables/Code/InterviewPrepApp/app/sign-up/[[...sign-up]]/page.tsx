"use client";

import { SignUp } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import Link from "next/link";
import Logo from "@/app/components/landing/Logo";

function getClerkAppearance(dark: boolean) {
  return dark
    ? {
        variables: {
          colorPrimary: "#3ecf8e",
          colorBackground: "#0d0d14",
          colorInputBackground: "#09090f",
          colorText: "#fafafa",
          colorTextSecondary: "#9c9caa",
          colorDanger: "#f87171",
          borderRadius: "0.6rem",
          fontFamily: "inherit",
        },
        elements: {
          card: "shadow-2xl border border-white/[0.06]",
          formButtonPrimary:
            "bg-[#3ecf8e] text-[#09090f] hover:bg-[#38c480] font-semibold transition-colors",
          socialButtonsBlockButton:
            "border-white/10 bg-white/5 text-[#fafafa] hover:bg-white/10 transition-colors",
          formFieldInput: "bg-[#09090f] border-white/10 text-[#fafafa] focus:border-[#3ecf8e]/50",
          footerActionLink: "text-[#3ecf8e] hover:text-[#38c480]",
          identityPreviewEditButton: "text-[#3ecf8e]",
        },
      }
    : {
        variables: {
          colorPrimary: "#0fb860",
          colorBackground: "#ffffff",
          colorInputBackground: "#f9fafb",
          colorText: "#09090f",
          colorTextSecondary: "#6b7280",
          colorDanger: "#dc2626",
          borderRadius: "0.6rem",
          fontFamily: "inherit",
        },
        elements: {
          card: "shadow-xl border border-gray-200",
          formButtonPrimary:
            "bg-[#0fb860] text-white hover:bg-[#0ea854] font-semibold transition-colors",
          socialButtonsBlockButton:
            "border-gray-200 bg-white text-gray-900 hover:bg-gray-50 transition-colors",
          formFieldInput: "bg-white border-gray-200 text-gray-900 focus:border-[#0fb860]/50",
          footerActionLink: "text-[#0fb860] hover:text-[#0ea854]",
          identityPreviewEditButton: "text-[#0fb860]",
        },
      };
}

export default function SignUpPage() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";

  return (
    <div className="relative min-h-screen flex flex-col bg-background overflow-hidden">
      {/* Background gradient orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Green orb — top left */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />
        {/* Purple orb — bottom right */}
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[140px]" />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center h-16 px-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo size={32} />
          <span className="font-semibold text-foreground">InterviewPrepApp</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px]">
          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Start practicing interviews with AI today
            </p>
          </div>

          {/* Clerk form */}
          <SignUp appearance={getClerkAppearance(dark)} />
        </div>
      </main>
    </div>
  );
}
