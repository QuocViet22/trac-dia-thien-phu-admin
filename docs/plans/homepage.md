# Homepage Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build API reference + ordering support and the admin "Quan ly trang chu" page with dropdown, strict max limits, reorder, and draft preview.

**Architecture:** Extend `Collection` with nullable `referenceId` (meaning derived from `collectionType`), scope `orderIndex` uniqueness per type, enforce per-type max counts in the service; admin adds a `homepage` feature with a type dropdown (default hero slider), image vs entity editors, and a preview modal of simplified UI copies.

**Tech Stack:** Spring Boot 4.1.1 / Java 21 / JPA (API); React 19 + TS + Vite, `apiFetch` envelope (admin).

**Spec:** `trac-dia-thien-phu-admin/docs/specs/homepage.md`

## Global Constraints

- Java package is `com.trac_dia_thien_phu_api` (underscores); API commands use `.\mvnw.cmd` on Windows.
- Admin: `verbatimModuleSyntax` (use `import type`), `noUnusedLocals/Parameters`, `erasableSyntaxOnly` (no enums); check with `npm run build`.
- Reuse `GET /api/collections?collectionType=` + CRUD; no new controllers; UI storefront untouched.
- Max counts: slider 5, promo 3, featured 6, best-seller 10, category-display 4, service 3, news 3.

## Review Focus

- Over-max create returns 409 with a clear message and creates nothing (most likely).
- Same `orderIndex` in different `collectionType`s coexists; same type + same index conflicts.
- Entity-type collection without `referenceId` is rejected with 400, not saved.
- Admin add button disables exactly at `n/max` and re-enables after a removal.
- Preview modal renders draft (unsaved) state, never requires a save first.

---

### Task 1: API entity + repository (referenceId, per-type ordering)

**Files:**
- Modify: `trac-dia-thien-phu-api/src/main/java/com/trac_dia_thien_phu_api/entity/Collection.java`
- Modify: `trac-dia-thien-phu-api/src/main/java/com/trac_dia_thien_phu_api/repository/CollectionRepository.java`
- Test: `trac-dia-thien-phu-api/src/test/java/com/trac_dia_thien_phu_api/repository/CollectionRepositoryTest.java`

**Interfaces:**
- Consumes: `CollectionType` enum (7 values, unchanged).
- Produces: `Collection.getReferenceId()/setReferenceId(UUID)`, `existsByCollectionTypeAndOrderIndex(CollectionType, Integer)`, `existsByCollectionTypeAndOrderIndexAndIdNot(CollectionType, Integer, UUID)` for Task 2.

- [ ] **Step 1: Write failing repo tests** — same `orderIndex` (e.g. 0) in `HERO_SLIDER_COLLECTION` and `PROMO_CARD_COLLECTION` both persist; duplicate index within one type violates the per-type unique constraint; `referenceId` round-trips (null and set UUID).
- [ ] **Step 2: Run to verify they fail** — Run: `.\mvnw.cmd -q -Dtest=CollectionRepositoryTest test` (workdir `trac-dia-thien-phu-api`). Expected: FAIL (methods/column missing).
- [ ] **Step 3: Implement** — add `@Column(name="reference_id", columnDefinition="BINARY(16)") private UUID referenceId`; drop global `unique=true` on `orderIndex`, add `@Table(uniqueConstraints=@UniqueConstraint(columnNames={"collection_type","order_index"}))`; replace `existsByOrderIndex*` with per-type variants.
- [ ] **Step 4: Run tests to verify pass** — same command. Expected: PASS.
- [ ] **Step 5: Commit** — `git add` entity, repository, repo test; `git commit -m "feat: per-type collection ordering with referenceId"`.

### Task 2: API service + DTO validation (max limits, referenceId rules)

**Files:**
- Modify: `.../dto/request/CreateCollectionRequest.java`, `.../dto/request/UpdateCollectionRequest.java`, `.../dto/response/CollectionResponse.java`
- Modify: `.../service/CollectionService.java`, `.../service/impl/CollectionServiceImpl.java`, `.../controller/CollectionController.java` (toResponse mapping only)
- Test: `.../src/test/.../service/CollectionServiceTest.java`, `.../controller/CollectionControllerTest.java`

