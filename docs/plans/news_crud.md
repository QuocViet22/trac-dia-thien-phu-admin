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

---

# Phase 2 — `Khách hàng` news type + `location`

**Goal:** Let admins create/edit news of type `CUSTOMER_NEWS` (`Khách hàng`) with a required free-text `location`, filter the list by that type, and scan locations in the table.

**Architecture:** Extend the existing news module only: `NewsType` union + DTO fields in `src/lib/types.ts`, one payload field in `news.api.ts`, one conditional rule in `newsFields.ts`, one conditional input in `NewsForm.tsx`, and one label/option/column in `NewsList.tsx`. No new route, sidebar item, or component.

**Spec:** `docs/specs/news.md` §1–§5 (Phase 2 additions).

## Phase 2 Global Constraints

- `location` is required **only** when `newsType === 'CUSTOMER_NEWS'`, and only in the client form — the API accepts it as optional.
- Payload sends `location: null` for every non-customer type, even if the hidden input still holds text.
- `Địa điểm` maximum length 256, matching `VARCHAR(256)`.
- Vietnamese labels: type = `Khách hàng`, field = `Địa điểm`, placeholder `Nhập địa điểm khách hàng`, validation `Địa điểm là bắt buộc với tin Khách hàng`.
- `npm run build`, `npm run lint`, and `npm test` must pass; no new dependencies.

## Phase 2 Review Focus

1. Switching type from `CUSTOMER_NEWS` back to `NEWS` must send `location: null`, not a stale location. → Task 4 `toNewsPayload` test.
2. A hidden location value longer than 256 must not block submit for non-customer types. → Task 4 `validateNews` test.
3. Editing a customer news item must prefill `Địa điểm`, and saving without touching it must keep the value. → Task 5 smoke check.
4. The `Khách hàng` filter must request `?newsType=CUSTOMER_NEWS` and reset to page 0. → Task 5 devtools check.
5. The table must show `—` (not `null`/blank) for news without a location. → Task 5 smoke check.

---

### Task 4: Types, payload, validation, and tests (red → green)

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/features/news/news.api.ts`
- Modify: `src/features/news/newsFields.ts`
- Test: `src/features/news/newsFields.test.ts`

**Interfaces:**
- Consumes: existing `NewsStatus`, `newsFields.ts` helpers (`blank`, `nullIfBlank`, `MAX`).
- Produces: `NewsType = 'NEWS' | 'HIRING_PRODUCT' | 'CUSTOMER_NEWS'`; `location: string | null` on `News` and `NewsDetail`; `NewsPayload.location: string | null`; `NewsFormValues.location: string`; `validateNews` location errors; `toNewsPayload` location mapping — consumed by Task 5.

- [ ] **Step 1: Update the test fixture and add four tests (red).**

In `newsFields.test.ts`, add `location: ''` to `valid`, add `location: null` to the expected payload object, and append:

```ts
it('requires a location for customer news', () => {
  expect(validateNews({ ...valid, newsType: 'CUSTOMER_NEWS', location: '  ' }).location).toBeTruthy()
})

it('accepts customer news with a location', () => {
  expect(validateNews({ ...valid, newsType: 'CUSTOMER_NEWS', location: 'Hà Nội' })).toEqual({})
})

it('rejects a customer location longer than 256 characters', () => {
  expect(
    validateNews({ ...valid, newsType: 'CUSTOMER_NEWS', location: 'x'.repeat(257) }).location,
  ).toBeTruthy()
})

