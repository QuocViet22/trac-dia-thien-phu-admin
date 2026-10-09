# Category Gallery (Cover + Gallery) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the category form with a separate gallery card (max 10) alongside the existing single cover dropzone.

**Architecture:** Reuse `uploadFile`/`deleteUpload` and `validateImageFile` unchanged; add pure gallery helpers in `imageUpload.ts`, a new `GalleryManager.tsx` grid component, and orchestrate cover-first sequential upload → ordered `images[]` submit → compensate-delete in `CategoryForm.tsx`. No backend change (`images[]` with `sortOrder` already supports this).

**Tech Stack:** React 19, react-router, existing `apiFetch`/`apiForm` envelope, no new dependencies (native drag-drop + file input + object-URL previews).

**Spec:** `docs/specs/category.md` §3–§4 (cover = `images[0]`, gallery = `images[1..]`).

## Global Constraints

- `npm run build` must pass (`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` — `import type` for types; no enums).
- `npm run lint` must pass — only components exported from component files.
- `npm test` (`vitest run`) exists; pure logic gets RED→GREEN tests, components get build + lint + dev smoke.
- Gallery max 10 items (cover excluded); each file image-MIME only, 5MB cap; messages in Vietnamese.
- Cover and gallery never share state; "Đặt làm cover" swaps gallery item to index 0.
- Nothing uploads before Lưu; Hủy navigates with zero network calls.

## Review Focus

- 11th gallery item added → submit blocked with Vietnamese error, zero `POST /api/uploads` calls (pinned by Task 1 count test).
- One gallery file oversize/non-image among valid ones → whole submit blocked, zero uploads (pinned by Task 1 validation test).
- Upload #2 of 3 fails → submit aborts, error lands on that row, category `POST/PUT` never fires (reviewer checks Task 3 code path).
- Category submit fails after 2 uploads → compensation `DELETE /api/uploads/{key}` fires for both keys (reviewer checks Task 3 wiring + devtools smoke).
- Removing an already-saved image on edit orphans the old R2 object by design (no delete-by-URL); error message includes orphan keys for manual cleanup.

---

## File structure

- `src/features/categories/imageUpload.ts` — add `MAX_GALLERY_IMAGES = 10`, `GalleryItem = {kind:'file';file:File} | {kind:'url';url:string}`, helpers `validateGalleryCount`, `galleryToUrls`, `promoteToCover`.
- `src/features/categories/GalleryManager.tsx` — new grid component (multi drag-drop + `multiple` picker + URL add, remove, move left/right, promote to cover, per-row error).
- `src/features/categories/CategoryForm.tsx` — add `gallery` state, init from `c.images.slice(1)` on edit, sequential upload + ordered payload + compensation.
- `src/features/categories/categoryFields.ts` — extend `toCategoryPayload` to accept ordered URL list (cover-first) instead of single `imageUrl`.
- `src/index.css` — append `.gallery-grid` + thumb styles reusing DESIGN.md tokens.

### Task 1: Gallery domain logic — types, validation, payload ordering

**Files:**
- Modify: `src/features/categories/imageUpload.ts`, `src/features/categories/categoryFields.ts`
- Test: `src/features/categories/imageUpload.test.ts` (extend), `src/features/categories/categoryFields.test.ts` (extend)

**Interfaces:**
- Consumes: `validateImageFile(file: File) => string | null`, `CoverValue` (existing); `CategoryFormValues`, `CategoryPayload` (existing).
- Produces: `MAX_GALLERY_IMAGES = 10`; `GalleryItem`; `validateGalleryCount(n: number) => string | null`; `resolveGalleryError(items: GalleryItem[]) => string | null` (count + per-file validation, first error wins); `buildImageUrls(cover: CoverValue, gallery: GalleryItem[]) => string[]` (cover URL first when present, then gallery URLs in order; `file` items excluded — caller replaces them with uploaded URLs before calling); `toCategoryPayloadFromUrls(values, urls: string[]) => CategoryPayload` (`images: urls.map((u, i) => ({imageUrl: u, sortOrder: i}))`).

- [ ] **Step 1: Write the failing tests** in `src/features/categories/imageUpload.test.ts` and `src/features/categories/categoryFields.test.ts`:
```ts
// imageUpload.test.ts
expect(validateGalleryCount(10)).toBeNull();
expect(validateGalleryCount(11)).toBeTruthy();
const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', { type: 'image/png' });
expect(resolveGalleryError([{ kind: 'file', file: big }])).toBeTruthy();
expect(buildImageUrls({ kind: 'url', url: 'c' }, [{ kind: 'url', url: 'g1' }])).toEqual(['c', 'g1']);
// categoryFields.test.ts
expect(toCategoryPayloadFromUrls(values, ['c', 'g1']).images).toEqual([{ imageUrl: 'c', sortOrder: 0 }, { imageUrl: 'g1', sortOrder: 1 }]);
expect(toCategoryPayloadFromUrls(values, []).images).toEqual([]);
```
- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/features/categories/imageUpload.test.ts src/features/categories/categoryFields.test.ts`
Expected: FAIL with "function not defined" (or "Cannot find module" / missing export).

- [ ] **Step 3: Implement helpers in `src/features/categories/imageUpload.ts` and payload builder in `src/features/categories/categoryFields.ts`**

Keep `validateImageFile`/`CoverValue` untouched; `toCategoryPayload` stays as single-URL wrapper delegating to the new `toCategoryPayloadFromUrls` to avoid breaking existing callers/tests.
- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/categories/imageUpload.test.ts src/features/categories/categoryFields.test.ts`
Expected: PASS, all tests in both files.
- [ ] **Step 5: Commit**