**Interfaces:**
- Consumes: Task 1 repository methods + `Collection.referenceId`.
- Produces: `create/update` enforce max per type (409 via `ConflictException`) and 400 on missing `referenceId` for `BEST_SELLER/FEATURED_CATEGORY/CATEGORY/NEWS`; `CollectionResponse` includes `referenceId` consumed by Task 3-5.

- [ ] **Step 1: Write failing tests** — 4th hero-slider create throws `ConflictException` and saves nothing (`verify(save, never())`); best-seller create without `referenceId` throws `BadRequestException`; controller `POST` over-max returns 409; `toResponse` includes `referenceId`.
- [ ] **Step 2: Run to verify they fail** — Run: `.\mvnw.cmd -q -Dtest=CollectionServiceTest,CollectionControllerTest test`. Expected: FAIL.
- [ ] **Step 3: Implement** — DTOs gain `UUID referenceId` (nullable); service adds `MAX_BY_TYPE` map (3/3/6/10/4/3/3), count check on create (and on type-change in update), per-type orderIndex checks, `requireReference(type, id)` rule; controller maps `referenceId` both ways.
- [ ] **Step 4: Run tests to verify pass** — same command, then full `.\mvnw.cmd -q test`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: collection max limits and reference validation"`.

### Task 3: Admin client + page shell (route, dropdown, counter)

**Files:**
- Create: `trac-dia-thien-phu-admin/src/features/homepage/collections.api.ts`, `trac-dia-thien-phu-admin/src/features/homepage/homepageTypes.ts`, `trac-dia-thien-phu-admin/src/features/homepage/HomepagePage.tsx`
- Modify: `trac-dia-thien-phu-admin/src/App.tsx`, `trac-dia-thien-phu-admin/src/components/AdminShell.tsx`
- Test: manual via `npm run build` (no runner configured)

**Interfaces:**
- Consumes: `apiFetch` from `src/lib/api.ts`; `GET /api/collections?collectionType=` returning `Collection[]` with `referenceId`.
- Produces: `listCollections(type)`, `createCollection`, `updateCollection`, `deleteCollection`; `HOMEPAGE_SECTIONS` (7 entries with `type`, `label`, `max`, `mode: 'image'|'entity'`) and selected-type state consumed by Tasks 4-5.

- [ ] **Step 1: Write shell with failing build** — add `Collection`/`CollectionType` types, client functions, `HOMEPAGE_SECTIONS` with exact max values, `HomepagePage` with `<select>` (default `HERO_SLIDER_COLLECTION`), `n/max` counter loading `listCollections(type)` on change; wire `/homepage` route + sidebar "Trang chu".
- [ ] **Step 2: Run to verify it fails** — Run: `npm run build` (workdir `trac-dia-thien-phu-admin`). Expected: FAIL (missing editors referenced by the page).
- [ ] **Step 3: Implement minimal shell** — stub the two editor slots with placeholder text so the page compiles; keep dropdown fetch + counter + error/retry (copy `CategoryList` pattern).
- [ ] **Step 4: Run to verify it passes** — same command. Expected: PASS; manual: open `/homepage`, switch all 7 options, counter updates.
- [ ] **Step 5: Commit** — `git commit -m "feat: homepage admin shell with section dropdown"`.

### Task 4: Admin image editors (slider/promo/service) + reorder + strict block

**Files:**
- Create: `trac-dia-thien-phu-admin/src/features/homepage/ImageSectionEditor.tsx`
- Modify: `HomepagePage.tsx` (render editor for `mode:'image'`)

**Interfaces:**
- Consumes: Task 3 client + `ImageDropzone`, `uploadFile`/`deleteUpload`, `ErrorPopup` patterns from `CategoryForm`.
- Produces: image-section CRUD with reorder used as reference for Task 5 entity list behavior.

- [ ] **Step 1: Build editor UI** — list rows (thumb, name, up/down, delete with Danh-muc-style confirm modal), add form (dropzone + upload with orphan cleanup on failure), add disabled at `n/max` with "Đã đạt tối đa N muc".
- [ ] **Step 2: Wire reorder** — up/down issues `PUT` orderIndex swaps then refetches; conflict triggers single refetch + retry.
- [ ] **Step 3: Verify** — Run: `npm run build`. Expected: PASS; manual: fill slider to 3/3 (4th blocked), reorder persists after reload, 409 shows max message.
- [ ] **Step 4: Commit** — `git commit -m "feat: homepage image section editor with reorder"`.

