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

- [ ] **Step 1: Build editor UI** — list rows (thumb, name, up/down, delete with Danh-muc-style confirm modal), add form (dropzone + upload with orphan cleanup on failure), add disabled at `n/max` with "Da dat toi da N muc".
- [ ] **Step 2: Wire reorder** — up/down issues `PUT` orderIndex swaps then refetches; conflict triggers single refetch + retry.
- [ ] **Step 3: Verify** — Run: `npm run build`. Expected: PASS; manual: fill slider to 3/3 (4th blocked), reorder persists after reload, 409 shows max message.
- [ ] **Step 4: Commit** — `git commit -m "feat: homepage image section editor with reorder"`.

### Task 5: Admin entity pickers + preview modal

**Files:**
- Create: `trac-dia-thien-phu-admin/src/features/homepage/EntitySectionEditor.tsx`, `trac-dia-thien-phu-admin/src/features/homepage/HomepagePreview.tsx`
- Modify: `HomepagePage.tsx` (render editor for `mode:'entity'` + "Xem truoc" button)

**Interfaces:**
- Consumes: Task 3 client + `listProducts`/`listCategories`/`listNews` pickers; draft section data for preview.
- Produces: complete `/homepage` page per spec.

- [ ] **Step 1: Build entity editor** — searchable picker per section kind (product/category/news with paged search), selected list with remove + up/down reorder, each row stores `name` snapshot + `referenceId`; strict max block; dangling reference renders "Muc da bi xoa" removable row.
- [ ] **Step 2: Build preview modal** — "Xem truoc" opens modal with 7 simplified section previews fed by draft state (image grids + labels), closable, no save required.
- [ ] **Step 3: Verify** — Run: `npm run build`, `npm run lint`. Expected: PASS; manual per section: pick to max (10 best-sellers, 6 featured, 4 categories, 3 news), over-max blocked, preview matches draft, reload persists.
- [ ] **Step 4: Commit** — `git commit -m "feat: homepage entity pickers and draft preview"`.
