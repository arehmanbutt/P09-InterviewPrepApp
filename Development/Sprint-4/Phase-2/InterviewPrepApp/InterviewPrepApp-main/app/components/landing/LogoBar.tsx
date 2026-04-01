"use client";

import { motion } from "framer-motion";

const logos = ["Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix"];

export default function LogoBar() {
  return (
    <section className="border-y border-border bg-muted/30 py-10 px-6 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <p className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Trusted by candidates interviewing at top companies
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {logos.map((name, i) => (
            <motion.span
              key={name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="text-base font-semibold text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-default select-none"
            >
              {name}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
