"use client";

import { motion } from "framer-motion";
import { SignUpButton } from "@clerk/nextjs";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-6 pt-20 pb-24 sm:pt-32 sm:pb-32 lg:px-8">
      {/* Gradient mesh background */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-mesh opacity-60 dark:opacity-100"
        aria-hidden="true"
      />

      {/* Decorative blobs */}
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-accent opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI-powered interview prep for candidates & teams
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
        >
          Ace your next interview with{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI-powered practice
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl"
        >
          Practice real interview questions with an AI interviewer that adapts to your skill level.
          Get instant feedback on correctness, depth, and communication.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.26 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <SignUpButton mode="modal">
            <Button size="xl" className="group gap-2">
              Start Practicing Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </SignUpButton>
          <Button variant="outline" size="xl" asChild>
            <a href="#how-it-works">See how it works</a>
          </Button>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-primary text-primary" />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            No credit card required · 3 free interviews/month
          </p>
        </motion.div>
      </div>
    </section>
  );
}
