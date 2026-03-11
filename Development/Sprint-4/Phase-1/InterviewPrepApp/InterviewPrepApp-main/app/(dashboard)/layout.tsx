"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { List, Plus, Menu, X, Code2 } from "lucide-react";
import GlobalGradient from "../components/landing/GlobalGradient";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: List },
  { href: "/create-interview", label: "New Interview", icon: Plus },
  { href: "/coding-interview", label: "Practice", icon: Code2 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      <GlobalGradient />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b0b]/90 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-[#3ecf8e]">
            InterviewPrepApp
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 transition ${
                    isActive
                      ? "text-white border-b-2 border-[#3ecf8e] pb-0.5"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            <UserButton afterSignOutUrl="/" />
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            className="md:hidden rounded-lg p-2 text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#0b0b0b]/95 backdrop-blur px-4 py-3 space-y-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            <div className="px-3 py-2">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
