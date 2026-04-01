"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Software Engineer at Google",
    quote:
      "The adaptive difficulty was a game-changer. It felt like a real interview and the feedback helped me nail my actual interview.",
    avatar: "SC",
  },
  {
    name: "Marcus Johnson",
    role: "Frontend Developer at Stripe",
    quote:
      "I practiced 10+ interviews before my real one. The voice interaction is incredibly natural and the scoring is spot-on.",
    avatar: "MJ",
  },
  {
    name: "Priya Patel",
    role: "HR Manager at Shopify",
    quote:
      "We use the mass interview feature to screen 50+ candidates a week. The candidate comparison saves our team hours.",
    avatar: "PP",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 sm:py-32 px-6 lg:px-8 bg-muted/20">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Loved by candidates and hiring teams
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands who have leveled up their interview game
          </p>
        </ScrollReveal>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <Quote className="absolute top-5 right-5 h-8 w-8 text-primary/10" />

              {/* Stars */}
              <div className="mb-4 flex gap-0.5">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
