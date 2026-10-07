import type { NextConfig } from "next"

// Where the backend listens. Only this Next server talks to it directly.
// Browsers, including a phone, call /api/... on this app's own address instead.
const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:4000"

const nextConfig: NextConfig = {
  // The small "N" badge that `next dev` draws would sit on top of the Quick add coin at the bottom right. It only
  // exists while developing, and compile and runtime errors still show without it.
  devIndicators: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }]
  },
  // Lets a phone on your home Wi-Fi open the dev server, whose address looks like 192.168.x.x or 10.x.x.x.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  experimental: {
    // The code-shrinking step of a production build deletes a few lines of the dropdown library (the part that
    // remembers the letters typed so far), so typing "Food" into a dropdown picked by the last letter only.
    // This is a local app, so bigger script files cost nothing.
    turbopackMinify: false,
  },
}

export default nextConfig
