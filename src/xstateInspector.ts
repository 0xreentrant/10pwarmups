import { createBrowserInspector } from "@statelyai/inspect"

export const inspect = import.meta.env.DEV && !import.meta.env.VITEST
  ? createBrowserInspector({ autoStart: false }).inspect
  : undefined
