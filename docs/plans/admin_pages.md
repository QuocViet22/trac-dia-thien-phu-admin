# Admin Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the product, category, and news admin pages as a router-based React shell bound to the real Spring Boot API.

**Architecture:** One `api.ts` fetch client unwraps the `{success, message, data}` envelope and Spring `Page`; `AdminShell` provides sidebar + header; each module owns a `*.api.ts` (endpoint calls), a list page, and (product/category) a form page. News is mock-data only.

**Tech Stack:** React 19, `react-router` (new), one rich-text lib for descriptions — Tiptap `@tiptap/react` + `@tiptap/starter-kit` (new), no other new deps.

**Spec:** `docs/specs/product.md` (shared foundation in §2), `docs/specs/category.md`, `docs/specs/news.md`. Design: `docs/specs/trac-dia-thien-phu-admin-design/`.

## Global Constraints

- `npm run build` (`tsc -b && vite build`) must pass — `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `moduleDetection: force` are on: no unused vars, no enums, `import type` for types.
- `npm run lint` must pass — only components exported from component files.
- No test runner exists in this repo: verification per task is `npm run build` + `npm run lint` + stated manual smoke via `npm run dev`.
- Form fields map 1:1 to backend DTOs — never invent fields (no type/brand/status/price/stock).
- Images are URL strings only (`{imageUrl, name, sortOrder}`); no binary upload.
- UI labels in Vietnamese as in the screens.

## Review Focus

- Backend down or CORS-blocked at `VITE_API_URL` → every list page must show an error state, not a blank page (Task 2 Step 2 and Task 3 Step 2 build the error states; Task 1 smoke only covers shell rendering).
- Duplicate `seoAlias` (`409`) must land on the slug field, not a generic toast (Task 2/3 form steps).
- Empty category list → product form's category select must show "no categories" instead of submitting null (Task 2 step).
- Direct URL to unknown `/products/:id` → not-found view, not a stuck spinner (Task 2 step).
- Spring `Page` with zero results → table shows empty state with intact pagination (Task 2 step).

---

## File structure

- `src/lib/api.ts` — `apiFetch(path, opts)`, `unwrapPage`, `ApiError {status, message}`; `VITE_API_URL` default `http://localhost:8080`.
- `src/lib/types.ts` — `Product`, `Category`, `ImageDto`, `SpringPage<T>` (`{content: T[]; totalElements: number; number: number; size: number}`), `PageResult<T>` (`{items: T[]; total: number; page: number; size: number}`) (all `type`, exported with `export type`).
- `src/components/AdminShell.tsx` — sidebar (240px → 64px) + 56px header + `<Outlet/>`; DESIGN.md tokens as CSS variables in `src/index.css`.
- `src/features/products/products.api.ts` — `listProducts(categoryId?, page, size)`, `getProduct(id)`, `createProduct`, `updateProduct`, `deleteProduct`.
- `src/features/products/ProductList.tsx`, `src/features/products/ProductForm.tsx` (used by both `new` and `:id`).
- `src/features/categories/` — same shape: `categories.api.ts`, `CategoryList.tsx`, `CategoryForm.tsx`.
- `src/features/news/mockNews.ts`, `src/features/news/NewsList.tsx` (read-only).
- `src/App.tsx` — router only (`createBrowserRouter`, 7 routes, all pages lazy-loaded via `React.lazy`).

### Task 1: Foundation — deps, API client, shell, router

**Files:**
- Modify: `package.json` (add `react-router`, `@tiptap/react`, `@tiptap/starter-kit`), `src/App.tsx`, `src/index.css`
- Create: `src/lib/api.ts`, `src/lib/types.ts`, `src/components/AdminShell.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `apiFetch<T>(path: string, init?: RequestInit) => Promise<T>` (throws `ApiError` on `!ok` or `success:false`); `unwrapPage<T>(page: SpringPage<T>) => PageResult<T>`; types `Product`, `Category`, `ImageDto`; `<AdminShell/>` wrapping `<Outlet/>`; router with placeholder element per route (replaced in Tasks 2–4).

- [ ] **Step 1: Install deps** — Run `npm i react-router @tiptap/react @tiptap/starter-kit`. Expected: `package.json` lists all three, install exits 0.
- [ ] **Step 2: Write `src/lib/api.ts` + `src/lib/types.ts`** — `ApiError extends Error {status: number}`; `apiFetch` prefixes `import.meta.env.VITE_API_URL ?? 'http://localhost:8080'`, sends JSON, unwraps `data`, throws `ApiError(message, status)` otherwise. Types mirror `ProductResponse`/`CategoryResponse` field-for-field.
- [ ] **Step 3: Write `src/components/AdminShell.tsx` + tokens in `src/index.css`** — sidebar links Sản phẩm `/products`, Danh mục `/categories`, Tin tức `/news` with collapse toggle; CSS vars for `--primary:#0088FF`, `--sidebar:#1B2A41`, `--canvas:#F4F6F8`, `--card-border:#E0E6ED`.
- [ ] **Step 4: Wire router in `src/App.tsx`** — 7 routes (`/products`, `/products/new`, `/products/:id`, `/categories`, `/categories/new`, `/categories/:id`, `/news`, index redirect to `/products`); each renders a placeholder `<div>` naming its Task 2–4 component.
- [ ] **Step 5: Verify** — Run `npm run build`, expected: pass. Run `npm run lint`, expected: pass. Smoke: `npm run dev`, visit `/products`, expect shell + placeholder; stop API (or point `VITE_API_URL` at a dead port) is N/A until Task 2 — record the error-state requirement as done here only for the shell rendering.
- [ ] **Step 6: Commit** — `git add package.json package-lock.json src/lib src/components src/App.tsx src/index.css; git commit -m "feat: admin foundation with router, api client, shell"`

