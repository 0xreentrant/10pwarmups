# Design

## Theme

Dark, single-theme (no light mode). Near-black background, near-white text, one red accent. No border-radius anywhere; sharp/flat edges throughout (fieldsets, buttons, popovers).

## Color

OKLCH not in use; existing tokens are plain hex/rgb in `src/index.css`, defined via Tailwind v4 `@theme`:

- `--color-bg`: `#0f0f0f`
- `--color-surface`: `#1a1a1a`
- `--color-border`: `#2e2e2e` / `--color-border-subtle`: `#1e1e1e`
- `--color-text`: `#e8e8e8` / `--color-text-on-accent`: `#ffffff`
- `--color-muted`: `#666666`
- `--color-accent`: `#c0392b` (red)
- `--color-green`: `#27ae60`
- `--color-overlay`: `rgba(0,0,0,0.55)`
- `--color-partner-a`: `rgb(93,226,93)` (green) / `--color-partner-b`: `rgb(120,165,255)` (blue) - fixed semantic colors for the two training partners, used consistently in move lists and legends.

## Typography

- Display / headings: `Barlow Condensed` (`@fontsource/barlow-condensed`), extrabold, uppercase, `letter-spacing: 0.04em`, tight `line-height: 1.05`.
- Body / UI: `IBM Plex Mono` (`@fontsource/ibm-plex-mono`), 13px base, `line-height: 1.5`.
- Scale: h1 2.4rem, h2 1.5rem, h3 1.2rem. Legends/labels: 0.65-0.85rem, uppercase, wide tracking (0.12-0.18em), muted color.

## Components

- `.btn` - flat, bordered, uppercase display font, surface background; `.btn-primary` swaps to accent fill; `.btn-ghost` is borderless/transparent for secondary actions (e.g. Back).
- `fieldset` / `legend` - primary grouping device for sections within a screen (used instead of headings + divs), surface background, thin border.
- `Popover` - fixed, centered, backdrop overlay (`.popover-backdrop` / `.popover`), used for all confirmations (reset, review switch, exit) instead of native `confirm()` or full-screen modals.
- `DeckLink` - external video link (emoji variant: film emoji + "watch" stacked vertically for table cells; full variant: inline "🎞️ Video (Online) ↗" text link). Both variants fire an analytics event on click and open in a new tab - there is currently no in-app video playback anywhere in the codebase.
- Progress/streak visuals (`HeatGradientCrownBar`, `FlameStreakBar`, `StreakFlameBadge`, `FlameCelebrationEffect`) - custom flame/heat-gradient motifs rather than generic progress bars; `animation` prop values like `"lava"` / `"pulse-edge"` / `"none"` gate motion by state.

## Layout

- Single-column, max-width implied by `SCROLL_TOP_BTN`'s `calc(50% - 240px + 16px)` (~480px content column), mobile-first.
- Tables (not flex/grid cards) for deck listings - `DeckRow` renders as `<tr>` with fixed-width id/link column, flexible name/progress column, fixed-width action column.
- No shadows except the floating scroll-to-top button; everything else is flat with 1px borders.

## Motion

No animation library; CSS-driven (`animation` class names swapped conditionally). Respect existing pattern of gating animation by an explicit state enum rather than always-on transitions. No `prefers-reduced-motion` handling currently present - worth adding when introducing new motion.
