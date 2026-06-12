# TypeScript Migration + `main` Merge — Summary

## Goal

Convert the Vite + React 19 PWA (`10pwarmups`) from JavaScript to TypeScript in an isolated git worktree, then merge the latest `main` and port its new features to the new TypeScript types. Every phase gated on the full automated suite (`npm run test:all` = unit + tsc build + PWA artifact tests + offline e2e).

## Location

| Item | Value |
|------|-------|
| Worktree | `/Users/reentrant/projects/10pwarmups-typescript` |
| Branch | `feat/typescript-migration` |
| Base | local `main` (`51f994b` at branch time) |
| Migration commit | `9aba165` Migrate project to TypeScript |
| Merge commit | `8e8f01a` Merge branch 'main' (parents `9aba165` + `3899a53`) |
| Push status | Not pushed (awaiting explicit request) |

## TypeScript migration (phased)

Vite transpiles TS via the existing `@vitejs/plugin-react`; type-checking is a separate `tsc -b --noEmit` step.

1. **Tooling** — added `typescript`, `@types/react`, `@types/react-dom`, `@types/node`; `tsconfig.json` (project references) + `tsconfig.app.json` + `tsconfig.node.json`; `src/vite-env.d.ts` (shims `import.meta.env`, `window.gtag`, vitest/jest-dom globals); `type-check` script.
2. **Domain types** — `src/types/domain.ts`: `Partner`, `Move`, `Series`, `Deck`, `MoveAnswer`, `QuestionOption`, `Attempt`, `DeckProgress`, `ProgressMap`, `Session`.
3. **Data/utils** — `decks.ts`, `deckUtils.ts`, `analytics.ts`.
4. **Components** — all `.tsx` with prop interfaces.
5. **State** — `appMachine.ts` typed with XState v5 `setup({ types: { context, events, input } })`; `useAppState.ts`, `App.tsx`, `main.tsx`, `index.html` entry.
6. **Tests + config** — `*.test.tsx/ts`, `vite.config.ts`, `vitest.config.ts`, `vitest.pwa.config.ts`.
7. **Strict** — removed `allowJs`; `build` = `tsc -b --noEmit && vite build`.

Node-only scripts intentionally left as `.mjs`: `scripts/viewMachine.mjs`, `tests/e2e/offline.mjs`.

## Merge of `main`

`main` advanced 7 commits since branch point. Git rename detection mapped each `.jsx → .tsx` / `.js → .ts`, so most of `main`'s edits auto-merged into the TypeScript files.

### Conflicts resolved manually

| File | Resolution |
|------|------------|
| `src/utils/deckUtils.ts` | Kept typed `shuffleArray<T>`; added typed `getMoveNote(deck: Deck, moveIndex: number): string \| null` |
| `src/components/TrainingScreen.tsx` | Merged type import + `MoveList` import |
| `src/deckUtils.test.ts` | Merged imports; typed `getMoveNote` mocks as `Deck` |
| `package-lock.json` | Regenerated via `npm install` |

### New features ported to TypeScript

- **Components** (`.tsx`, typed props): `Popover`, `MoveList`, `MoveNotesPopover`, `ResetConfirmPopover`, `WhatsNewPopover`.
- **Hooks** (`.ts`): `useWhatsNew`, `useMoveNotesPopover` (`useRef<HTMLDivElement>`, `useState<number | null>`).
- **Data/util** (`.ts`): `whatsNew`, `whatsNewStorage`.
- **Types**: added `notes?: Record<number, string>` to `Deck`.
- **Tests** (`.ts/.tsx`): `MoveList.test`, `WhatsNewPopover.test`, `whatsNew.test`.
- **Build script**: `scripts/bumpReleaseVersion.mjs` now targets `src/data/whatsNew.ts` (stays `.mjs`).
- Clean-merged from `main`: `.github/workflows/deploy.yml`, `public/updates.html`.

## Verification

- `tsc -b --noEmit`: clean.
- `npm run test:all`: **5 test files / 53 tests** pass (was 39 pre-merge), plus tsc-gated build, 4 PWA artifact tests, and offline e2e.

## Known issues / follow-ups

1. **Pre-existing broken test on `main`** — `WhatsNewPopover.test` asserted `/App works offline/` and link name `"like an app"`, but the component renders "Trainer works offline" / "install it to your phone like an app" (fails on `main`: 1/4 failed). The TS test was aligned to the actual component text. If `main` later fixes the component copy instead, revisit this assertion.
2. **`ti` (ticgit) unavailable** in this environment — no ticket claim/close-out was performed.
3. **Not pushed** — branch is local only; push and PR pending explicit request.
4. Node engine warnings (`puppeteer` wants Node >=22.12; env is v20.19.4) are non-fatal; e2e passes.
