import type { MetadataRoute } from "next"

/** What a phone reads when Kaya is added to its home screen: the name, the icon, and "open it like an app". */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kaya",
    short_name: "Kaya",
    description: "A calm personal finance tracker that runs on your own computer.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // The cream page colour while it opens, and the forest green of the sidebar and top bar around it.
    background_color: "#F7F2E7",
    theme_color: "#1F3D2B",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
