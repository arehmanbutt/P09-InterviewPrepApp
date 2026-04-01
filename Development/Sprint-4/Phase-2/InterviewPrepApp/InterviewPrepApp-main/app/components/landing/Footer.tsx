import Link from "next/link";
import { Mic } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/pricing" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "FAQ", href: "/#faq" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card px-6 py-14 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Mic className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm text-foreground">InterviewPrepApp</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-powered interview preparation for job seekers and hiring teams.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} InterviewPrepApp. All rights reserved.</span>
          <span>Built with AI, for humans.</span>
        </div>
      </div>
    </footer>
  );
}
