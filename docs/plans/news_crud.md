# News CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock-only Tin tức page with full news CRUD bound to `GET/POST/PUT/DELETE /api/news`.

**Architecture:** Mirror the Category module exactly: `news.api.ts` endpoint calls over shared `apiFetch`/`unwrapPage`, server-paged `NewsList`, 70/30 `NewsForm` with Tiptap description and single cover, `newsFields.ts` validation/payload mapping. Delete all mock-only files.

**Tech Stack:** React 19, `react-router` (existing), Tiptap via `HtmlPreview` (existing), `vitest` (existing, `npm test`).

**Spec:** `docs/specs/news.md` — the plan argues from the spec; executors read both.

## Global Constraints

- `npm run build` (`tsc -b && vite build`) must pass — `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `moduleDetection: force` are on: no unused vars, no enums, `import type` for types.
- `npm run lint` must pass — only components exported from component files.
- `npm test` (`vitest run`) must pass for touched suites.
- Form fields map 1:1 to backend DTOs — never invent fields (no tags/views/pinned/publishedAt).
- Images are URL strings only (`{imageUrl, sortOrder}`), max 1 per news.
- UI labels in Vietnamese as in the screens; spec/plan in English.
- No new dependencies (Tiptap, router already installed).

## Review Focus

- Backend down or CORS-blocked at `VITE_API_URL` → list shows fetch-error + retry, not a blank page. → Task 2 Step 4 error-state check.
- Duplicate `seoAlias` (`409`) lands on the slug field, not a generic toast. → Task 3 Step 5 `formErrorForApi` mapping check.
- Direct URL to unknown `/news/:id` → not-found view, not a stuck spinner. → Task 3 Step 5 `isNotFoundError` check.
- Spring `Page` with zero results → empty state with intact pagination. → Task 2 Step 4 empty-list check.
- Submitting with 2 cover images is impossible — single-slot cover caps at 1 with zero network calls. → Task 1 Step 4 single-image mapping check.

---

## File structure

- `src/lib/types.ts` (modify) — add `NewsStatus`, `News`, `NewsDetail` mirroring `NewsResponse`/`NewsDetailResponse` field-for-field.
- `src/features/news/news.api.ts` (create) — `listNews`, `getNews`, `createNews`, `updateNews`, `deleteNews`.
- `src/features/news/newsFields.ts` (create) — `NewsFormValues`, `validateNews`, `toNewsPayload`.
- `src/features/news/newsFields.test.ts` (create) — mirrors `categoryFields.test.ts` shape.
- `src/features/news/NewsList.tsx` (rewrite) — server-paged list, status tabs, single + bulk delete.
- `src/features/news/NewsForm.tsx` (create) — used by both `new` and `:id`.
- `src/App.tsx` (modify) — add lazy `NewsForm` routes `/news/new`, `/news/:id`.
- Delete: `src/features/news/mockNews.ts`, `src/features/news/newsFilters.ts`, `src/features/news/newsFilters.test.ts`.

### Task 1: Types + API client + fields (red → green)

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/features/news/news.api.ts`, `src/features/news/newsFields.ts`
- Test: `src/features/news/newsFields.test.ts`

**Interfaces:**
- Consumes: `apiFetch`, `unwrapPage` from `src/lib/api`; `ImageDto`, `PageResult`, `SpringPage` from `src/lib/types`.
- Produces: `type NewsStatus = 'PUBLISHED' | 'DRAFT'`; `interface News { id: string; title: string; author: string; status: NewsStatus; seoAlias: string; createdAt: string; updatedAt: string; seoDescriptionTag: string | null; images: ImageDto[] }`; `interface NewsDetail { id: string; title: string; description: string | null; author: string; status: NewsStatus; seoPageTitle: string | null; seoDescriptionTag: string | null; seoAlias: string; createdAt: string; updatedAt: string; images: ImageDto[] }`; `listNews(status: NewsStatus | undefined, page: number, size: number): Promise<PageResult<News>>`; `getNews(id: string): Promise<NewsDetail>`; `createNews(payload: NewsPayload): Promise<News>`; `updateNews(id: string, payload: NewsPayload): Promise<NewsDetail>`; `deleteNews(id: string): Promise<void>`; `interface NewsFormValues { title: string; author: string; status: '' | NewsStatus; seoPageTitle: string; seoDescriptionTag: string; seoAlias: string; description: string; imageUrl: string }`; `validateNews(v: NewsFormValues): Record<string, string>`; `toNewsPayload(v: NewsFormValues): NewsPayload`; `interface NewsPayload { title: string; description: string | null; author: string; status: NewsStatus; seoPageTitle: string | null; seoDescriptionTag: string | null; seoAlias: string; images: { imageUrl: string; sortOrder: number }[] }`.

