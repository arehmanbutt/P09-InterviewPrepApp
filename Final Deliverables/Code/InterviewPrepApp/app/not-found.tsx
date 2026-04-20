"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Frown } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Frown className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-7xl font-bold text-foreground mb-3">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          This page doesn&apos;t exist or was moved.
        </p>
        <Button asChild size="lg">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
