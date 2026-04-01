import * as React from "react";
import { cn } from "@/app/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, ...props }, ref) => {
    if (startIcon || endIcon) {
      return (
        <div className="relative flex items-center">
          {startIcon && (
            <span className="absolute left-3 flex items-center text-muted-foreground pointer-events-none [&_svg]:h-4 [&_svg]:w-4">
              {startIcon}
            </span>
          )}
          <input
            type={type}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              startIcon && "pl-9",
              endIcon && "pr-9",
              className,
            )}
            ref={ref}
            {...props}
          />
          {endIcon && (
            <span className="absolute right-3 flex items-center text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
              {endIcon}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
