import type { RouterHistory } from "@tanstack/history"

let pendingHistoryAction: "BACK" | "FORWARD" | "GO" | "PUSH" | "REPLACE" | null = null

export function trackRouterHistoryActions(history: RouterHistory) {
  return history.subscribe(({ action }) => {
    pendingHistoryAction = action.type
  })
}

export function consumePopNavigation(): boolean {
  const action = pendingHistoryAction
  pendingHistoryAction = null
  return action === "BACK" || action === "FORWARD" || action === "GO"
}
