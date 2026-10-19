import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Gym Coach",
    short_name: "Coach",
    description:
      "AI gym coach: counts your reps and checks your form with your camera, entirely on-device.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // No lock: lifters often prop the phone in landscape on the floor.
    orientation: "any",
    background_color: "#09090b",
    theme_color: "#09090b",
    categories: ["fitness", "health", "sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
