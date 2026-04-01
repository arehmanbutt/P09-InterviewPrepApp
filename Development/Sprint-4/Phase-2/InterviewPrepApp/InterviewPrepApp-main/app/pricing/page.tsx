import Link from "next/link";
import { SignUpButton } from "@clerk/nextjs";
import { Check, X, Sparkles } from "lucide-react";
import Header from "app/components/landing/Header";
import Footer from "app/components/landing/Footer";
import { PRICING_TIERS } from "app/lib/pricing";
import { cn } from "@/app/lib/cn";

export const metadata = {
  title: "Pricing - InterviewPrepApp",
  description: "Simple, transparent pricing for individuals and teams.",
};

const featureRows = [
  {
    category: "Interviews",
    features: [
      { name: "Voice interviews per month", values: ["3", "Unlimited", "Unlimited"] },
      { name: "Technical interviews", values: [true, true, true] },
      { name: "HR/Behavioral interviews", values: [true, true, true] },
      { name: "Adaptive difficulty", values: [true, true, true] },
      { name: "Resume-based questions", values: [false, true, true] },
      { name: "Mass interviews", values: [false, false, true] },
    ],
  },
  {
    category: "Coding",
    features: [
      { name: "Coding problems per month", values: ["10", "Unlimited", "Unlimited"] },
      { name: "JavaScript, Python, C++", values: [true, true, true] },
      { name: "Test case validation", values: [true, true, true] },
    ],
  },
  {
    category: "Feedback & Reports",
    features: [
      { name: "Basic feedback", values: [true, true, true] },
      { name: "Detailed scoring breakdown", values: [false, true, true] },
      { name: "PDF report downloads", values: [false, true, true] },
      { name: "Candidate comparison", values: [false, false, true] },
      { name: "CSV export", values: [false, false, true] },
    ],
  },
  {
    category: "Team & Business",
    features: [
      { name: "Team seats & roles", values: [false, false, true] },
      { name: "Organization management", values: [false, false, true] },
      { name: "Analytics dashboard", values: [false, false, true] },
      { name: "Custom branding", values: [false, false, true] },
    ],
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm text-foreground">{value}</span>;
  }
  return value ? (
    <Check className="mx-auto h-5 w-5 text-accent" />
  ) : (
    <X className="mx-auto h-5 w-5 text-muted-foreground/30" />
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground sm:text-5xl">Pricing</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Upgrade when you need more.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PRICING_TIERS.map((plan) => (
              <div
                key={plan.tier}
                className={cn(
                  "relative rounded-2xl border p-8 transition-all",
                  plan.highlighted ? "border-primary/40 bg-primary/5" : "border-border bg-card",
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-6">
                  <SignUpButton mode="modal">
                    <button
                      className={cn(
                        "w-full rounded-lg py-2.5 text-sm font-medium transition",
                        plan.highlighted
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-border text-foreground hover:bg-muted",
                      )}
                    >
                      {plan.cta}
                    </button>
                  </SignUpButton>
                </div>
              </div>
            ))}
          </div>

          {/* Full comparison table */}
          <div className="mt-20">
            <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
              Full feature comparison
            </h2>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-5 py-4 text-left text-sm font-medium text-muted-foreground">
                      Feature
                    </th>
                    {PRICING_TIERS.map((plan) => (
                      <th
                        key={plan.tier}
                        className="px-5 py-4 text-center text-sm font-semibold text-foreground"
                      >
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureRows.map((group) => (
                    <>
                      <tr key={group.category}>
                        <td
                          colSpan={4}
                          className="border-t border-border bg-muted/20 px-5 py-3 text-xs font-bold uppercase tracking-wider text-primary"
                        >
                          {group.category}
                        </td>
                      </tr>
                      {group.features.map((feature) => (
                        <tr
                          key={feature.name}
                          className="border-t border-border/50 hover:bg-muted/20"
                        >
                          <td className="px-5 py-3 text-sm text-muted-foreground">
                            {feature.name}
                          </td>
                          {feature.values.map((val, i) => (
                            <td key={i} className="px-5 py-3 text-center">
                              <CellValue value={val} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Back link */}
          <div className="mt-12 text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
