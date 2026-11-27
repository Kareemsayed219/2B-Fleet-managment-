import type { MetadataRoute } from "next";

// Lets drivers "Add to home screen" so the app opens full-screen like a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "2B Fleet",
    short_name: "2B Fleet",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#0b6bcb",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