it('sends the location only for customer news', () => {
  expect(
    toNewsPayload({ ...valid, newsType: 'CUSTOMER_NEWS', location: ' Hà Nội ' }).location,
  ).toBe('Hà Nội')
  expect(toNewsPayload({ ...valid, newsType: 'NEWS', location: 'Hà Nội' }).location).toBeNull()
})
```

- [ ] **Step 2: Run the suite to confirm red.**

Run: `npx vitest run src/features/news`
Expected: FAIL — `location` is not a known property of `NewsFormValues` and the payload has no `location` field.

- [ ] **Step 3: Extend `src/lib/types.ts`.**

`NewsType` becomes `'NEWS' | 'HIRING_PRODUCT' | 'CUSTOMER_NEWS'`. Add `location: string | null` directly after `newsType` in both `News` and `NewsDetail`.

- [ ] **Step 4: Extend `NewsPayload` in `src/features/news/news.api.ts`.**

Add `location: string | null` after `newsType`.

- [ ] **Step 5: Extend `newsFields.ts`.**

Add `location: string` to `NewsFormValues`. In `validateNews`, after the `newsType` check:

```ts
if (v.newsType === 'CUSTOMER_NEWS') {
  if (blank(v.location)) errors.location = 'Địa điểm là bắt buộc với tin Khách hàng'
  else if (v.location.length > MAX) errors.location = 'Tối đa 256 ký tự'
}
```

In `toNewsPayload`, after `newsType`:

```ts
location: v.newsType === 'CUSTOMER_NEWS' ? nullIfBlank(v.location) : null,
```

- [ ] **Step 6: Run the suite to confirm green, then build.**

Run: `npx vitest run src/features/news; if ($?) { npm run build }`
Expected: all tests pass; build fails only on `NewsForm.tsx` missing `location` in `EMPTY`/`fromDetail` — this is the expected hand-off to Task 5.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/features/news/news.api.ts src/features/news/newsFields.ts src/features/news/newsFields.test.ts
git commit -m "feat: add customer news type and location validation"
```

---

### Task 5: Form input, list filter, and location column

**Files:**
- Modify: `src/features/news/NewsForm.tsx`
- Modify: `src/features/news/NewsList.tsx`

**Interfaces:**
- Consumes: `NewsFormValues.location`, `NewsType.CUSTOMER_NEWS`, `News.location` (Task 4).
- Produces: working admin UI for customer news. Nothing downstream.

- [ ] **Step 1: Add `location` to the form state.**

`EMPTY`: add `location: ''` after `newsType`. `fromDetail`: add `location: d.location ?? ''` after `newsType`.

- [ ] **Step 2: Add the type option and conditional input.**

In the `newsType` select, add `<option value="CUSTOMER_NEWS">Khách hàng</option>` after `HIRING_PRODUCT`. Directly below that `field(...)` call, add:

```tsx
{values.newsType === 'CUSTOMER_NEWS' &&
  field(
    'location',
    'Địa điểm *',
    <input
      type="text"
      value={values.location}
      onChange={(e) => set('location', e.target.value)}
      placeholder="Nhập địa điểm khách hàng"
    />,
  )}
```

- [ ] **Step 3: Extend the list.**

`NEWS_TYPE_LABEL` gains `CUSTOMER_NEWS: 'Khách hàng'`. The type filter gains `<option value="CUSTOMER_NEWS">Khách hàng</option>`. Add `<th>Địa điểm</th>` between `<th>Loại</th>` and `<th>Đường dẫn SEO</th>`, and the matching `<td>{n.location ?? '—'}</td>` after the type badge cell.

- [ ] **Step 4: Verify build, lint, and tests.**

Run: `npm run build; if ($?) { npm run lint }; if ($?) { npx vitest run src/features/news }`
Expected: all exit 0.

- [ ] **Step 5: Smoke with the local API.**

Run `npm run dev` with the API up: create a `Khách hàng` news item with a location → saved and listed; the `Địa điểm` column shows the value; news without a location shows `—`; the `Khách hàng` filter sends `?newsType=CUSTOMER_NEWS` and resets to page 0; switching an edited item from `Khách hàng` to `Tin tức` clears the location in the request payload (devtools); leaving `Địa điểm` blank blocks submit with the Vietnamese error.

- [ ] **Step 6: Commit**

```bash
git add src/features/news/NewsForm.tsx src/features/news/NewsList.tsx docs/specs/news.md docs/plans/news_crud.md
git commit -m "feat: customer news option, location field, and list column"
```

---

# Phase 3 — `Sửa chữa & Kiểm định` news type

**Goal:** Let admins create/edit/publish news of type `REPAIR_AND_INSPECTION_NEWS` (`Sửa chữa & Kiểm định`) with a required free-text location, filter the list by it, and see its location in the existing column.

