import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/journal", destination: "/journal/notes", permanent: true },
    ];
  },
};

export default nextConfig;
