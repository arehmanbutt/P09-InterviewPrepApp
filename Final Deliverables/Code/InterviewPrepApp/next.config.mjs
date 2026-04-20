import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["pdfkit"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.deepgram.com",
        port: "",
        pathname: "/examples/avatars/**",
      },
      {
        // Clerk user profile avatars
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent browsers from MIME-sniffing the content type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Disallow embedding in iframes (clickjacking protection)
          { key: "X-Frame-Options", value: "DENY" },
          // Enforce HTTPS for 1 year, include subdomains
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Disable legacy XSS auditor (modern CSP is the right protection)
          { key: "X-XSS-Protection", value: "0" },
          // Control referrer information sent with outbound requests
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Restrict which browser APIs can be used (no microphone/camera on non-interview pages
          // is intentionally omitted — the interview page needs mic access)
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