### Task 5: Admin entity pickers + preview modal

**Files:**
- Create: `trac-dia-thien-phu-admin/src/features/homepage/EntitySectionEditor.tsx`, `trac-dia-thien-phu-admin/src/features/homepage/HomepagePreview.tsx`
- Modify: `HomepagePage.tsx` (render editor for `mode:'entity'` + "Xem trước" button)

**Interfaces:**
- Consumes: Task 3 client + `listProducts`/`listCategories`/`listNews` pickers; draft section data for preview.
- Produces: complete `/homepage` page per spec.

- [ ] **Step 1: Build entity editor** — searchable picker per section kind (product/category/news with paged search), selected list with remove + up/down reorder, each row stores `name` snapshot + `referenceId`; strict max block; dangling reference renders "Muc da bi xoa" removable row.
- [ ] **Step 2: Build preview modal** — "Xem trước" opens modal with 7 simplified section previews fed by draft state (image grids + labels), closable, no save required.
- [ ] **Step 3: Verify** — Run: `npm run build`, `npm run lint`. Expected: PASS; manual per section: pick to max (10 best-sellers, 6 featured, 4 categories, 3 news), over-max blocked, preview matches draft, reload persists.
- [ ] **Step 4: Commit** — `git commit -m "feat: homepage entity pickers and draft preview"`.

---

# Phase 2 — Picker 20-record cap with full search (2026-11-04)

**Goal:** In "Thêm mục mới" of the five entity homepage sections, show at most 20 candidate rows while keeping every record reachable through search.

**Architecture:** Add a pure `pickCandidates` helper (filter, then slice to 20) with a Vitest test. Add optional `name`/`title` params to the product/news API clients. Rewrite `EntitySectionEditor` candidate loading: category sections filter the already-loaded full list, product/news sections call server-side search with a 300 ms debounce, and the table renders `pickCandidates(...).visible`.

**Spec:** `docs/specs/homepage.md` §8.

## Phase 2 Global Constraints

- The cap is display-only for categories — keep the full category list in state for duplicate prevention and dangling-reference checks.
- Product/news must use server search (`?name=`, `?title=`); never fetch the full catalogue client-side.
- `PICKER_LIMIT = 20` is the single source of truth.
- Admin commands run from `trac-dia-thien-phu-admin`: `npm run test`, `npm run lint`, `npm run build`.
- TS: `import type`, no unused locals/params, no enums.

## Phase 2 Review Focus

1. A category outside the first 20 must still be found by search. → `picker.test.ts` + manual.
2. A product/news outside the first 20 must still be found; the server, not the loaded page, does the filtering. → manual (API title/name tests cover the backend).
3. Selected items must not be mistaken for deleted when the picker only loads 20 rows — categories keep the full list; product/news keep the existing per-reference `get` check. → code review + manual.
4. Product/news must not send one request per keystroke. → 300 ms debounce + manual network check.
5. Removing pagination must not leave dead state, unused imports, or a stale `page` reference. → `npm run lint` + `npm run build`.

### Task 6: Pure picker helper + test

**Files:**
- Create: `src/features/homepage/picker.ts`
- Test: `src/features/homepage/picker.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `PICKER_LIMIT: number` (20), `Candidate { id: string; name: string }`, `pickCandidates(candidates: Candidate[], query: string): { visible: Candidate[]; matchedCount: number }` — consumed by Task 8.

- [x] **Step 1: Write the failing test.**

Create `picker.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { PICKER_LIMIT, pickCandidates } from './picker'

function makeCandidates(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: String(i), name: `Mục ${i}` }))
}

