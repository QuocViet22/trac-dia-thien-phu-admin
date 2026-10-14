# Homepage Management (Quan ly trang chu) — Design Spec

## 1. Outcome & scope

- New admin page "Quan ly trang chu" styled on Danh muc (`CategoryList` table/filter/bulk-delete,
  `AdminShell` sidebar, `CategoryForm` upload flow).
- One item = one `Collection` row with a fixed `collectionType`. Seven sections map 1:1 to the
  existing `CollectionType` enum:
  - `HERO_SLIDER_COLLECTION` — slider, max 3, image-only
  - `PROMO_CARD_COLLECTION` — quang cao, max 3, image-only
  - `FEATURED_CATEGORY_COLLECTION` — danh muc noi bat, max 6, entity picker (category)
  - `BEST_SELLER_COLLECTION` — san pham ban chay, max 10, entity picker (product)
  - `CATEGORY_COLLECTION` — hien thi danh muc, max 4, entity picker (category, auto-fill)
  - `SERVICE_BANNER_COLLECTION` — dich vu, max 3, image-only
  - `NEWS_COLLECTION` — tin tuc, max 3, entity picker (news)
- Dropdown selector switches the edited component; default is slider. "Xem truoc" button opens an
  in-admin live preview modal (draft state, simplified copies of UI components).
- Scope is API + admin only. UI storefront (`trac-dia-thien-phu-ui`, hardcoded `data.ts`) is NOT
  rewired in this task.

## 2. API changes (reuse `Collection` + `GET /api/collections?collectionType=`)

- Add nullable `referenceId: UUID` to `Collection` entity (`reference_id BINARY(16)`), DTOs
  (`CollectionResponse`, `CreateCollectionRequest`, `UpdateCollectionRequest`).
  Semantics derive from `collectionType`: best-seller -> `Product.id`, featured/category ->
  `Category.id`, news -> `News.id`; image-only types store null. `name` keeps a display snapshot.
- Ordering fix: drop global unique on `orderIndex`; add `UNIQUE(collection_type, order_index)`.
  Repository: `existsByCollectionTypeAndOrderIndex` / `...AndIdNot`; service checks scoped per type.
- Strict max validation in service `create()` (count per type, throw `ConflictException` / 409 on
  overflow); `update()` validates on type change. Missing `referenceId` for entity types -> 400.
  Dangling references are returned as-is; admin renders a "deleted" placeholder row.
- No new controllers. Security rules unchanged. `ddl-auto: update` handles the column (repo
  convention, no SQL migration file). Upgraded DBs: run the manual DDL in
  `trac-dia-thien-phu-api/docs/migration-homepage.md` (drop old global `order_index` unique +
  stale type CHECK, ensure composite unique).

## 3. Admin page

- Route `/homepage` (lazy `HomepagePage.tsx`), sidebar + topbar title "Trang chu" in
  `AdminShell.tsx`, following `App.tsx` lazy-route pattern.
- `HomepagePage.tsx`: `<select>` with 7 options (default hero slider), `n/max` counter, preview
  button, content area:
  - `ImageSectionEditor` for slider/promo/service: one Collection row per item, single cover image
    via `ImageDropzone` + `uploadFile`/`deleteUpload` (same orphan-cleanup flow as `CategoryForm`),
    up/down reorder via `PUT orderIndex` swap + refetch.
  - `EntitySectionEditor` for featured/best-seller/category/news: searchable picker calling
    existing list APIs, selected list with remove + reorder, each selection = one Collection row
    (`name` snapshot + `referenceId` FK). Add disabled at max with "Da dat toi da N muc".
- `collections.api.ts` client reusing `apiFetch` envelope + 401-refresh from `lib/api.ts`.
- Preview modal: lightweight local copies of the 7 UI sections (image grids + labels) fed by draft
  state. No imports from the UI repo.

## 4. Data flow, errors, testing

- Load `GET /api/collections?collectionType=<selected>` on dropdown change; uploads via
  `POST /api/uploads` first, then collection POST/PUT; reorder = sequential PUT swaps + refetch.
- Errors reuse `ErrorPopup` + `formErrors`: 409 over-max -> max message, orderIndex conflict ->
  refetch + single retry, 404 reference -> inline placeholder row. Deletes use Danh muc modal style.
- API tests: extend `CollectionServiceTest` / `CollectionControllerTest` for per-type uniqueness,
  max limits, `referenceId` validation (TDD). Admin: no test runner — verify with `npm run build`
  plus manual dropdown -> edit -> preview -> reload per section.

## 5. Success criteria

- All 7 sections editable behind the dropdown with correct max enforcement + reorder.
- Preview reflects unsaved draft for every section.
- `npm run build` (admin) and `mvnw.cmd -q test` (API collection tests) pass.
