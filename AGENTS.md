# AGENTS.md — trac-dia-thien-phu-admin

Fresh Vite + React 19 + TS scaffold for the Thiên Phú back-office admin. No routing, state, API client, tests, or CI yet — check before assuming they exist.

## Commands

- `npm run dev` — dev server (HMR)
- `npm run build` — `tsc -b && vite build` (typecheck + build; no separate typecheck script)
- `npm run lint` — `eslint .`
- `npm run preview` — serve `dist/`

No test runner configured. No pre-commit hooks, no CI workflows.

## Structure

- Entry: `src/main.tsx` → `src/App.tsx`; static assets in `src/assets/`, `public/`.
- Project references: `tsconfig.json` → `tsconfig.app.json` (`src/`) + `tsconfig.node.json` (`vite.config.ts` only).
- Design source of truth: `docs/specs/trac-dia-thien-phu-admin-design/` — `back_office_operations_system/DESIGN.md` (tokens, sidebar 240px→64px, 70/30 form grid, table/filter/button specs) plus `product/`, `category/`, `news/` screen HTML+PNG references. `docs/plans/` is empty.
- OpenCode plugin: `.opencode/opencode.json` loads `@dietrichgebert/ponytail` — prefer minimal diffs, stdlib/native first.

## TS / Lint quirks (will fail build)

- `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `moduleDetection: force` are on. No unused vars, no enums/namespaces/parameter properties; use `import type` for types.
- ESLint: `react-hooks` + `react-refresh` recommended. Only `export` components from component files (no helper exports mixed with components).
- Target ES2023, `jsx: react-jsx`, bundler module resolution.

## Important rules
- Always check docs folder first:
    + If the feature existed, update the md file in plans/specs folder
    + If the feature doesn't exist, create a new file in plans/specs folder with page_name.md and use english. Like example: warehouse.md
- Before implementing a task, make sure it follow by these steps: create/update spec file in specs folder => user reviewed and approved => create/update plan file in plans folder => user reviewed and approved => implementation