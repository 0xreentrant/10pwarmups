import { defineConfig } from "vite"

export default defineConfig({
  publicDir: false,
  build: {
    ssr: "server/main.ts",
    outDir: "dist-server",
    emptyOutDir: true,
    rollupOptions: {
      external: ["node:sqlite"],
    },
  },
})
