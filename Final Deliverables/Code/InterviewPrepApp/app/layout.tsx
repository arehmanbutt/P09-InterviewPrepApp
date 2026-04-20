import type { ReactNode } from "react";
import { Inter, Fira_Code } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

import "./globals.css";

// next/font/google downloads and self-hosts fonts at build time.
// subsets: ["latin"] reduces Inter from 344KB → ~30KB and FiraCode from 296KB → ~25KB.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const fira = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira",
  display: "swap",
  // Only load weights actually used in the app
  weight: ["400", "500"],
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_PATH || "http://localhost:3000"),
  title: "InterviewPrepApp",
  description:
    "AI-powered interview preparation — practice with real questions, get instant feedback, and land your dream job.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          // Use hardcoded values — Clerk does NOT resolve CSS custom properties.
          // These match the dark-mode design tokens (default theme is dark).
          colorPrimary: "#3ecf8e", // --accent dark: hsl(160 60% 52%)
          colorBackground: "#0d0d14", // --card dark: hsl(240 8% 5.5%)
          colorInputBackground: "#09090f", // --background dark: hsl(240 10% 3.9%)
          colorText: "#fafafa", // --foreground dark: hsl(0 0% 98%)
          colorTextSecondary: "#9c9caa", // --muted-foreground dark
          colorDanger: "#f87171",
          borderRadius: "0.6rem",
          fontFamily: "inherit",
        },
        elements: {
          // --- Forms & modals ---
          card: "shadow-xl border border-[#1a1a29]",
          formButtonPrimary:
            "bg-[#3ecf8e] text-[#09090f] hover:bg-[#38c480] font-semibold transition-colors",
          socialButtonsBlockButton:
            "border-[#1a1a29] bg-[#0d0d14] text-[#fafafa] hover:bg-[#141420] transition-colors",
          formFieldInput:
            "bg-[#09090f] border-[#1a1a29] text-[#fafafa] focus:border-[#3ecf8e] focus:ring-[#3ecf8e]/20",
          footerActionLink: "text-[#3ecf8e] hover:text-[#38c480]",
          identityPreviewEditButton: "text-[#3ecf8e]",
          // --- UserButton popover ---
          userButtonPopoverCard: "bg-[#0d0d14] border border-[#1a1a29] shadow-2xl",
          userButtonPopoverActions: "bg-[#0d0d14]",
          userButtonPopoverActionButton:
            "text-[#fafafa] hover:bg-[#141420] hover:text-[#fafafa] transition-colors",
          userButtonPopoverActionButtonText: "text-[#fafafa]",
          userButtonPopoverActionButtonIcon: "text-[#9c9caa]",
          userButtonPopoverFooter: "border-t border-[#1a1a29] bg-[#0d0d14]",
          userButtonPopoverFooterPages: "text-[#9c9caa]",
          userButtonPopoverFooterPagesLink: "text-[#9c9caa] hover:text-[#fafafa]",
          // name + identifier shown at the top of the popover
          userPreviewMainIdentifier: "text-[#fafafa] font-semibold",
          userPreviewSecondaryIdentifier: "text-[#9c9caa]",
        },
      }}
    >
      <html
        lang="en"
        className={`${inter.variable} ${fira.variable} font-inter`}
        suppressHydrationWarning
      >
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange={false}
          >
            {children}
            <Toaster position="bottom-right" richColors closeButton />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
