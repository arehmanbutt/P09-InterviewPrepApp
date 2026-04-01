"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Menu, X, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/cn";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl shadow-sm"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Mic className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm text-foreground">InterviewPrepApp</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-6">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right: auth + theme */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <ThemeToggle />
          <SignedIn>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Get started</Button>
            </SignUpButton>
          </SignedOut>
        </div>

        {/* Mobile: theme + hamburger */}
        <div className="ml-auto flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="border-t border-border bg-background/95 backdrop-blur-xl px-4 py-4 md:hidden"
          >
            <div className="flex flex-col gap-1 mb-4">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="w-full rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <SignedIn>
                <Button variant="ghost" size="sm" asChild className="flex-1">
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    Dashboard
                  </Link>
                </Button>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm" className="flex-1">
                    Sign in
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm" className="flex-1">
                    Get started
                  </Button>
                </SignUpButton>
              </SignedOut>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