describe('pickCandidates', () => {
  it('caps the visible list at 20 rows', () => {
    const result = pickCandidates(makeCandidates(25), '')

    expect(result.visible).toHaveLength(PICKER_LIMIT)
    expect(result.matchedCount).toBe(25)
  })

  it('searches the full list before capping', () => {
    const result = pickCandidates(makeCandidates(25), 'mục 24')

    expect(result.visible.map((c) => c.id)).toEqual(['24'])
    expect(result.matchedCount).toBe(1)
  })

  it('trims the query and ignores case', () => {
    const candidates = [{ id: '1', name: 'Danh Mục Nổi Bật' }]

    expect(pickCandidates(candidates, '  mục nổi  ').visible).toEqual(candidates)
  })

  it('returns exactly 20 matches without truncating them', () => {
    const result = pickCandidates(makeCandidates(20), '')

    expect(result.visible).toHaveLength(20)
    expect(result.matchedCount).toBe(20)
  })
})
```

- [x] **Step 2: Run test to verify it fails.**

Run: `npm run test -- picker.test.ts`
Expected: FAIL — `Cannot find module './picker'`.

- [x] **Step 3: Implement `picker.ts`.**

```ts
export const PICKER_LIMIT = 20

export interface Candidate {
  id: string
  name: string
}

export function pickCandidates(
  candidates: Candidate[],
  query: string,
): { visible: Candidate[]; matchedCount: number } {
  const keyword = query.trim().toLowerCase()
  const matched =
    keyword === '' ? candidates : candidates.filter((c) => c.name.toLowerCase().includes(keyword))
  return { visible: matched.slice(0, PICKER_LIMIT), matchedCount: matched.length }
}
```

- [x] **Step 4: Run test to verify it passes.**

Run: `npm run test -- picker.test.ts`
Expected: PASS (4 tests).

- [x] **Step 5: Commit.**

```bash
git add src/features/homepage/picker.ts src/features/homepage/picker.test.ts
git commit -m "feat: add 20-row homepage picker helper"
```

### Task 7: Optional search params in API clients

**Files:**
- Modify: `src/features/products/products.api.ts`
- Modify: `src/features/news/news.api.ts`

**Interfaces:**
- Consumes: existing `PageResult`, `SpringPage`, `unwrapPage`, `apiFetch`.
- Produces: `listProducts(categoryId, page, size, name?)`; `listNews(status, newsType, page, size, title?)` — consumed by Task 8. Existing callers keep working because the new params are optional.

- [x] **Step 1: Add the optional `name` param to `listProducts`.**

```ts
export async function listProducts(
  categoryId: string | undefined,
  page: number,
  size: number,
  name?: string,
): Promise<PageResult<Product>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (categoryId) params.set('categoryId', categoryId)
  if (name) params.set('name', name)
  const data = await apiFetch<SpringPage<Product>>(`/api/products?${params.toString()}`)
  return unwrapPage(data)
}
```

- [x] **Step 2: Add the optional `title` param to `listNews`.**

```ts
export async function listNews(
  status: NewsStatus | undefined,
  newsType: NewsType | undefined,
  page: number,
  size: number,
  title?: string,
): Promise<PageResult<News>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (status) params.set('status', status)
  if (newsType) params.set('newsType', newsType)
  if (title) params.set('title', title)
  const data = await apiFetch<SpringPage<News>>(`/api/news?${params.toString()}`)
  return unwrapPage(data)
}
```

- [x] **Step 3: Verify existing callers still compile.**

Run: `npm run build`
Expected: PASS — `ProductList`, `NewsList`, and `EntitySectionEditor` compile without changes.

- [x] **Step 4: Commit.**

```bash
git add src/features/products/products.api.ts src/features/news/news.api.ts
git commit -m "feat: expose name and title search params in admin clients"
```

### Task 8: Cap and search the "Thêm mục mới" picker

**Files:**
- Modify: `src/features/homepage/EntitySectionEditor.tsx`

**Interfaces:**
- Consumes: `PICKER_LIMIT`, `pickCandidates`, `Candidate` from Task 6; `listProducts(..., name?)`, `listNews(..., title?)` from Task 7; existing `listCategories`, `getProduct`, `getNews`, `getCategory`.
- Produces: the five entity sections render at most 20 candidate rows with server-backed search.

- [x] **Step 1: Replace the picker state and loading effects.**

Remove `PAGE_SIZE`, `page`, `pageCount`, and the previous/next pager JSX. Remove the local `Candidate` interface and import it from `./picker` together with `PICKER_LIMIT` and `pickCandidates`. Keep `total` for the cap hint.

Use two effects (the component remounts per section, so no cross-kind reset is needed):

```tsx
useEffect(() => {
  if (kind !== 'category') return
  let cancelled = false
  setPickerLoading(true)
  setPickerError('')
  listCategories()
    .then((res) => {
      if (cancelled) return
      setCandidates(res.map((c) => ({ id: c.id, name: c.name })))
      setTotal(res.length)
    })
    .catch((e: unknown) => {
      if (!cancelled) setPickerError(e instanceof Error ? e.message : 'Request failed')
    })
    .finally(() => {
      if (!cancelled) setPickerLoading(false)
    })
  return () => {
    cancelled = true
  }
}, [kind, reloadNonce])

