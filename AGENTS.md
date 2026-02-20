# AGENTS.md

Instructions for AI agents working on this codebase.

## Project Overview

A Nonogram (数织) puzzle game built with Vite 7 + React 19 + TypeScript 5.9.
No third-party UI or state management libraries — only React built-ins and CSS Modules.

## Commands

```bash
pnpm dev          # Dev server on localhost:5173
pnpm build        # Type-check (tsc -b) + Vite production build
pnpm lint         # ESLint
```

Always run `pnpm build` (or at minimum `npx tsc --noEmit`) after making changes to verify no type errors.

## Key Conventions

### TypeScript
- **No enums.** Use `const ... as const` pattern (see `src/types/index.ts` for `CellState`).
- TypeScript 5.9 with `erasableSyntaxOnly` — use `import type` for type-only imports.
- Strict mode is on.

### Styling
- **CSS Modules** (`.module.css`) for all component styles. No CSS-in-JS, no Tailwind.
- Theme via CSS custom properties defined in `src/index.css` (`:root` for light, `[data-theme='dark']` for dark).
- Use existing CSS variables (`--bg-*`, `--text-*`, `--accent`, `--border-*`, `--shadow-*`, `--radius-*`) — do not hardcode colors.
- Mobile responsive via `@media (max-width: 600px)` and `@media (max-width: 480px)` breakpoints.

### Components
- Functional components only, with `memo` where props are passed frequently (e.g., `Cell`, `ClueRow`).
- Game state flows through `GameContext` (React Context + `useReducer`).
- All game mutations go through the reducer in `src/hooks/useGame.ts` — never mutate state directly.

### State Architecture
- Single `GameState` object in `useReducer`.
- Actions: `FILL_CELL`, `MARK_X`, `SET_HOVER`, `CLEAR_HOVER`, `TICK`, `NEW_GAME`, `RESET`, `CLEAR_ERROR`, `SET_INPUT_MODE`.
- Error handling: wrong fills auto-mark as X, wrong marks auto-fill. Both deduct time and increment `errorCount`.
- `SET_HOVER` accepts `(row: number | null, col: number | null)` — null means highlight entire row or column.

### Game Logic
- `src/logic/clues.ts` — Clue computation + per-clue completion detection (constraint propagation).
- `src/logic/check.ts` — Win condition check.
- `src/logic/generate.ts` — Random puzzle generation (3 strategies + cellular automata smoothing).
- Smoothing passes are size-dependent: 0 for ≤5, 1 for ≤10, 2 for 15+.

### Sound
- `src/utils/sound.ts` — Web Audio API, no audio files.
- `src/hooks/useSoundEffects.ts` — Watches state transitions, plays sounds reactively.

### Persistence
- Board size: `localStorage` key `nonogram-size`.
- Theme: `localStorage` key `nonogram-theme`.
- Help dismissed: `localStorage` key `nonogram-help-dismissed`.

## UI Language

All user-facing text is in **Chinese (zh-CN)**. Keep it consistent.

## Adding New Puzzles

Add to `src/data/presets.ts`. Each puzzle needs:
```ts
{
  name: '中文名',        // Chinese name
  rows: number,
  cols: number,
  color: '#hex',         // Display color for win screen
  solution: number[][],  // 1 = filled, 0 = empty
}
```
Ensure no completely empty rows or columns in the solution.

## Git Commit Convention

Use **Conventional Commits** format with single-line English messages:

```
<type>(<scope>): <description>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `perf` — Performance improvement
- `refactor` — Code refactoring (no feature/fix)
- `style` — Code style changes (formatting, etc.)
- `docs` — Documentation only
- `chore` — Build, tooling, dependencies

**Examples:**
```
feat(board): add drag-to-fill interaction
fix(timer): prevent negative time display
perf(cell): use event delegation for touch events
refactor(hooks): extract puzzle generation logic
```
