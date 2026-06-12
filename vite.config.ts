import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

const base = "/"

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon-180x180.png",
        "icon-192x192.png",
        "icon-512x512.png",
        "updates.html",
      ],
      manifest: {
        name: "10th Planet Warmup Trainer",
        short_name: "Warmups",
        description: "Train 10th Planet warmup sequences offline",
        theme_color: "#c0392b",
        background_color: "#0f0f0f",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          {
            src: "icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,woff}"],
        navigateFallback: "index.html",
      },
    }),
  ],
})
