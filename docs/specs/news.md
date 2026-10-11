# News Admin — Spec

## 1. Outcome

Full CRUD admin for news, bound to the real backend
(`GET/POST/PUT/DELETE /api/news` in `trac-dia-thien-phu-api`).
Design reference: `docs/specs/trac-dia-thien-phu-admin-design/news/`
(`news-list`, `add-news` for layout only — fields follow the backend,
not the mock).
Shell and table/form conventions are defined in `product.md` §2 and
apply here unchanged.

Success criteria:

- `/news` lists server-paged news with status tabs, a type filter,
  and working pagination; no title/author search (backend has no
  search).
- `/news/new` creates a news item (`201`); blank `title`, blank
  `author`, blank `seoAlias`, or missing `status`/`newsType` is
  rejected client-side; duplicate `seoAlias` surfaces the backend
  `409` as a slug field error.
- `/news/:id` loads and updates (`200`); unknown id shows a
  not-found state (backend `404`).
- Delete (single + bulk) asks for confirmation and issues `DELETE`
  per id; unknown id surfaces the backend `404` message.

## 2. List page (`/news`)

- Data: `GET /api/news?status=PUBLISHED|DRAFT&newsType=NEWS|HIRING_PRODUCT&page&size`.
  Either filter omitted = all. Server-driven pagination; sizes 10/20/50.
- Tabs: `Tất cả` / `Đã đăng` / `Nháp`. Tabs switch the `status`
  query param and reset to page 0. **No counts on tabs** — counts
  would cost extra requests per tab switch.
- Type filter: `Loại` dropdown (`Tất cả` / `Tin tức` /
  `Thuê sản phẩm`) beside the tabs; switches the `newsType` query
  param, combines with `status`, and resets to page 0.
- No search boxes in v1: backend supports no title/author filter, so
  the mock's title search, author dropdown, and time dropdown are
  dropped (server-only, per owner decision).
- Columns: checkbox, cover (`images[0]` thumb, `—` when empty),
  title, author, type badge (`Tin tức` / `Thuê sản phẩm`), SEO slug
  (`seoAlias`), status badge (`Đã đăng` / `Nháp`), created date
  (`createdAt`, `vi-VN`), actions. **No views, no tags, no pinned
  state** — backend has none of these columns.
- Row actions: edit (→ `/news/:id`), delete (confirm modal →
  `DELETE /api/news/{id}`).
- Bulk bar: selected count + delete (confirm modal, delete per id via
  shared `deleteMany`, refetch afterwards).
- States: loading spinner, fetch-error with retry (never a blank
  page), empty state with intact pager.
- Deletes `src/features/news/mockNews.ts`, `newsFilters.ts`, and
  `newsFilters.test.ts` — all mock-only and unusable against the
  real shape.

## 3. Form pages (`/news/new`, `/news/:id`)

Fields map 1:1 to `CreateNewsRequest` / `UpdateNewsRequest`:

| UI field | API field | Rules |
|---|---|---|
| Tiêu đề * | `title` | required, max 256 |
| Tác giả * | `author` | required, max 256 |
| Trạng thái * | `status` | required select: `PUBLISHED` (Đã đăng) / `DRAFT` (Nháp) |
| Loại tin * | `newsType` | required select: `NEWS` (Tin tức) / `HIRING_PRODUCT` (Thuê sản phẩm); create defaults to `NEWS`, edit prefills from server |
| Mô tả chi tiết | `description` | rich text (Tiptap via `HtmlPreview`, same as categories), unbounded |
| Tiêu đề trang (SEO) | `seoPageTitle` | optional, max 256 |
| Thẻ mô tả (SEO) | `seoDescriptionTag` | optional, unbounded textarea |
| Đường dẫn (slug) * | `seoAlias` | required, max 256, unique |
| Ảnh bìa | `images` | max 1: single cover row (URL input; device upload via the shared `ImageDropzone` + `POST /api/uploads` flow from `category.md` §4 if already wired, else URL-only in v1) → `[{imageUrl, sortOrder: 0}]` or `[]` |

- Layout: 70/30 grid with sticky `Hủy`/`Lưu` footer (same as
  `CategoryForm`); left = general info + description + SEO cards,
  right = status + cover cards.
- Edit loads `GET /api/news/{id}` (`NewsDetailResponse`) and
  prefills; submit `PUT`. Unknown id → not-found view.
- Validation mirrors backend (`@NotBlank title/author/seoAlias`,
  `@NotNull status/newsType`, 256 limits, `@Size(max = 1)` images) so errors
  appear before the round trip. Backend `400` → field/form message,
  `409` → `seoAlias` field (via `formErrorForApi`).

## 4. Backend contract (implemented)

`NewsController` at `/api/news` (`trac-dia-thien-phu-api`):

- `GET` → `ApiResponse.ok(Page<NewsResponse>)` (`status?` +
  `newsType?` + Spring `Pageable`). `NewsResponse`: `id`, `title`, `author`,
  `status`, `newsType`, `seoAlias`, `createdAt`, `updatedAt`,
  `seoDescriptionTag`, `images[max 1]`. **No `description`, no
  `seoPageTitle`** in list payloads.
- `GET /{id}` → `NewsDetailResponse` (all list fields plus
  `description`, `seoPageTitle`); unknown id → `404`.
- `POST` (`@Valid`) → `201` + `NewsResponse`; blank title/author/
  alias or null status/newsType → `400`; >1 image → `400`; duplicate
  `seo_alias` → `409`.
- `PUT /{id}` → `200` + `NewsDetailResponse`; same `400`/`404`/`409`
  rules.
- `DELETE /{id}` → `204`; unknown id → `404`.
- `GET /by-alias/{seoAlias}` exists but the admin uses `/{id}` only.

## 5. Explicitly excluded

- Pinned/highlight tab, views column, tags column, publish-date
  picker — no backend columns; dropped per owner decision (not faked
  client-side).
- Client- or server-side title/author/time search (no backend
  support; server-only list in v1).
- Tab counts, multi-image galleries for news (capped at 1 by owner
  decision), full-text search.
