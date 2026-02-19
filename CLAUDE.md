# CLAUDE.md

Project-specific instructions for Claude Code.

## Build & Verify

After any code change, always run:
```bash
npx tsc --noEmit   # Quick type-check
npx vite build      # Full build
```

## Rules

- This is a Vite + React + TypeScript project. No extra frameworks.
- Use CSS Modules for styling. Never introduce CSS-in-JS or utility-first CSS.
- Use existing CSS variables from `src/index.css` for all colors, spacing, shadows, and radii.
- All user-facing text must be in Chinese (zh-CN).
- No enums — use `const as const` pattern.
- Use `import type` for type-only imports (required by `erasableSyntaxOnly`).
- Game state is managed by a single `useReducer` in `src/hooks/useGame.ts`. All mutations flow through dispatch actions.
- Do not add third-party dependencies without explicit approval. The project intentionally has zero runtime dependencies beyond React.
- When adding responsive styles, use `@media (max-width: 600px)` for tablets and `@media (max-width: 480px)` for phones.
- Sound effects use Web Audio API (`src/utils/sound.ts`). No audio file imports.
- Puzzle `solution` arrays must not contain completely empty rows or columns.
