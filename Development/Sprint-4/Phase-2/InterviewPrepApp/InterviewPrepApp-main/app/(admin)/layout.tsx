"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Building2,
  Menu,
  X,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/app/lib/cn";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const NavLinks = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {adminLinks.map((link) => {
        const isActive =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <link.icon className="h-4 w-4 shrink-0" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-56 flex-shrink-0 border-r border-border bg-card md:flex flex-col">
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-4 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
            <Shield className="h-4 w-4 text-destructive" />
          </div>
          <span className="text-sm font-semibold text-foreground">Admin Panel</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="border-t border-border p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Badge variant="destructive" className="text-xs">
            Admin
          </Badge>
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-card border-r border-border md:hidden"
            >
              <div className="flex h-14 items-center justify-between px-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
                    <Shield className="h-4 w-4 text-destructive" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">Admin Panel</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <NavLinks onLinkClick={() => setMobileOpen(false)} />
              </div>
              <div className="border-t border-border p-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to Dashboard
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
