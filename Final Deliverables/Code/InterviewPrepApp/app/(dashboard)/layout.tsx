"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import {
  List,
  Plus,
  Code2,
  CreditCard,
  Users,
  BarChart3,
  UserCircle,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "app/hooks/useSubscription";
import type { SubscriptionTier } from "app/models/User";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/app/components/ui/breadcrumb";
import { useBreadcrumbs } from "@/app/hooks/useBreadcrumbs";
import { cn } from "@/app/lib/cn";
import Logo from "@/app/components/landing/Logo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  requiredTier?: SubscriptionTier;
}

const navLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: List },
  { href: "/create-interview", label: "New Interview", icon: Plus },
  { href: "/coding-interview", label: "Practice", icon: Code2 },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, requiredTier: "business" },
  { href: "/team", label: "Team", icon: Users, requiredTier: "business" },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

const TIER_RANK: Record<SubscriptionTier, number> = { free: 0, pro: 1, business: 2 };

function isLinkVisible(link: NavLink, tier: SubscriptionTier): boolean {
  if (!link.requiredTier) return true;
  return TIER_RANK[tier] >= TIER_RANK[link.requiredTier];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const breadcrumbs = useBreadcrumbs();
  const { tier, isBusiness, isLoading } = useSubscription();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const visibleLinks = navLinks.filter((link) =>
    isLoading ? !link.requiredTier : isLinkVisible(link, tier),
  );

  const SidebarNav = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex flex-col gap-1 flex-1">
      <TooltipProvider delayDuration={0}>
        {visibleLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return collapsed ? (
            <Tooltip key={link.href}>
              <TooltipTrigger asChild>
                <Link
                  href={link.href}
                  onClick={onLinkClick}
                  className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-md transition-colors duration-150 mx-auto",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <link.icon className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{link.label}</TooltipContent>
            </Tooltip>
          ) : (
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
              <span className="truncate">{link.label}</span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 h-8 w-1 rounded-r-full bg-primary"
                />
              )}
            </Link>
          );
        })}
      </TooltipProvider>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:flex flex-col border-r border-border bg-card overflow-hidden shrink-0 relative"
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-3 h-14 px-4 border-b border-border shrink-0",
            collapsed && "justify-center px-2",
          )}
        >
          <Logo size={28} className="shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="font-semibold text-sm text-foreground overflow-hidden whitespace-nowrap"
              >
                InterviewPrepApp
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 relative">
          <SidebarNav />
        </div>

        {/* Bottom section */}
        <div
          className={cn(
            "border-t border-border p-3 flex flex-col gap-3 shrink-0",
            collapsed && "items-center",
          )}
        >
          {isBusiness && !collapsed && (
            <OrganizationSwitcher
              hidePersonal={false}
              afterCreateOrganizationUrl="/dashboard"
              afterSelectOrganizationUrl="/dashboard"
              afterLeaveOrganizationUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  organizationSwitcherTrigger:
                    "w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm text-foreground hover:bg-secondary transition",
                },
              }}
            />
          )}
          <button
            onClick={toggleCollapsed}
            className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors self-end"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </motion.aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4">
          {/* Mobile menu button */}
          <button
            className="md:hidden rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs (desktop) */}
          <div className="hidden md:block">
            {breadcrumbs.length > 0 ? (
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, i) => (
                    <BreadcrumbItem key={i}>
                      {i < breadcrumbs.length - 1 ? (
                        <>
                          <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                          <BreadcrumbSeparator />
                        </>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            ) : null}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
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
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-card border-r border-border md:hidden"
            >
              <div className="flex h-14 items-center justify-between px-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Logo size={28} />
                  <span className="font-semibold text-sm text-foreground">InterviewPrepApp</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <SidebarNav onLinkClick={() => setMobileOpen(false)} />
              </div>
              <div className="border-t border-border p-4 flex items-center gap-3">
                <UserButton afterSignOutUrl="/" />
                <span className="text-sm text-muted-foreground">Account</span>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
