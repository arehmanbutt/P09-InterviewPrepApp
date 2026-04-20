"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "./ScrollReveal";
import { cn } from "@/app/lib/cn";

const faqs = [
  {
    q: "How does the AI interviewer work?",
    a: "Our AI interviewer uses real-time voice interaction powered by Deepgram and OpenAI. It listens to your responses, adapts the difficulty based on your performance, and provides detailed feedback on correctness, depth, and communication.",
  },
  {
    q: "What types of interviews can I practice?",
    a: "We support both Technical and HR interviews. Technical interviews cover data structures, algorithms, system design, and domain-specific topics. HR interviews focus on behavioral questions, communication, and cultural fit.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes! The free plan includes 3 voice interviews and 10 coding problems per month with basic feedback. Upgrade to Pro for unlimited access or Business for team features.",
  },
  {
    q: "How does the mass interview feature work?",
    a: "Business plan users can create a shareable interview link and send it to multiple candidates. Each candidate gets their own adaptive interview session with individual feedback. You can then compare and rank candidates side by side.",
  },
  {
    q: "Can I upload my resume for personalized questions?",
    a: "Pro and Business users can upload their resume (PDF or DOCX). Our AI analyzes your skills and experience to generate tailored interview questions relevant to your background.",
  },
  {
    q: "What coding languages are supported?",
    a: "Our coding interview platform supports JavaScript, Python, and C++. You get a full code editor with syntax highlighting, test case validation, and real-time execution.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 sm:py-32 px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <ScrollReveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Got questions? We have answers.</p>
        </ScrollReveal>

        <div className="mt-12 space-y-2">
          {faqs.map((faq, i) => (
            <ScrollReveal key={i} delay={i * 0.04}>
              <div
                className={cn(
                  "rounded-xl border border-border bg-card overflow-hidden transition-colors",
                  open === i && "border-primary/30",
                )}
              >
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left gap-3"
                >
                  <span className="text-sm font-medium text-foreground">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      open === i && "rotate-180 text-primary",
                    )}
                  />
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
