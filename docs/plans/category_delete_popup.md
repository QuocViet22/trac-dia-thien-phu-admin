# Category Delete Error-Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deleting a category blocked by products shows an error popup with `Đang có sản phẩm thuộc danh mục này!` (single) or with deleted/blocked counts (bulk).

**Architecture:** `deleteMany` gains per-id rejection reasons (additive); a pure `isProductsConflictError` matcher maps 409 + `has products` marker to popup copy; a tiny `ErrorPopup` reuses `.modal` styles in `CategoryList`. Precondition: the API plan (`category_delete_guard.md`) ships first — this plan's mapping has nothing to match until the 409 exists.

**Tech Stack:** React 19, existing `apiFetch`/`ApiError`, no new dependencies.

**Spec:** `docs/specs/category.md` (delete bullet with exact copy).

## Global Constraints

- `npm run build` must pass (`noUnusedLocals`, `verbatimModuleSyntax` — `import type` for types).
- `npm run lint` must pass — only components exported from component files.
- `npm test` (`vitest run`) must pass; pure helpers get RED→GREEN tests.
- Exact copy: single → `Đang có sản phẩm thuộc danh mục này!`; bulk → `Đã xóa {deleted}/{total}. {blocked} danh mục không xóa được: Đang có sản phẩm thuộc danh mục này!`; button `Đã hiểu`.
- No logic change for `ProductList` (it consumes `deleteMany` — additive field only).

## Review Focus

- Single blocked delete → popup with the exact text; confirm modal closed; list refreshed (pinned by Task 2 smoke; reviewer checks the code path).
- Bulk with mixed results (some deleted, some blocked) → popup counts match reality; deleted rows gone after refresh (Task 2 wiring).
- Non-conflict failures (404, network) → today's inline summary, never the popup (pinned by Task 1's matcher tests).
- A 409 WITHOUT the marker (e.g. has-children) → inline summary, never the products popup (pinned by Task 1's matcher tests).
- "Đã hiểu" dismisses and never refires for the same operation (Task 2 wiring; reviewer checks state reset).

---

## File structure

- `src/lib/api.ts` — `DeleteManyResult` gains `errors: { id: string; error: unknown }[]` (rejected settlements only); `deleteMany` fills it.
- `src/lib/categoryDelete.ts` (new) — `isProductsConflictError(err: unknown): boolean` (ApiError + status 409 + message includes `has products`); `productsBlockedText(deleted: number, total: number, blocked: number): string`.
- `src/lib/categoryDelete.test.ts` (new) — matcher + copy tests.
- `src/lib/api.test.ts` — extend `deleteMany` tests for `errors`.
- `src/components/ErrorPopup.tsx` (new) — props `{ title: string; message: string; onClose: () => void }`, reuses `.modal-backdrop`/`.modal`, `Đã hiểu` button.
- `src/features/categories/CategoryList.tsx` — `popup: string | null` state; `confirmDelete` classifies failures via the matcher; renders `<ErrorPopup>`; list refresh + selection reset unchanged.

### Task 1: Reasons + matcher — `deleteMany.errors`, `isProductsConflictError`, copy

**Files:**
- Modify: `src/lib/api.ts`, `src/lib/api.test.ts`
- Create: `src/lib/categoryDelete.ts`, `src/lib/categoryDelete.test.ts`

**Interfaces:**
- Consumes: `ApiError` (status + message) from `src/lib/api.ts`.
- Produces: `DeleteManyResult.errors: { id: string; error: unknown }[]`; `isProductsConflictError(err) => boolean`; `productsBlockedText(deleted, total, blocked) => string`.

- [ ] **Step 1: Write the failing tests** in `src/lib/categoryDelete.test.ts`:
```ts
expect(isProductsConflictError(new ApiError('Category has products and cannot be deleted', 409))).toBe(true);
expect(isProductsConflictError(new ApiError('Category has children and cannot be deleted', 409))).toBe(false);
expect(isProductsConflictError(new ApiError('nope', 404))).toBe(false);
expect(isProductsConflictError(new TypeError('fetch failed'))).toBe(false);
expect(productsBlockedText(2, 3, 1)).toBe('Đã xóa 2/3. 1 danh mục không xóa được: Đang có sản phẩm thuộc danh mục này!');
```
plus in `src/lib/api.test.ts`: `deleteMany(['a','bad'], ...)` result `errors` equals `[{ id: 'bad', error: <the rejection> }]` (follow the existing `deleteMany` test's stub style).
- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/categoryDelete.test.ts src/lib/api.test.ts`
Expected: FAIL with "Cannot find module './categoryDelete'" and `errors` undefined.
- [ ] **Step 3: Implement** — `categoryDelete.ts` with the two functions (substring match on `has products`); `api.ts`: collect `{id, error: reason}` from rejected settlements into `errors`.
- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/categoryDelete.test.ts src/lib/api.test.ts`
Expected: PASS, all tests in both files.
- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts src/lib/api.test.ts src/lib/categoryDelete.ts src/lib/categoryDelete.test.ts
git commit -m "feat: delete reasons and products-conflict matcher"
```

### Task 2: Popup — `ErrorPopup` + `CategoryList` wiring

**Files:**
- Create: `src/components/ErrorPopup.tsx`
- Modify: `src/features/categories/CategoryList.tsx`

**Interfaces:**
- Consumes: `isProductsConflictError`, `productsBlockedText` from Task 1; `DeleteManyResult.errors`.
- Produces: nothing downstream.

- [ ] **Step 1: Write `ErrorPopup.tsx`** — props `{ title: string; message: string; onClose: () => void }`; markup mirrors the confirm modal (`modal-backdrop` > `modal` + `h2` + `p` + `.actions` with a single `btn btn-default` `Đã hiểu` calling `onClose`). No new CSS.
- [ ] **Step 2: Wire `CategoryList.confirmDelete`** — after `deleteMany` resolves: partition `result.errors` via `isProductsConflictError` into `blocked` vs `other`; refresh the list + reset selection exactly as today; if `blocked.length > 0`, set `popup` to the single text (when `ids.length === 1`) or `productsBlockedText(result.deleted, ids.length, blocked.length)`; else if `other.length > 0`, keep today's inline `setError` summary; render `{popup && <ErrorPopup title="Không thể xóa" message={popup} onClose={() => setPopup(null)} />}`.
- [ ] **Step 3: Verify** — Run `npm run build` (pass), `npm run lint` (pass), `npm test` (all pass). Smoke: `npm run dev`, open `/categories`, delete a category with products (popup, exact text, `Đã hiểu` dismisses), delete an empty one (works, no popup), bulk mixed (counts popup).
- [ ] **Step 4: Commit**

```bash
git add src/components/ErrorPopup.tsx src/features/categories/CategoryList.tsx
git commit -m "feat: error popup for deleting category with products"
```
