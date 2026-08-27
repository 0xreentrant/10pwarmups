import type { Partner } from "../types/domain"

export function normalizePlayers(players: Partner | readonly Partner[]): Partner[] {
  const list = Array.isArray(players) ? [...players] : [players]
  const out: Partner[] = []
  if (list.includes("A")) out.push("A")
  if (list.includes("B")) out.push("B")
  return out.length ? out : ["A"]
}

export function bothPlayers(players: readonly Partner[]): boolean {
  return players.includes("A") && players.includes("B")
}

export function moveLabelClass(players: readonly Partner[]): string {
  if (bothPlayers(players)) return "text-partner-both"
  return players[0] === "B" ? "text-partner-b" : "text-partner-a"
}

export function togglePlayerDraft(current: Partner[], player: Partner): Partner[] {
  const has = current.includes(player)
  if (has && current.length === 1) return current
  if (has) return current.filter(p => p !== player)
  return normalizePlayers([...current, player])
}

export type MarkerDotAppearance = {
  className: string
  style?: { background: string }
}

export function markerDotAppearance(
  players: readonly Partner[],
  selected: boolean,
): MarkerDotAppearance {
  const p = normalizePlayers(players)
  if (bothPlayers(p)) {
    const gradient =
      "linear-gradient(135deg, var(--color-partner-b) 50%, var(--color-partner-a) 50%)"
    if (selected) {
      return { className: "border-2 border-transparent", style: { background: gradient } }
    }
    return {
      className: "border-2 border-transparent",
      style: {
        background: `linear-gradient(var(--color-surface), var(--color-surface)) padding-box, ${gradient} border-box`,
      },
    }
  }
  if (p[0] === "B") {
    return selected
      ? { className: "border-partner-b bg-partner-b" }
      : { className: "border-partner-b bg-surface" }
  }
  return selected
    ? { className: "border-partner-a bg-partner-a" }
    : { className: "border-partner-a bg-surface" }
}
