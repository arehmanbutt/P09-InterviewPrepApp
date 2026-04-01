export interface PricingFeature {
  text: string;
  included: boolean;
}

export interface PricingTier {
  name: string;
  tier: "free" | "pro" | "business";
  price: string;
  period: string;
  description: string;
  features: PricingFeature[];
  highlighted?: boolean;
  cta: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    tier: "free",
    price: "$0",
    period: "",
    description: "Get started with AI interview practice",
    cta: "Get Started",
    features: [
      { text: "3 voice interviews per month", included: true },
      { text: "10 coding problems per month", included: true },
      { text: "Basic feedback after each interview", included: true },
      { text: "Technical & HR interview modes", included: true },
      { text: "PDF reports", included: false },
      { text: "Resume parsing", included: false },
      { text: "Mass interviews", included: false },
      { text: "Team management", included: false },
      { text: "Analytics dashboard", included: false },
      { text: "Custom branding", included: false },
    ],
  },
  {
    name: "Pro",
    tier: "pro",
    price: "$9",
    period: "/month",
    description: "For serious job seekers who want an edge",
    highlighted: true,
    cta: "Upgrade to Pro",
    features: [
      { text: "Unlimited voice interviews", included: true },
      { text: "Unlimited coding problems", included: true },
      { text: "Detailed feedback & scoring", included: true },
      { text: "Technical & HR interview modes", included: true },
      { text: "PDF reports & downloads", included: true },
      { text: "Resume parsing for personalized Qs", included: true },
      { text: "Mass interviews", included: false },
      { text: "Team management", included: false },
      { text: "Analytics dashboard", included: false },
      { text: "Custom branding", included: false },
    ],
  },
  {
    name: "Business",
    tier: "business",
    price: "$49",
    period: "/month",
    description: "For teams screening candidates at scale",
    cta: "Upgrade to Business",
    features: [
      { text: "Unlimited voice interviews", included: true },
      { text: "Unlimited coding problems", included: true },
      { text: "Detailed feedback & scoring", included: true },
      { text: "Technical & HR interview modes", included: true },
      { text: "PDF reports & downloads", included: true },
      { text: "Resume parsing for personalized Qs", included: true },
      { text: "Mass interviews with shareable links", included: true },
      { text: "Team seats & role management", included: true },
      { text: "Analytics dashboard", included: true },
      { text: "Custom branding & white-label", included: true },
    ],
  },
];
