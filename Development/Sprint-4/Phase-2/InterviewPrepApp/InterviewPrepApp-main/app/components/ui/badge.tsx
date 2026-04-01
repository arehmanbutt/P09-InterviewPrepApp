import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        outline: "border-border text-foreground",
        success: "border-transparent bg-accent/10 text-accent",
        warning: "border-transparent bg-yellow-500/10 text-yellow-500",
        muted: "border-transparent bg-muted text-muted-foreground",
        // Status variants
        scheduled: "border-transparent bg-blue-500/10 text-blue-400",
        "in-progress": "border-transparent bg-yellow-500/10 text-yellow-400",
        completed: "border-transparent bg-accent/10 text-accent",
        // Tier variants
        free: "border-border bg-muted text-muted-foreground",
        pro: "border-transparent bg-primary/10 text-primary",
        business: "border-transparent bg-purple-500/10 text-purple-400",
        // Type variants
        technical: "border-transparent bg-cyan-500/10 text-cyan-400",
        hr: "border-transparent bg-orange-500/10 text-orange-400",
        coding: "border-transparent bg-purple-500/10 text-purple-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