**Architecture:** Extend the existing admin news module only: add the value to the `NewsType` union, reuse the location rule/payload for a second type in `newsFields.ts`, add the select option + conditional input in `NewsForm.tsx`, and add the label + filter option in `NewsList.tsx`. No new route, sidebar item, API client field, or component.

**Spec:** `docs/specs/news.md` §1–§5 (Phase 3 additions).

## Phase 3 Global Constraints

- `location` is required only in the client form for `CUSTOMER_NEWS` and `REPAIR_AND_INSPECTION_NEWS`; the API accepts it as optional.
- Payload sends the trimmed location for both location-bearing types and `location: null` for every other type.
- `Địa điểm` max length 256, matching `VARCHAR(256)`.
- Vietnamese labels: type = `Sửa chữa & Kiểm định`; placeholder `Nhập địa điểm sửa chữa & kiểm định`; validation `Địa điểm là bắt buộc với tin Sửa chữa & Kiểm định`.
- No change to `src/features/news/news.api.ts`; `NewsPayload.location` already exists.
- `npm test`, `npm run build`, and `npm run lint` must pass; no new dependencies.

## Phase 3 Review Focus

1. Blank location for the new type must block submit with the repair-specific message. → Task 6 validation test + Task 7 smoke.
2. A repair location longer than 256 must be rejected, not truncated. → Task 6 validation test.
3. Payload must keep the trimmed location for the new type and still send `null` for `NEWS`. → Task 6 payload test.
4. Switching an edited item to `Sửa chữa & Kiểm định` must reveal a blank `Địa điểm` field; switching away must hide it and send `null`. → Task 7 smoke.
5. The new filter must request `?newsType=REPAIR_AND_INSPECTION_NEWS` and reset to page 0. → Task 7 devtools check.
6. Existing customer-news validation/payload and the location column must not regress. → existing `newsFields` tests + smoke.

---

### Task 6: Types, validation, payload, and tests (red → green)

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/features/news/newsFields.ts`
- Test: `src/features/news/newsFields.test.ts`

**Interfaces:**
- Consumes: existing `NewsType`, `NewsFormValues`, `validateNews`, `toNewsPayload`.
- Produces: `NewsType` includes `REPAIR_AND_INSPECTION_NEWS`; both location-bearing types share one `needsLocation` rule; consumed by Task 7.

- [ ] **Step 1: Extend the union.**

`src/lib/types.ts`:
```ts
export type NewsType =
  | 'NEWS'
  | 'HIRING_PRODUCT'
  | 'CUSTOMER_NEWS'
  | 'REPAIR_AND_INSPECTION_NEWS'
```
This intentionally makes `NEWS_TYPE_LABEL` in `NewsList.tsx` incomplete until Task 7 — the build is the guard.

- [ ] **Step 2: Add failing tests.**

In `src/features/news/newsFields.test.ts`, add under the customer location cases:
```ts
it('requires a location for repair and inspection news', () => {
  expect(
    validateNews({ ...valid, newsType: 'REPAIR_AND_INSPECTION_NEWS', location: '  ' }).location,
  ).toBeTruthy()
})

it('accepts repair and inspection news with a location', () => {
  expect(
    validateNews({ ...valid, newsType: 'REPAIR_AND_INSPECTION_NEWS', location: 'Hà Nội' }),
  ).toEqual({})
})

