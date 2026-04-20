"use client";

import Image from "next/image";
import { useState } from "react";
import { Mic } from "lucide-react";

interface LogoProps {
  /** Height of the logo image in px (width is scaled proportionally). Default: 28 */
  size?: number;
  className?: string;
}

/**
 * App logo. Shows public/logo.png (or .svg) when available;
 * falls back to the Mic icon so the header never breaks.
 *
 * To activate: drop your logo file into /public/logo.png
 */
export default function Logo({ size = 28, className }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    // Fallback: coloured mic icon matching the old header style
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-primary text-primary-foreground ${className ?? ""}`}
        style={{ width: size, height: size }}
      >
        <Mic style={{ width: size * 0.57, height: size * 0.57 }} />
      </div>
    );
  }

  return (
    <Image
      src="/logo.png"
      alt="InterviewPrepApp logo"
      width={size}
      height={size}
      className={`object-contain ${className ?? ""}`}
      priority
      onError={() => setImgError(true)}
    />
  );
}
