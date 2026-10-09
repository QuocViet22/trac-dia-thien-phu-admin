# Category Admin — Spec

## 1. Outcome

Full CRUD admin for categories, bound to the real backend
(`GET/POST/PUT/DELETE /api/categories` in `trac-dia-thien-phu-api`).
Design reference: `docs/specs/trac-dia-thien-phu-admin-design/category/`
(`category-list`, `add-category`).
Shell, API client, tables, forms, editor, and image conventions are
defined in `product.md` §2 and apply here unchanged.

Success criteria:

- `/categories` lists all categories with parent names resolved and
  working edit/delete actions.
- `/categories/new` creates a category (`201`); blank name is rejected
  client-side; duplicate `seoAlias` surfaces the backend `409`.
- `/categories/:id` loads and updates (`200`); unknown id shows a
  not-found state.
- Delete (single + bulk) uses the design's confirm modal and issues
  `DELETE` per id; backend rejection (e.g. category in use) surfaces
  its message.

## 2. List page (`/categories`)

- Data: `GET /api/categories` returns the **full list, unpaged**
  (optional `?parentId=<uuid>` / `?topLevel=true` server filters exist
  but v1 fetches all and filters client-side).
- Filter bar: text search (client-side over name + `seoAlias`); the
  `Bộ lọc khác` button may be omitted in v1.
- Columns: checkbox, image (first image thumb), name, parent category
  name (resolved from the same list, `—` for root), SEO slug
  (`seoAlias`), actions. **No product-count column** — the API exposes
  no count and computing it would cost one query per row.
- Row actions: edit (→ `/categories/:id`), delete (confirm modal).
- Bulk bar: selected count + delete (confirm modal, delete per id,
  refetch afterwards). No hide/show bulk action — categories have no
  status field.
- Pagination: client-side over the fetched list; sizes 20/50/100.

## 3. Form pages (`/categories/new`, `/categories/:id`)

Fields map 1:1 to `CreateCategoryRequest` / `UpdateCategoryRequest`:

| UI field | API field | Rules |
|---|---|---|
| Tên danh mục * | `name` | required, max 256 |
| Mô tả (ngắn + chi tiết) | `description` | single rich-text field, unbounded (API has one description — the design's two boxes merge into it) |
| Tiêu đề trang (SEO) / Mô tả SEO / slug | `seoPageTitle`, `seoDescription`, `seoAlias` | optional, max 256 each; `seoAlias` unique |
| Danh mục cha | `parentCategoryId` | optional select: root + all categories; on edit, exclude self (selecting self is rejected client-side) |
| Ảnh chính | `images[0]` | single cover via the §4 dropzone (device upload on submit, or URL) |
| Thư viện ảnh | `images[1..]` | gallery, max 10, via the §4 gallery manager (device files and/or URLs, reorderable, any item promotable to cover) |

- Edit loads `GET /api/categories/{id}` and prefills; submit `PUT`.
- Parent dropdown uses `GET /api/categories?topLevel=true` for root
  options plus the full list for the remaining choices.

## 4. Cover + gallery image upload (R2 via backend)

Two cards share one backend contract (`images[]` ordered by
`sortOrder`): "Ảnh chính" (cover = `images[0]`, `sortOrder: 0`)
and "Thư viện ảnh" (gallery = `images[1..]`). The list page thumb
still renders the first image, so promoting a gallery item to cover
means moving it to index 0 — no backend change. The promoted image
renders in the cover card immediately (device files via object URL),
on add and edit pages alike.

Cover card: unchanged single-slot dashed dropzone (`2px dashed
#CBD5E1`, `#F8FAFC` background, 6px radius; drag-active tints border
+ canvas to `#0088FF` / `#E5F3FF`): idle text "Kéo thả hoặc thêm ảnh
từ URL / Tải ảnh từ thiết bị". Three inputs, one cover slot:

- Drag-drop or device picker: file previews locally via object URL
  (thumbnail, name, size, remove button). Nothing uploads until submit.
- "Thêm ảnh từ URL": toggles a URL input (the previous behavior);
  picking a device file replaces the URL and vice versa.

Gallery card ("Thư viện ảnh"): thumbnail grid with per-item remove,
← / → reorder buttons, and "Đặt làm cover" (swap with index 0).
Add via multi-file drag-drop, multi-file device picker (`multiple`
attr), or URL input (one URL at a time). Max 10 gallery items
(cover excluded); exceeding 10 blocks submit client-side with zero
network calls. Each file previews via object URL, revoked on
remove/change/unmount.

Submit flow (both add and edit):

1. Client validates the form, then checks every file: image MIME only,
   max 5MB each, gallery count ≤ 10, else per-file/per-grid errors
   block submit.
2. If device files are present (cover and/or gallery): `POST
   /api/uploads` (multipart `file`) once per file, sequentially in
   display order → `{key, url}` each. The Lưu button shows progress
   and the form locks until all resolve; upload `400`/`413`/network
   errors show on the failing row and abort the submit.
3. `POST`/`PUT /api/categories` with `images` = ordered URLs mapped
   to `[{imageUrl, sortOrder: index}]` (cover first when present;
   URL entries skip step 2; no images sends `[]`).
4. If step 3 fails after step 2 succeeded: best-effort `DELETE
   /api/uploads/{key}` for every just-uploaded key, then surface the
   category error. Compensation failure only logs (the orphan keys are
   included in the error for manual cleanup).

Backend contract (`trac-dia-thien-phu-api` implements first; requires
updating its `docs/specs/image.md`, which currently forbids upload
endpoints):

- `POST /api/uploads` (multipart `file`, images only, 5MB cap) →
  `201` + `{key, url}`; key = uuid + original extension; R2 SDK and
  credentials live server-side from env; public URL via the bucket's
  public domain.
- `DELETE /api/uploads/{key}` → `204`, removes the R2 object. No DB
  rows for uploads — ownership still derives from category
  create/update as today.
- Hủy uploads nothing, so cancel needs no delete path.

## 5. Out of scope (deferred, not faked)

- Product-count column; hide/show status or bulk-hide (no backend field).
- Server-side search or pagination on categories.
- Device upload for product images (URL-only until this flow proves out).