```bash
git add src/features/categories/imageUpload.ts src/features/categories/categoryFields.ts src/features/categories/imageUpload.test.ts src/features/categories/categoryFields.test.ts
git commit -m "feat: gallery validation and ordered payload helpers"
```

### Task 2: Gallery manager — `GalleryManager.tsx` grid component + styles

**Files:**
- Create: `src/features/categories/GalleryManager.tsx`
- Modify: `src/index.css` (append gallery styles)

**Interfaces:**
- Consumes: `GalleryItem`, `MAX_GALLERY_IMAGES` from Task 1.
- Produces: `<GalleryManager items onChange onPromoteCover error />` where `items: GalleryItem[]`, `onChange: (next: GalleryItem[]) => void`, `onPromoteCover: (index: number) => void`, `error?: string`; item rows expose remove (`Xóa`), move (`←`/`→`), promote (`Đặt làm cover` → calls `onPromoteCover(index)`).

- [ ] **Step 1: Write `GalleryManager.tsx`** — dashed zone (same tokens as `.dropzone`) accepting multi-file drop + hidden `<input type="file" accept="image/*" multiple>` opened by "Tải ảnh từ thiết bị"; "thêm ảnh từ URL" toggles single URL input with "Dùng URL" append; grid previews (`URL.createObjectURL` for files, revoked on remove/change/unmount); each thumb shows name/size or URL plus `Xóa` / `←` / `→` / `Đặt làm cover` buttons; `error` prop renders under the grid; adding beyond `MAX_GALLERY_IMAGES` calls `onChange` with the capped list and surfaces the count message via `error`.
- [ ] **Step 2: Append `.gallery-grid` styles to `src/index.css`** (reuse `#CBD5E1`/`#F8FAFC`/6px radius; thumbs 96px square, `object-fit: cover`).
- [ ] **Step 3: Verify** — Run `npm run build` (pass), `npm run lint` (pass), `npm test` (all pass). Smoke: `npm run dev`, gallery grid renders, drag-active tints, multi-drop previews without network calls.
- [ ] **Step 4: Commit**

```bash
git add src/features/categories/GalleryManager.tsx src/index.css
git commit -m "feat: category gallery manager grid"
```

### Task 3: Wire into `CategoryForm` — gallery state, sequential upload, compensation

**Files:**
- Modify: `src/features/categories/CategoryForm.tsx`

**Interfaces:**
- Consumes: `uploadFile`, `deleteUpload` (existing `uploads.api.ts`); `CoverValue`, `GalleryItem`, `resolveGalleryError`, `buildImageUrls`, `toCategoryPayloadFromUrls` (Tasks 1–2); `<GalleryManager>` (Task 2); `<ImageDropzone>` (existing).
- Produces: nothing downstream (page-level orchestration).

- [ ] **Step 1: Add gallery state** — `const [gallery, setGallery] = useState<GalleryItem[]>([])` + `galleryError`; on edit init from `c.images.slice(1).map((img) => ({kind:'url', url: img.imageUrl}))`; cover init unchanged (`images[0]`); `onPromoteCover(i)` swaps `gallery[i]` URL/file with current `cover` (gallery item becomes cover, old cover appends to gallery at index `i`); `onGalleryChange` clears `galleryError`.
- [ ] **Step 2: Implement the submit sequence in `onSubmit`** — after existing field validation: run `resolveGalleryError(gallery)` (block on message, zero uploads); collect pending `file` items in display order (cover first, then gallery); `await uploadFile` each sequentially (Lưu shows "Đang tải ảnh…", form locked; per-row error aborts); build ordered `urls` (uploaded URLs substituted in place, URL items as-is); submit `toCategoryPayloadFromUrls({...values}, urls)`; on submit throw after ≥1 upload, best-effort `await deleteUpload(key)` for every just-uploaded key (errors swallowed) before surfacing the category error + orphan-keys note exactly like the cover path today.
- [ ] **Step 3: Verify** — Run `npm run build` (pass), `npm run lint` (pass), `npm test` (all pass). Smoke with the backend running: add category with cover + 2 gallery files (creates with 3 ordered R2 URLs), promote gallery → cover swaps, Hủy before submit (devtools shows zero calls), failed submit after upload (compensation DELETEs visible).
- [ ] **Step 4: Commit**

```bash
git add src/features/categories/CategoryForm.tsx
git commit -m "feat: upload category gallery on submit with compensation"
```
