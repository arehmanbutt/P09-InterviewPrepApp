"use client";

import { motion } from "framer-motion";
import { Mic, Zap, BarChart3, BookOpen, Clock, Users, Code2, FileText } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { cn } from "@/app/lib/cn";

const features = [
  {
    icon: Mic,
    title: "AI Voice Interviews",
    description:
      "Practice with an AI interviewer that listens, responds, and adapts in real time via natural voice conversation.",
    color: "text-primary bg-primary/10",
  },
  {
    icon: Zap,
    title: "Instant Feedback",
    description:
      "Get detailed scoring on correctness, depth, and communication with actionable improvement tips.",
    color: "text-yellow-500 bg-yellow-500/10",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description:
      "Track your progress over time with charts, score breakdowns, and personalized improvement plans.",
    color: "text-accent bg-accent/10",
  },
  {
    icon: BookOpen,
    title: "Curated Question Bank",
    description:
      "Access thousands of real interview questions across different difficulty levels, topics, and roles.",
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    icon: Code2,
    title: "Coding Interviews",
    description:
      "Solve real coding problems in a full editor with JavaScript, Python, and C++ support.",
    color: "text-purple-500 bg-purple-500/10",
  },
  {
    icon: Clock,
    title: "Practice Anytime",
    description: "Available 24/7. Practice on your schedule with no booking or waiting required.",
    color: "text-orange-500 bg-orange-500/10",
  },
  {
    icon: Users,
    title: "Mass Interviews",
    description:
      "Screen multiple candidates with a single shareable link. Compare and rank them side by side.",
    color: "text-pink-500 bg-pink-500/10",
  },
  {
    icon: FileText,
    title: "PDF Reports",
    description:
      "Download professional feedback reports with scores, breakdowns, and recommendations.",
    color: "text-cyan-500 bg-cyan-500/10",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 sm:py-32 px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to ace your interview
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From voice practice to coding challenges, we cover every angle of interview preparation.
          </p>
        </ScrollReveal>

        <div className="mx-auto mt-16 grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md cursor-default"
            >
              <div
                className={cn(
                  "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
                  feature.color,
                )}
              >
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
