import type { NextConfig } from "next";

// ترويسات بسيطة للحماية:
// - X-Robots-Tag يمنع الفهرسة ويغطي /api/export أيضاً (وليس الصفحات فقط).
// - Referrer-Policy: same-origin (وليس no-referrer الذي يجعل Origin = null فترفض Server Actions الطلب).
const securityHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
