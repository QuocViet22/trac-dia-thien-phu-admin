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
- `/products/new` creates a product (`201`); blank name, missing
  category, blank brand, or blank `seoAlias` is rejected client-side
  before the request; duplicate
  `seoAlias` surfaces the backend `409` as a field error.
- `/products/:id` loads and updates (`200`); unknown id shows a
  not-found state (backend `404`).
- Delete (single + bulk) asks for confirmation and issues `DELETE`
  per id; unknown id surfaces the backend `404` message.

## 2. Shared foundation (used by all three specs)

- **Routing:** `react-router` (new dependency). Routes:
  `/products`, `/products/new`, `/products/:id`,
  `/categories`, `/categories/new`, `/categories/:id`,
  `/news`, `/news/new`, `/news/:id`.
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
- **Images:** cover (`images[0]`, `sortOrder: 0`) + gallery
  (`images[1..]`, max 10), same behavior as categories (`category.md`
  §4): device upload via `POST /api/uploads` on submit (image MIME,
  5MB cap each), or URL; reorderable, any item promotable to cover;
  failed submit compensates with `DELETE /api/uploads/{key}`.
  No per-image `name` (dropped from the form model).
- **UI language:** Vietnamese labels as in the screens; this spec is in
  English per repo convention.

## 3. List page (`/products`)

- Data: `GET /api/products?categoryId=<uuid>&page&size&sort`.
  `categoryId` omitted = all products.
- Filter bar: text search (client-side over the loaded page across
  name/SKU/barcode — no server search exists), category dropdown
  (options from `GET /api/categories`), searchable single-brand dropdown
  (`Thương hiệu`, client-side exact-match on `brand` over the loaded page,
  options from shared `BRANDS` in `src/features/products/brands.ts` with
  accent-insensitive search), column-toggle button may be
  omitted in v1.
- Columns: checkbox, image (first image thumb), name, SKU, barcode,
  category name (resolved from the category list), unit, status, actions.
  Status has no backend field: render "—" in v1 (see §5).
- Row actions: edit (→ `/products/:id`), clone (→ `/products/new`
  prefilled, `seoAlias` and `images` cleared), delete (confirm modal → `DELETE`).
- Bulk bar: selected count + delete (confirm modal, delete per id,
  refresh page afterwards).
- Pagination: server-driven (`total` from page response); sizes 20/50/100.

## 4. Form pages (`/products/new`, `/products/:id`)

Fields map 1:1 to `CreateProductRequest` / `UpdateProductRequest`:

| UI field | API field | Rules |
|---|---|---|
| Tên sản phẩm * | `name` | required, max 256 |
| Danh mục * | `categoryId` | required, select from category list |
| Nhãn hiệu * | `brand` | required, max 256; fixed dropdown (`BRANDS` list in `ProductForm.tsx`) |
| Mã SKU | `skuCode` | optional, max 256; blank sent as null (no auto-generation exists — label must not promise it) |
| Mã vạch | `barcode` | optional, max 256 |
| Đơn vị tính | `measurementUnit` | optional select: Cái, Chiếc, Bộ, Hộp, Kg, Lít |
| Mô tả chi tiết | `description` | rich text, unbounded |
| Tiêu đề trang / Thẻ mô tả / slug | `seoPageTitle`, `seoDescriptionTag`, `seoAlias` | `seoPageTitle`/`seoDescriptionTag` optional, max 256 each; `seoAlias` required, max 256, unique |
| Ảnh chính / Thư viện ảnh | `images` | cover + gallery per §2 (device upload on submit, or URLs; names dropped) |

- Edit loads `GET /api/products/{id}` and prefills; submit `PUT`.
- Empty categories: the `Danh mục *` card shows a warning badge plus a
  "Tạo danh mục mới" link (`/categories/new`); submit stays blocked by
  the required-category validation.
- Validation mirrors backend (`@NotBlank name`, `@NotBlank brand`,
  `@NotNull categoryId`,
  256-char limits) so errors appear before the round trip.

## 5. Out of scope (deferred, not faked)

- `Loại sản phẩm` (type), `Trạng thái bán` toggle,
  price, stock, short-vs-detail description split — no backend columns.
- Server-side text search; product-count-per-category (category API has
  no count); AI SEO button (news design only).
