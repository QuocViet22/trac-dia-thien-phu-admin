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

## Workflow rules (Superpowers)

Skills are loaded with the `skill` tool, not slash commands. If a named skill
isn't found, use the `skill` tool to list available skills and pick the closest
match. Do not skip a step because the skill is missing; tell the user instead.

Always check `docs/` first. Existing feature → update its file. New feature →
create `docs/specs/<page_name>.md` (English, e.g. warehouse.md).

For any non-trivial task, follow these steps in order and stop at each gate:

1. Spec: load the `brainstorming` skill. Write or update
   `docs/specs/<page_name>.md`. STOP and wait for user approval.
2. Plan: load the `writing-plans` skill. Write or update
   `docs/plans/<page_name>.md` with checkbox steps. The final step must be
   "update the spec if behavior changed." STOP and wait for user approval.
3. Implement: load the `executing-plans` skill. Work test-first, tick plan
   checkboxes as you go, and run the test/lint commands after each batch.
4. Before finishing: load the code-review skill
   (`requesting-code-review`) and the `verification-before-completion` skill,
   then confirm all checkboxes are ticked.

Save all outputs to the paths above, not to any default location.
Skip this workflow only for trivial fixes (typos, one-line changes).

## Code minimalism (Ponytail)

- Before step 3, load the `ponytail` skill and keep it active at `full` level
  for the whole implementation. Before writing new code, check for existing
  code, the stdlib, native platform features, or already-installed dependencies.
- In plans, prefer reusing existing modules over creating new ones, and
  list what existing code each step reuses.
- Never trade away validation, security, or accessibility to write less code.
- Before finishing, load the `ponytail-review` skill to check for
  over-engineering, in addition to the normal code-review skill.
- If Ponytail and the approved spec/plan conflict, the spec and plan win.
  Ask the user instead of silently dropping requirements.
- Required tests are never "dead code." Do not delete them for minimalism.