/** @type {import('next').NextConfig} */
const publicApi = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const devOnlyTarget =
  process.env.LEADPULSE_API_PROXY_TARGET?.replace(/\/$/, "") || "http://127.0.0.1:8000";

// Never proxy /leadpulse-api to loopback in production — Vercel blocks private IPs (DNS_HOSTNAME_RESOLVED_PRIVATE).
const rewriteBackend =
  publicApi || (process.env.NODE_ENV !== "production" ? devOnlyTarget : "");

const nextConfig = {
  async rewrites() {
    if (!rewriteBackend) return [];
    return [
      {
        source: "/leadpulse-api/:path*",
        destination: `${rewriteBackend}/:path*`,
      },
    ];
  },
};

export default nextConfig;