- [ ] **Step 1: Write the failing test** — Create `src/features/news/newsFields.test.ts` mirroring `categoryFields.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { toNewsPayload, validateNews } from './newsFields'

const valid = {
  title: 'Máy GPS RTK mới',
  author: 'Ban Biên Tập',
  status: 'PUBLISHED' as const,
  seoPageTitle: '',
  seoDescriptionTag: '',
  seoAlias: 'may-gps-rtk-moi',
  description: '<p>desc</p>',
  imageUrl: 'http://a/cover.png',
}

describe('validateNews', () => {
  it('accepts a valid form', () => {
    expect(validateNews(valid)).toEqual({})
  })

  it('rejects blank title, author, seoAlias, and missing status', () => {
    expect(validateNews({ ...valid, title: '  ' }).title).toBeTruthy()
    expect(validateNews({ ...valid, author: '  ' }).author).toBeTruthy()
    expect(validateNews({ ...valid, seoAlias: '  ' }).seoAlias).toBeTruthy()
    expect(validateNews({ ...valid, status: '' }).status).toBeTruthy()
  })

  it('rejects fields longer than 256 characters', () => {
    expect(validateNews({ ...valid, title: 'x'.repeat(257) }).title).toBeTruthy()
  })
})

describe('toNewsPayload', () => {
  it('maps blanks to null and a single cover image', () => {
    expect(toNewsPayload(valid)).toEqual({
      title: 'Máy GPS RTK mới',
      description: '<p>desc</p>',
      author: 'Ban Biên Tập',
      status: 'PUBLISHED',
      seoPageTitle: null,
      seoDescriptionTag: null,
      seoAlias: 'may-gps-rtk-moi',
      images: [{ imageUrl: 'http://a/cover.png', sortOrder: 0 }],
    })
  })

  it('omits images when no url is given', () => {
    expect(toNewsPayload({ ...valid, imageUrl: '  ' }).images).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/news/newsFields.test.ts`
Expected: FAIL with "Failed to resolve import ./newsFields" (file does not exist yet).

- [ ] **Step 3: Implement types in `src/lib/types.ts`** — Append `NewsStatus`, `News`, `NewsDetail` exactly as in Interfaces (all `export type`/`export interface`, `import type` where needed). Mirror backend names verbatim (`seoAlias`, `seoPageTitle`, `seoDescriptionTag`, `createdAt`, `updatedAt`, `images`).

- [ ] **Step 4: Implement `news.api.ts` + `newsFields.ts`** — `news.api.ts` mirrors `products.api.ts`: `listNews` builds `URLSearchParams({page, size})`, sets `status` only when defined, calls `apiFetch<SpringPage<News>>` + `unwrapPage`; `getNews`/`createNews` (`POST`)/`updateNews` (`PUT`)/`deleteNews` (`DELETE`) hit `/api/news` paths. `newsFields.ts` mirrors `categoryFields.ts`: `blank` helper, `validateNews` (required title/author/seoAlias/status + 256-char caps on title/author/seoPageTitle/seoAlias), `nullIfBlank` mapping, single cover URL → `images: [{imageUrl, sortOrder: 0}]` or `[]`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/features/news/newsFields.test.ts`
Expected: PASS (all suites green).

- [ ] **Step 6: Verify build + lint for touched files**

Run: `npm run build`
Expected: pass. Run: `npm run lint`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/features/news/news.api.ts src/features/news/newsFields.ts src/features/news/newsFields.test.ts
git commit -m "feat: news api client, types, and form fields"
```

### Task 2: NewsList rewrite — server paging + delete

**Files:**
- Rewrite: `src/features/news/NewsList.tsx`
- Delete: `src/features/news/mockNews.ts`, `src/features/news/newsFilters.ts`, `src/features/news/newsFilters.test.ts`
- Modify: `src/App.tsx` only if route element needs no change (list route stays `/news`; no new import yet — form routes come in Task 3).

**Interfaces:**
- Consumes: `listNews`, `deleteNews` from Task 1; `deleteMany` from `src/lib/api`; `News`, `NewsStatus` types.
- Produces: `<NewsList/>` default export (same path, same route `/news`).

- [ ] **Step 1: Rewrite `NewsList.tsx`** — Follow `ProductList.tsx` structure, minus search: `status` tab state (`'' | NewsStatus`, `''` = all), `page`/`size` (SIZES `[10, 20, 50]`), `items`/`total`, `loading`/`error`/`selected`/`confirmIds`/`deleting`/`nonce`. `useEffect` calls `listNews(status || undefined, page, size)` with cancellation guard + last-page clamp (copy `ProductList` lines 35-59 shape). Tabs `Tất cả`/`Đã đăng`/`Nháp` set status + `setPage(0)` + `setLoading(true)` (no counts). Columns: checkbox, cover (`images[0]` thumb or `—`), title, author, `seoAlias` (or `—`), status badge (`badge success` for PUBLISHED/`badge` for DRAFT), `createdAt` via `toLocaleDateString('vi-VN')`, actions edit (→ `/news/${id}`) + delete (confirm modal). Bulk bar + confirm modal + `deleteMany(ids, deleteNews)` + refetch copy `CategoryList.confirmDelete` shape. States: `loading` → `Đang tải…`, `error` → `.fetch-error` + `Thử lại` (nonce bump), empty → `Không có bài viết nào`, pager always rendered. Page head: `Danh sách bài viết` + `+ Thêm bài viết` link to `/news/new`.