it('rejects a repair location longer than 256 characters', () => {
  expect(
    validateNews({ ...valid, newsType: 'REPAIR_AND_INSPECTION_NEWS', location: 'x'.repeat(257) })
      .location,
  ).toBeTruthy()
})
```
Replace the payload test `sends the location only for customer news` with:
```ts
it('sends the location for location-bearing types', () => {
  expect(
    toNewsPayload({ ...valid, newsType: 'CUSTOMER_NEWS', location: ' Hà Nội ' }).location,
  ).toBe('Hà Nội')
  expect(
    toNewsPayload({ ...valid, newsType: 'REPAIR_AND_INSPECTION_NEWS', location: ' Hà Nội ' }).location,
  ).toBe('Hà Nội')
  expect(toNewsPayload({ ...valid, newsType: 'NEWS', location: 'Hà Nội' }).location).toBeNull()
})
```
Run: `npx vitest run src/features/news`
Expected: the three new validation cases and the payload case fail; existing tests pass.

- [ ] **Step 3: Implement the shared location rule.**

In `src/features/news/newsFields.ts`, add below `blank`:
```ts
function needsLocation(newsType: '' | NewsType): boolean {
  return newsType === 'CUSTOMER_NEWS' || newsType === 'REPAIR_AND_INSPECTION_NEWS'
}
```
Replace the customer-only block in `validateNews`:
```ts
if (needsLocation(v.newsType)) {
  if (blank(v.location)) {
    errors.location =
      v.newsType === 'CUSTOMER_NEWS'
        ? 'Địa điểm là bắt buộc với tin Khách hàng'
        : 'Địa điểm là bắt buộc với tin Sửa chữa & Kiểm định'
  } else if (v.location.length > MAX) {
    errors.location = 'Tối đa 256 ký tự'
  }
}
```
Replace the payload line:
```ts
location: needsLocation(v.newsType) ? nullIfBlank(v.location) : null,
```

- [ ] **Step 4: Run the tests.**

Run: `npx vitest run src/features/news`
Expected: all pass. `npm run build` still fails on the missing `NEWS_TYPE_LABEL` key — expected until Task 7. Do not commit yet.

### Task 7: Form input, list filter, and verification

**Files:**
- Modify: `src/features/news/NewsForm.tsx`
- Modify: `src/features/news/NewsList.tsx`

**Interfaces:**
- Consumes: `NewsType.REPAIR_AND_INSPECTION_NEWS`, `needsLocation` behavior (Task 6).
- Produces: working admin UI for repair news. Nothing downstream.

- [ ] **Step 1: Add the select option and conditional input.**

In the `newsType` select, add after `CUSTOMER_NEWS`:
```tsx
<option value="REPAIR_AND_INSPECTION_NEWS">Sửa chữa & Kiểm định</option>
```
Replace the customer-only location block with:
```tsx
{(values.newsType === 'CUSTOMER_NEWS' ||
  values.newsType === 'REPAIR_AND_INSPECTION_NEWS') &&
  field(
    'location',
    'Địa điểm *',
    <input
      type="text"
      value={values.location}
      onChange={(e) => set('location', e.target.value)}
      placeholder={
        values.newsType === 'CUSTOMER_NEWS'
          ? 'Nhập địa điểm khách hàng'
          : 'Nhập địa điểm sửa chữa & kiểm định'
      }
    />,
  )}
```

- [ ] **Step 2: Extend the list.**

`NEWS_TYPE_LABEL` gains:
```ts
REPAIR_AND_INSPECTION_NEWS: 'Sửa chữa & Kiểm định',
```
The type filter gains after `CUSTOMER_NEWS`:
```tsx
<option value="REPAIR_AND_INSPECTION_NEWS">Sửa chữa & Kiểm định</option>
```
The table's `Địa điểm` column already renders `n.location` for every type; no change.

- [ ] **Step 3: Verify.**

Run: `npm test; if ($?) { npm run build }; if ($?) { npm run lint }`
Expected: all exit 0.

- [ ] **Step 4: Smoke with the local API.**

Run `npm run dev` with the API up:
- Create a `Sửa chữa & Kiểm định` item with a location → saved and listed; the `Địa điểm` column shows the value.
- Edit it, confirm the field prefills, and save without changes.
- Switch an edited item to `Tin tức` → the field disappears; the request payload sends `location: null` (devtools).
- Leave `Địa điểm` blank on the repair type → submit is blocked with `Địa điểm là bắt buộc với tin Sửa chữa & Kiểm định`.
- Choose the new filter → request sends `?newsType=REPAIR_AND_INSPECTION_NEWS` and resets to page 0.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/types.ts src/features/news/newsFields.ts src/features/news/newsFields.test.ts src/features/news/NewsForm.tsx src/features/news/NewsList.tsx docs/specs/news.md docs/plans/news_crud.md
git commit -m "feat: add repair and inspection news type to admin"
```
