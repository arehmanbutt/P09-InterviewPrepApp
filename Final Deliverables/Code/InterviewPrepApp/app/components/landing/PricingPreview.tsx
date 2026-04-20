"use client";

import Link from "next/link";
import { SignUpButton } from "@clerk/nextjs";
import { Check, X, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { PRICING_TIERS } from "app/lib/pricing";
import { ScrollReveal } from "./ScrollReveal";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/cn";

export default function PricingPreview() {
  return (
    <section id="pricing" className="py-24 sm:py-32 px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Start free and upgrade as you grow</p>
        </ScrollReveal>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-3">
          {PRICING_TIERS.map((plan, i) => (
            <motion.div
              key={plan.tier}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={cn(
                "relative rounded-2xl border p-8 shadow-sm",
                plan.highlighted
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card",
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                )}
              </div>

              <ul className="space-y-2.5 mb-8">
                {plan.features.slice(0, 6).map((f, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm">
                    {f.included ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.tier === "free" ? (
                <SignUpButton mode="modal">
                  <Button variant="outline" className="w-full">
                    {plan.cta}
                  </Button>
                </SignUpButton>
              ) : (
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "secondary"}
                  asChild
                >
                  <Link href="/sign-up">{plan.cta}</Link>
                </Button>
              )}
            </motion.div>
          ))}
        </div>

        <ScrollReveal className="mt-8 text-center">
          <Link href="/pricing" className="text-sm text-primary hover:underline underline-offset-4">
            See full feature comparison →
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
