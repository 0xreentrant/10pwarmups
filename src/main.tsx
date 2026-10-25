import "@fontsource/barlow-condensed/400.css"
import "@fontsource/barlow-condensed/600.css"
import "@fontsource/barlow-condensed/700.css"
import "@fontsource/barlow-condensed/800.css"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"
import "@fontsource/ibm-plex-mono/600.css"
import "./index.css"
import "./utils/trainModeLog"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"
import { router } from "./router"
import { restartAppActor } from "./appActor"
import { applyCachedCatalog, refreshCatalog } from "./data/catalog"

async function boot() {
  const cached = applyCachedCatalog()
  if (cached) restartAppActor()
  const refresh = refreshCatalog()
  if (!cached) {
    const applied = await refresh
    if (applied) restartAppActor()
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
  if (cached) void refresh
}

void boot()