useEffect(() => {
  if (kind === 'category') return
  let cancelled = false
  setPickerLoading(true)
  setPickerError('')
  const timer = setTimeout(() => {
    const keyword = query.trim()
    const load =
      kind === 'product'
        ? listProducts(undefined, 0, PICKER_LIMIT, keyword || undefined).then((res) => {
            if (cancelled) return
            setCandidates(res.items.map((p) => ({ id: p.id, name: p.name })))
            setTotal(res.total)
          })
        : listNews(undefined, undefined, 0, PICKER_LIMIT, keyword || undefined).then((res) => {
            if (cancelled) return
            setCandidates(res.items.map((n) => ({ id: n.id, name: n.title })))
            setTotal(res.total)
          })
    load
      .catch((e: unknown) => {
        if (!cancelled) setPickerError(e instanceof Error ? e.message : 'Request failed')
      })
      .finally(() => {
        if (!cancelled) setPickerLoading(false)
      })
  }, 300)
  return () => {
    cancelled = true
    clearTimeout(timer)
  }
}, [kind, query, reloadNonce])
```

**Shipped deviation:** the `setPickerLoading(true)`/`setPickerError('')` calls were moved out of the effect bodies into the search input's `onChange` (and the retry button), because ESLint `react-hooks/set-state-in-effect` rejects them inside an effect. The component remounts per section (`key={section.type}` in `HomepagePage`), so the initial `pickerLoading = true` covers each first load. The category effect no longer calls `setTotal` — the hint uses `matchedCount` there. Selected-reference existence probes are tracked in a `verifiedIds` ref: a server-side search replaces `candidates` on every query, so testing against `candidates` would re-probe every selected row on every keystroke pause.

- [x] **Step 2: Render the capped list and hint.**

Replace the local `normalizedQuery`/`filtered` block with:

```tsx
const { visible, matchedCount } = pickCandidates(candidates, query)
const moreThanLimit = kind === 'category' ? matchedCount > PICKER_LIMIT : total > PICKER_LIMIT
```

Use `visible` in the empty check and the candidate `map`. Inside the search `.field`, after the `<input>`:

```tsx
{moreThanLimit && (
  <span className="hint" id={`picker-hint-${collectionType}`} role="status">
    Chỉ hiển thị tối đa {PICKER_LIMIT} mục — nhập tên để tìm các mục khác.
  </span>
)}
```

The input gets `id={`picker-search-${collectionType}`}`, a matching `<label htmlFor>`, and `aria-describedby` pointing at the hint, so the cap is announced to screen readers.

- [x] **Step 3: Verify tests, lint, and build.**

Run: `npm run test`
Expected: PASS (picker tests + existing suite).

Run: `npm run lint`
Expected: PASS, no unused `page`/`filtered`/imports.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Manual check each entity section.** — NOT RUN: no browser and the local admin/API/DB stack was not started in this session. The 20-row cap and filtering are covered by `picker.test.ts`; the API title/name search by the API tests. Remaining to check by hand: cap hint copy, 300 ms debounce, and deleted-reference placeholders in the five sections.

On `/homepage`, for `Danh mục sidebar`, `Danh mục nổi bật`, `Sản phẩm bán chạy`, `Hiển thị danh mục`, `Tin tức`:
- The candidate table shows at most 20 rows.
- A record outside the first 20 is found by typing its name.
- Clearing the search returns to the first 20.
- The selected-items table above still shows every saved row, and deleted references still show the placeholder.
- Product/news requests appear only after a short typing pause (300 ms).

- [x] **Step 5: Commit.**

```bash
git add src/features/homepage/EntitySectionEditor.tsx
git commit -m "feat: cap homepage pickers at 20 rows with full search"
```

- [x] **Step 6: Update the spec if behavior changed.**

Re-read `docs/specs/homepage.md` §8. If the shipped behavior differs (hint copy, debounce, or which sections are capped), update that section before finishing.
