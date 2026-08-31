import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import { taggerApiPlugin } from "./vite/taggerApiPlugin"

const base = "/"
const tailscaleHost = process.env.TAILSCALE_HOST
const tailscaleServeHost = process.env.TAILSCALE_SERVE_HOST?.replace(/\.$/, "")

export default defineConfig({
  base,
  // ponytail: tagger API writes these files; ignore so saves do not trigger a dev reload.
  server: {
    ...(tailscaleHost && {
      host: tailscaleHost,
      hmr: { host: tailscaleHost },
    }),
    ...(tailscaleServeHost && {
      allowedHosts: [tailscaleServeHost, ".ts.net"],
      hmr: {
        protocol: "wss",
        host: tailscaleServeHost,
        clientPort: Number(process.env.TAILSCALE_SERVE_PORT ?? 443),
      },
    }),
    watch: {
      ignored: [
        "**/src/data/warmup-notes/**",
        "**/src/data/moveTimestamps.ts",
        "**/src/data/decks.ts",
      ],
    },
  },
  plugins: [
    taggerApiPlugin(),
    react(),
    tailwindcss(),
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
        // Warmup mp4s are large; cache on first play so train/review works offline after a visit.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/videos/") && url.pathname.endsWith(".mp4"),
            handler: "CacheFirst",
            options: {
              cacheName: "warmup-videos",
              expiration: {
                maxEntries: 40,
              },
            },
          },
        ],
      },
    }),
  ],
})
