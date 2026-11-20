import type { NextConfig } from "next";

// Ambil hostname Supabase dari env (fallback ke default lama jika env kosong).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://saqeeraaqhlzwkcevppo.supabase.co";
let supabaseHost = "saqeeraaqhlzwkcevppo.supabase.co";
try {
  supabaseHost = new URL(supabaseUrl).hostname;
} catch {
  // biarkan fallback
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: false,
  partialPrefetching: false,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  headers: async () => [
    {
      source: '/admin/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
        { key: 'Pragma', value: 'no-cache' },
        { key: 'Expires', value: '0' },
      ],
    },
  ],
};

export default nextConfig;