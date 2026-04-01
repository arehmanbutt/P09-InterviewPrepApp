"use client";

import { motion } from "framer-motion";
import { Plus, Mic, BarChart3 } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const steps = [
  {
    number: "01",
    icon: Plus,
    title: "Create an Interview",
    description:
      "Choose your job role, company, and interview type. Upload your resume for personalized questions.",
  },
  {
    number: "02",
    icon: Mic,
    title: "Practice with AI",
    description:
      "Have a real-time voice conversation with our AI interviewer. Questions adapt to your skill level.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Get Detailed Feedback",
    description:
      "Receive scores on correctness, depth, and communication with actionable improvement tips.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32 px-6 lg:px-8 bg-muted/30">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Start practicing in under a minute</p>
        </ScrollReveal>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="relative text-center"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-10 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-primary/40 to-transparent md:block" />
              )}

              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                <step.icon className="h-8 w-8 text-primary" />
              </div>

              <span className="mb-2 block text-xs font-bold tracking-widest text-primary uppercase">
                Step {step.number}
              </span>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
