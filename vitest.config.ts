import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["vite/**/*.{test,spec}.{ts,tsx}"],
        },
      },
    ],
  },
})
