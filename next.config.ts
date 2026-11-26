import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Server-only libraries that ship their own native/binary assets
  serverExternalPackages: ["@react-pdf/renderer", "exceljs", "nodemailer"],
  // Brand fonts used inside PDF receipts and reports
  outputFileTracingIncludes: {
    "/api/receipts/[id]": ["./src/assets/fonts/**/*"],
    "/api/admin/export": ["./src/assets/fonts/**/*"],
  },
  experimental: {
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
