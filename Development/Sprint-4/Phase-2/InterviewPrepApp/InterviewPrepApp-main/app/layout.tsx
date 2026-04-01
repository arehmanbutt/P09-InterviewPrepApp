import type { ReactNode } from "react";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

import "./globals.css";

const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  display: "fallback",
});
const fira = localFont({
  src: "./fonts/FiraCode-Variable.woff2",
  variable: "--font-fira",
  display: "fallback",
  adjustFontFallback: false,
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
          colorPrimary: "hsl(263, 70%, 50%)",
          colorBackground: "hsl(var(--card))",
          colorInputBackground: "hsl(var(--input))",
          colorText: "hsl(var(--foreground))",
          colorTextSecondary: "hsl(var(--muted-foreground))",
          borderRadius: "0.6rem",
        },
        elements: {
          card: "bg-card border border-border shadow-lg",
          headerTitle: "text-foreground",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton: "border-border bg-card text-foreground hover:bg-muted",
          formFieldInput: "bg-background border-input text-foreground",
          formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
          footerActionLink: "text-primary hover:text-primary/80",
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
