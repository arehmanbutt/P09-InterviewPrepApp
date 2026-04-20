"use client";

import { SignUpButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { Button } from "@/app/components/ui/button";

export default function CTA() {
  return (
    <section className="py-24 sm:py-32 px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/5 p-12 text-center shadow-lg">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Ready to ace your interview?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
                Join thousands of developers who have landed their dream jobs with our platform.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <SignUpButton mode="modal">
                  <Button size="xl" className="group gap-2">
                    Start practicing now
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </SignUpButton>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">No credit card required</p>
            </div>

            {/* Decorative blobs */}
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
