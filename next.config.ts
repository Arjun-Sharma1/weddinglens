import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Supabase Storage public URLs. We mostly use plain <img> for the photo
    // display surfaces, but allow next/image from the Supabase CDN as well.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Keep native/CJS packages external so Node handles them at runtime
  // (Sharp = native binary; archiver = CommonJS default export).
  serverExternalPackages: ["sharp", "archiver"],
};

export default nextConfig;