- [ ] **Step 2: Delete mock-only files**

```bash
git rm src/features/news/mockNews.ts src/features/news/newsFilters.ts src/features/news/newsFilters.test.ts
```

- [ ] **Step 3: Run remaining news tests**

Run: `npx vitest run src/features/news`
Expected: PASS (only `newsFields.test.ts` remains and passes; no import of deleted files anywhere — verify with grep for `mockNews|newsFilters` returning zero hits).

- [ ] **Step 4: Verify build + lint + smoke** — Run `npm run build` (pass), `npm run lint` (pass). Smoke with local API running (`npm run dev`, visit `/news`): list loads from server, tabs switch `?status=` (check devtools network), zero-result status shows empty state with intact pager, stop API → fetch-error with retry button.

- [ ] **Step 5: Commit**

```bash
git add src/features/news/NewsList.tsx src/features/news/mockNews.ts src/features/news/newsFilters.ts src/features/news/newsFilters.test.ts
git commit -m "feat: news list bound to real API with delete"
```

### Task 3: NewsForm — create + edit + routes

**Files:**
- Create: `src/features/news/NewsForm.tsx`
- Modify: `src/App.tsx` (lazy `NewsForm`, routes `/news/new`, `/news/:id`)

**Interfaces:**
- Consumes: `getNews`, `createNews`, `updateNews` from Task 1; `toNewsPayload`, `validateNews` from Task 1; `formErrorForApi`, `isNotFoundError` from `src/lib/formErrors`; `HtmlPreview`, `htmlFileOrNull` (same usage as `CategoryForm`); `ImageDropzone` single cover only (no `GalleryManager`).
- Produces: `<NewsForm/>` default export used by both `/news/new` and `/news/:id`.

- [ ] **Step 1: Write `NewsForm.tsx`** — Copy `CategoryForm.tsx` shape, minus parent/gallery: `EMPTY: NewsFormValues` with `status: ''`; `fromDetail(d: NewsDetail): NewsFormValues` (cover from `d.images[0]?.imageUrl ?? ''`); `isCreate = id === undefined`; edit effect `getNews(id)` → prefill + `htmlFileOrNull(description)` + cover `{kind:'url'}`; `404` → not-found view `Không tìm thấy bài viết`, other error → fetch-error + retry (nonce). Layout: 70/30 `form-grid`, sticky footer (`Hủy` → `/news`, `Lưu`). Left cards: `Thông tin chung` (title*, author*, status* select [`Đã đăng`/`Nháp`], description via `HtmlPreview`), `Tối ưu SEO` (seoPageTitle, seoDescriptionTag textarea, seoAlias slug). Right cards: `Trạng thái` may live left if simpler — keep status in general-info card; right rail = single `Ảnh bìa` card with `ImageDropzone` (URL or device file; device file uploads via `uploadFile` + `deleteUpload` compensation exactly like `CategoryForm` steps, single file only). Submit: `validateNews` → `setErrors`, block on errors; single-file upload when `cover.kind === 'file'`; payload `toNewsPayload({...values, description: richTextData?.html ?? values.description})`; create → `POST` + navigate `/news`, edit → `PUT` + navigate `/news`; catch maps via `formErrorForApi` (field → `setErrors`, else `formMessage`).

- [ ] **Step 2: Wire routes in `src/App.tsx`** — Add `const NewsForm = lazy(() => import('./features/news/NewsForm.tsx'))`; add routes `{ path: 'news/new', element: <Suspense …><NewsForm /></Suspense> }` and `{ path: 'news/:id', … }` next to the existing `news` route (same Suspense fallback pattern).

- [ ] **Step 3: Run full verification**

Run: `npx vitest run src/features/news`
Expected: PASS. Run: `npm run build`
Expected: pass. Run: `npm run lint`
Expected: pass.

- [ ] **Step 4: Smoke with local API** — `npm run dev`: create with blank title blocked client-side; create valid → `201` + back at `/news`; duplicate slug → slug field error; edit existing → prefilled + `PUT`; unknown `/news/00000000-0000-0000-0000-000000000000` → not-found view; single + bulk delete ask confirmation.

- [ ] **Step 5: Commit**

```bash
git add src/features/news/NewsForm.tsx src/App.tsx
git commit -m "feat: news create/edit form with routes"
```
