import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WeddingLens Live",
    short_name: "WeddingLens",
    description:
      "Scan, snap, and watch your photos appear on the big screen — a live event photo wall.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f3ea",
    theme_color: "#f8f3ea",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
