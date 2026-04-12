/** @type {import('next').NextConfig} */
const backend =
  process.env.LEADPULSE_API_PROXY_TARGET?.replace(/\/$/, "") || "http://127.0.0.1:8000";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/leadpulse-api/:path*",
        destination: `${backend}/:path*`,
      },
    ];
  },
};

export default nextConfig;
