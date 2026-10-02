import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/journal", destination: "/journal/notes", permanent: true },
      { source: "/records", destination: "/records/database", permanent: true },
      { source: "/finance", destination: "/finance/dashboard", permanent: true },
    ];
  },
};

export default nextConfig;
