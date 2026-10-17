import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mi Running",
    short_name: "Running",
    description: "Dashboard personal de running con datos de Strava",
    start_url: "/",
    display: "standalone",
    background_color: "#EEF7E6",
    theme_color: "#EEF7E6",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
