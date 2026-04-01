"use client";

import { useEffect } from "react";

interface BrandProviderProps {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  children: React.ReactNode;
}

export default function BrandProvider({
  primaryColor,
  secondaryColor,
  children,
}: BrandProviderProps) {
  useEffect(() => {
    const root = document.documentElement;
    if (primaryColor) {
      root.style.setProperty("--brand-primary", primaryColor);
    }
    if (secondaryColor) {
      root.style.setProperty("--brand-secondary", secondaryColor);
    }
    return () => {
      // Reset to defaults on unmount
      root.style.removeProperty("--brand-primary");
      root.style.removeProperty("--brand-secondary");
    };
  }, [primaryColor, secondaryColor]);

  return <>{children}</>;
}