### Task 2: Products — list + form, full CRUD

**Files:**
- Create: `src/features/products/products.api.ts`, `src/features/products/ProductList.tsx`, `src/features/products/ProductForm.tsx`
- Modify: `src/App.tsx` (replace product placeholders with lazy imports)

**Interfaces:**
- Consumes: `apiFetch`, `unwrapPage`, `Product`, `Category` from Task 1; category options via `listCategories()` from Task 3 — to avoid ordering deadlock, Task 2 fetches `GET /api/categories` directly through `apiFetch` and Task 3 reuses this pattern (no import from Task 3).
- Produces: nothing consumed later (news is independent).

- [ ] **Step 1: Write `products.api.ts`** — `listProducts(categoryId: string | undefined, page: number, size: number): Promise<PageResult<Product>>` mapping Spring `content`/`totalElements`; `getProduct`, `createProduct`, `updateProduct`, `deleteProduct` with exact DTO field names from the spec table.
- [ ] **Step 2: Write `ProductList.tsx`** — columns: checkbox, image thumb (first image), name, SKU, barcode, category name, unit, status (render `—`, no backend field), actions; server paging (default size 20, sizes 20/50/100), category dropdown, client text search over loaded page (name/SKU/barcode), checkbox + bulk-delete bar with confirm modal, row edit/clone/delete; clone navigates to `/products/new` with state prefill minus `seoAlias`; empty-page and fetch-error states (Review Focus lines 1 & 5).
- [ ] **Step 3: Write `ProductForm.tsx`** — 70/30 grid with sticky `Hủy`/`Lưu` footer; fields per spec §4 table; category select shows "Chưa có danh mục" empty state and blocks submit (Review Focus line 3); `description` uses Tiptap; images = URL rows with star-primary + reorder; client validation mirrors backend (`name` required, `categoryId` required, 256 limits); `409` error sets the slug field message (Review Focus line 2); new → `POST` + navigate to `/products`, `:id` → `GET` prefill + `PUT`, unknown id → not-found view (Review Focus line 4).
- [ ] **Step 4: Wire routes + verify** — Replace placeholders in `src/App.tsx`. Run `npm run build` (pass), `npm run lint` (pass). Smoke with local API running: list loads, filter by category, create with blank name blocked client-side, duplicate slug shows field error, delete asks confirmation.
- [ ] **Step 5: Commit** — `git add src/features/products src/App.tsx; git commit -m "feat: product admin CRUD"`

### Task 3: Categories — list + form, full CRUD

**Files:**
- Create: `src/features/categories/categories.api.ts`, `src/features/categories/CategoryList.tsx`, `src/features/categories/CategoryForm.tsx`
- Modify: `src/App.tsx` (replace category placeholders)

**Interfaces:**
- Consumes: `apiFetch`, `Category` from Task 1.
- Produces: nothing consumed later.

- [ ] **Step 1: Write `categories.api.ts`** — `listCategories(): Promise<Category[]>` (`GET /api/categories`), `getCategory`, `createCategory`, `updateCategory`, `deleteCategory`; exact DTO field names (`seoDescription`, `parentCategoryId`).
- [ ] **Step 2: Write `CategoryList.tsx`** — client search (name + `seoAlias`), client pagination 20/50/100, columns per spec (no count column), parent name resolved from list, row edit/delete + bulk-delete bar with the design's confirm modal, backend rejection message surfaced, fetch-error state.
- [ ] **Step 3: Write `CategoryForm.tsx`** — 70/30 grid with sticky `Hủy`/`Lưu` footer; fields per spec §3 table; single rich-text `description`; parent select (options from `GET /api/categories?topLevel=true` + full list) excludes self on edit; cover image = one URL row; same validation/error patterns as ProductForm (`409` → slug field).
- [ ] **Step 4: Wire routes + verify** — Run `npm run build` (pass), `npm run lint` (pass). Smoke: create root + child category, child shows parent name, delete with confirm, self-parent blocked client-side.
- [ ] **Step 5: Commit** — `git add src/features/categories src/App.tsx; git commit -m "feat: category admin CRUD"`

### Task 4: News — read-only mock list

**Files:**
- Create: `src/features/news/mockNews.ts`, `src/features/news/NewsList.tsx`
- Modify: `src/App.tsx` (replace news placeholder)

**Interfaces:**
- Consumes: `AdminShell` + table styling from Task 1 only. No API calls.

- [ ] **Step 1: Write `mockNews.ts`** — export type `MockNews` + array of ~10 rows: `id`, `coverUrl`, `title`, `author`, `tags: string[]`, `publishedAt` (ISO string), `views`, `status: 'published' | 'draft' | 'pinned'`.
- [ ] **Step 2: Write `NewsList.tsx`** — status tabs with counts, title search, author + time dropdowns, client pagination 10/20/50, view-only row action (read-only detail drawer in the same file, not a new route); pin/draft/delete controls hidden.
- [ ] **Step 3: Wire route + verify** — Run `npm run build` (pass), `npm run lint` (pass). Smoke: tabs filter, search narrows, no network calls in devtools.
- [ ] **Step 4: Commit** — `git add src/features/news src/App.tsx; git commit -m "feat: news read-only list with mock data"`
