# Product Admin — Spec

## 1. Outcome

Full CRUD admin for products, bound to the real backend
(`GET/POST/PUT/DELETE /api/products` in `trac-dia-thien-phu-api`).
Design reference: `docs/specs/trac-dia-thien-phu-admin-design/product/`
(`product-list`, `add-product`) plus shared tokens in
`back_office_operations_system/DESIGN.md`.

Success criteria:

- `/products` lists server-paged products with category filter, working
  pagination, and edit/clone/delete actions.
- `/products/new` creates a product (`201`); blank name or missing
  category is rejected client-side before the request; duplicate
  `seoAlias` surfaces the backend `409` as a field error.
- `/products/:id` loads and updates (`200`); unknown id shows a
  not-found state (backend `404`).
- Delete (single + bulk) asks for confirmation and issues `DELETE`
  per id; unknown id surfaces the backend `404` message.

## 2. Shared foundation (used by all three specs)

- **Routing:** `react-router` (new dependency). Routes:
  `/products`, `/products/new`, `/products/:id`,
  `/categories`, `/categories/new`, `/categories/:id`, `/news`.
  Sidebar links to the three list routes.
- **API client:** `src/lib/api.ts` — single `fetch` wrapper.
  Base URL from `VITE_API_URL` (default `http://localhost:8080`).
  Unwraps the backend envelope `{success, message, data}`; on
  `success: false` throws an error carrying HTTP status + message.
  Unwraps Spring `Page` into `{items, total}` for tables.
  Error mapping: `400` → form/field message, `404` → not-found view,
  `409` → `seoAlias` conflict message. No auth headers (API has none).
- **Shell:** `src/components/AdminShell.tsx` — dark navy sidebar
  (240px, collapsible to 64px icon rail) + 56px header + canvas
  (max-width 1440px, 24px desktop / 16px mobile margins), per DESIGN.md.
- **Tables:** header 40px uppercase 12px `#5C6F84` on `#F4F6F8`; rows
  48px; checkbox first column; header swaps to bulk-action bar when
  rows are selected; pagination control with page-size options.
- **Forms:** 70/30 asymmetric grid (fields / side rail), sticky footer
  with `Hủy` (secondary, back to list) + `Lưu` (primary, submit).
- **Editor:** one rich-text library (e.g. Tiptap; exact pick in plan
  phase) for `description` fields; plain textareas elsewhere.
- **Images:** rows of `{imageUrl, name, sortOrder}`; star marks primary
  (`sortOrder: 0`); drag or up/down reorder; "add from URL" input.
  No binary upload (no backend endpoint accepts files).
- **UI language:** Vietnamese labels as in the screens; this spec is in
  English per repo convention.

## 3. List page (`/products`)

- Data: `GET /api/products?categoryId=<uuid>&page&size&sort`.
  `categoryId` omitted = all products.
- Filter bar: text search (client-side over the loaded page across
  name/SKU/barcode — no server search exists), category dropdown
  (options from `GET /api/categories`), column-toggle button may be
  omitted in v1.
- Columns: checkbox, image (first image thumb), name, SKU, barcode,
  category name (resolved from the category list), unit, status, actions.
  Status has no backend field: render "—" in v1 (see §5).
- Row actions: edit (→ `/products/:id`), clone (→ `/products/new`
  prefilled, `seoAlias` cleared), delete (confirm modal → `DELETE`).
- Bulk bar: selected count + delete (confirm modal, delete per id,
  refresh page afterwards).
- Pagination: server-driven (`total` from page response); sizes 20/50/100.

## 4. Form pages (`/products/new`, `/products/:id`)

Fields map 1:1 to `CreateProductRequest` / `UpdateProductRequest`:

| UI field | API field | Rules |
|---|---|---|
| Tên sản phẩm * | `name` | required, max 256 |
| Danh mục * | `categoryId` | required, select from category list |
| Mã SKU | `skuCode` | optional, max 256; blank sent as null (no auto-generation exists — label must not promise it) |
| Mã vạch | `barcode` | optional, max 256 |
| Đơn vị tính | `measurementUnit` | optional select: Cái, Chiếc, Bộ, Hộp, Kg, Lít |
| Mô tả chi tiết | `description` | rich text, unbounded |
| Tiêu đề trang / Thẻ mô tả / slug | `seoPageTitle`, `seoDescriptionTag`, `seoAlias` | optional, max 256 each; `seoAlias` unique |
| Ảnh sản phẩm | `images` | URL rows (see §2) |

- Edit loads `GET /api/products/{id}` and prefills; submit `PUT`.
- Validation mirrors backend (`@NotBlank name`, `@NotNull categoryId`,
  256-char limits) so errors appear before the round trip.

## 5. Out of scope (deferred, not faked)

- `Loại sản phẩm` (type), `Nhãn hiệu` (brand), `Trạng thái bán` toggle,
  price, stock, short-vs-detail description split — no backend columns.
- Server-side text search; product-count-per-category (category API has
  no count); binary image upload; AI SEO button (news design only).
