# Category Sidebar Section (admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing `/homepage` "Danh mục sidebar" section actually work by correcting the collection-type spelling.

**Architecture:** No new page, route or component. Only `homepageTypes.ts` changes: the union member and `HOMEPAGE_SECTIONS` entry are misspelled (`CATEGORY_SIDERBAR_COLLECTION`), which makes every request for the section return `400`. `EntitySectionEditor` already treats unknown entity types as a category picker.

**Tech Stack:** Vite + React 19 + TypeScript, no test runner.

**Spec:** `docs/specs/homepage.md` (§7 addendum) and `trac-dia-thien-phu-api/docs/specs/category_sidebar_collection.md`

## Global Constraints

- No new admin page, route, or `AdminShell` nav item; the section stays inside `/homepage`.
- Canonical value is `CATEGORY_SIDEBAR_COLLECTION`; no alias for the misspelling.
- `max: 100`, `mode: 'entity'`.
- TypeScript strict flags stay on: no enums, no unused locals, `import type` for types.
- No test runner exists; verification is `npm run build`, `npm run lint`, plus a manual pass.

## Review Focus

- A leftover `SIDERBAR` anywhere in `src/` silently reintroduces the `400`; the grep step is the guard.
- The section must appear with the label `Danh mục sidebar` and counter `n/100`, matching the API cap.
- Adding a category must send `collectionType=CATEGORY_SIDEBAR_COLLECTION` in the request body and return `201`, not `400`.
- Preview must render the section as an entity list (names, no image grid), since `mode` is `entity`.

---

### Task 1: Correct the collection-type spelling

**Files:**
- Modify: `src/features/homepage/homepageTypes.ts:1-20` (union + `COLLECTION_TYPES`)
- Modify: `src/features/homepage/homepageTypes.ts:26-34` (`HOMEPAGE_SECTIONS`)

**Interfaces:**
- Consumes: `CollectionType`, `HOMEPAGE_SECTIONS`, `COLLECTION_TYPES` used by `HomepagePage`, `EntitySectionEditor`, `ImageSectionEditor`, `HomepagePreview`.
- Produces: unchanged types; the only new value is the corrected string literal and `COLLECTION_TYPES.SIDEBAR`.

- [ ] **Step 1: Fix the union member**

In `homepageTypes.ts`, change the last member of `CollectionType`:

```ts
  | 'CATEGORY_SIDEBAR_COLLECTION'
```

- [ ] **Step 2: Add the constant key**

In `COLLECTION_TYPES`, after `NEWS`:

```ts
  CATEGORY_SIDEBAR: 'CATEGORY_SIDEBAR_COLLECTION',
```

- [ ] **Step 3: Fix the section entry**

In `HOMEPAGE_SECTIONS`, keep the existing position (second) and change only the type:

```ts
  { type: 'CATEGORY_SIDEBAR_COLLECTION', label: 'Danh mục sidebar', max: 100, mode: 'entity' },
```

- [ ] **Step 4: Verify the misspelling is gone**

Run:

```
Get-ChildItem -Recurse -Path src -File | Select-String -Pattern SIDERBAR
```

Expected: no output.

- [ ] **Step 5: Typecheck and lint**

Run: `npm run build`

Expected: build succeeds (`tsc -b && vite build`).

Run: `npm run lint`

Expected: exit code 0, no errors.

- [ ] **Step 6: Commit**

```
git add src/features/homepage/homepageTypes.ts
git commit -m "fix: use CATEGORY_SIDEBAR_COLLECTION for the sidebar section"
```

---

### Task 2: Verify the section end to end against the API

**Files:** none (verification only).

**Interfaces:**
- Consumes: the running API with Task 1 of the API plan merged, and an `ADMIN` session in the admin app.

- [ ] **Step 1: Start the API and the admin app**

Run the API (`.\mvnw.cmd spring-boot:run` in the API repo with its DB env vars), then `npm run dev` in the admin repo.

- [ ] **Step 2: Open the section**

Log in, go to `/homepage`, choose `Danh mục sidebar` in the dropdown.

Expected: the counter reads `0/100` (or `n/100` with existing rows), and DevTools Network shows `GET /api/collections?collectionType=CATEGORY_SIDEBAR_COLLECTION` returning `200`. A `400` means a `SIDERBAR` literal is still present.

- [ ] **Step 3: Add, reorder, delete**

Add three different categories, move the second one up with the arrow, reload the page, then delete one.

Expected: `POST` returns `201`; order survives reload; delete returns `204` and the row disappears; already-selected categories show `Đã chọn` and cannot be added twice.

- [ ] **Step 4: Check the preview**

Click `Xem trước`.

Expected: the `Danh mục sidebar` block lists the saved names as an entity list (no image tiles) with `n/100`.
