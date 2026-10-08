# News Admin — Spec

## 1. Outcome

Read-only news list matching the design screens. **There is no news
backend** — `trac-dia-thien-phu-api` has no news controller, entity, or
DTOs — so v1 is a static list page with local mock rows. No create
page (explicitly skipped), no edit, no persistence.
Design reference: `docs/specs/trac-dia-thien-phu-admin-design/news/`
(`news-list`; `add-news` is reference only).
Shell and table conventions are defined in `product.md` §2 and apply
here unchanged.

Success criteria:

- `/news` renders the designed table (cover, title, author, tags, date,
  views, status) from a local mock dataset with working tab/filter/
  search/pagination — all client-side.
- No network calls; no dead buttons: mutating actions (pin, draft,
  delete) are **hidden** in v1, row action is view-only.

## 2. List page (`/news`)

- Data: `src/data/mockNews.ts` — ~10 hand-written rows with the design's
  columns: `id`, `coverUrl`, `title`, `author`, `tags[]`, `publishedAt`,
  `views`, `status` (`published` | `draft` | `pinned`).
- Tabs: `Tất cả` + status tabs with counts, client-filtered.
- Filter bar: text search (title), author dropdown, time dropdown,
  `Bộ lọc khác` may be omitted in v1.
- Columns: checkbox (selection state kept for visual parity but no bulk
  bar appears since actions are hidden), cover, title, author, tags,
  date, views, status badge, view action (opens a read-only detail
  drawer or route showing the mock row — plan phase picks the cheaper
  one).
- Pagination: client-side; sizes 10/20/50.

## 3. Explicitly excluded

- `/news/new` create page, edit, delete, pin, draft transitions —
  nothing to persist them to.
- Rich-text editing and cover upload for news (no fields to save to).

## 4. Backend contract (for later)

When a news API is added, it should mirror the product/category shape:
`GET /api/news` (paged + `author` filter), `GET /{id}`, `POST`, `PUT`,
`DELETE`, wrapped in `ApiResponse`, with `title*`, `summary`,
`content`, `author`, `tags[]`, `coverImageUrl`, `seo*` fields. This
page then swaps `mockNews.ts` for the client in `product.md` §2 with
no layout changes.
