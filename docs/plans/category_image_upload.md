# Category Cover Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the category form's URL-only image input with a dropzone that uploads device files to R2 on submit.

**Architecture:** New `uploads.api.ts` posts multipart `FormData` (JSON `apiFetch` cannot carry files, so a small `apiForm` helper joins it); a `ImageDropzone` component owns preview + validation display; `CategoryForm` orchestrates upload → submit → compensating delete. No R2 credentials ever touch the frontend.

**Tech Stack:** React 19, existing `apiFetch` envelope, no new dependencies (native drag-drop + file input).

**Spec:** `docs/specs/category.md` §4 (admin side). Backend contract precondition below.

## Precondition (NOT this plan)

`POST /api/uploads` (multipart `file` → `201` + `{key, url}`) and
`DELETE /api/uploads/{key}` (`204`) must exist in
`trac-dia-thien-phu-api` first — that repo's `docs/specs/image.md`
currently forbids upload endpoints, so it needs its own spec → plan →
implement cycle. All tasks below mock `fetch` and never need a running
backend.

## Global Constraints

- `npm run build` must pass (`noUnusedLocals`, `verbatimModuleSyntax` — `import type` for types; no enums).
- `npm run lint` must pass — only components exported from component files.
- No test runner gap: `npm test` (`vitest run`) exists; pure logic gets RED→GREEN tests, components get build + lint + dev smoke.
- Single cover slot: device file and URL replace each other, never coexist.
- UI labels in Vietnamese as in the spec.

## Review Focus

- Oversize (>5MB) or non-image file → submit blocked with a per-file error, zero network calls (pinned by Task 2's `validateImageFile` tests).
- Upload endpoint returns 413/500 → error shows on the file row and category submit never fires (Task 3 wiring; reviewer checks the code path).
- Category submit fails after a successful upload → compensation `DELETE` fires for the just-uploaded key (Task 3 wiring; reviewer checks).
- Hủy or navigation before submit → zero network calls by construction (nothing uploads before Lưu).
- Replacing/removing an already-saved cover on edit orphans the old R2 object (deliberate v1 limitation — deleting by URL could hit objects shared elsewhere; manual cleanup).

---

## File structure

- `src/lib/api.ts` — add `apiForm<T>(path: string, form: FormData): Promise<T>` (same envelope unwrap as `apiFetch`, but no JSON `Content-Type`; the browser sets the multipart boundary).
- `src/features/categories/uploads.api.ts` — `uploadFile(file: File): Promise<{key: string; url: string}>` (`POST /api/uploads`, field name `file`); `deleteUpload(key: string): Promise<void>` (`DELETE /api/uploads/${encodeURIComponent(key)}`).
- `src/features/categories/imageUpload.ts` — `MAX_IMAGE_BYTES = 5 * 1024 * 1024`; `validateImageFile(file: File): string | null` (Vietnamese message or null); `CoverValue = { kind: 'file'; file: File } | { kind: 'url'; url: string } | null`.
- `src/features/categories/ImageDropzone.tsx` — props `{ value: CoverValue; onChange: (v: CoverValue) => void; error?: string }`; dashed zone, drag-active state, hidden device file input, URL toggle input, local preview (`URL.createObjectURL`, revoked on change/unmount), per-file error display.
- `src/features/categories/CategoryForm.tsx` — replace `imageUrl` string state with `CoverValue`; submit uploads first, then submits, then compensates.
- `src/features/categories/categoryFields.ts` — `CategoryFormValues.imageUrl` becomes informational only (kept for the URL branch, still validated as before); no signature changes to `validateCategory`/`toCategoryPayload` except reading the resolved URL.
- `src/index.css` — `.dropzone` + `.dropzone.active` styles per DESIGN.md tokens.

### Task 1: Upload client — `apiForm`, `uploadFile`, `deleteUpload`

**Files:**
- Modify: `src/lib/api.ts`
- Create: `src/features/categories/uploads.api.ts`, `src/features/categories/uploads.api.test.ts`

**Interfaces:**
- Consumes: `ApiError`, envelope shape from `src/lib/api.ts`.
- Produces: `apiForm<T>(path: string, form: FormData) => Promise<T>`; `uploadFile(file: File) => Promise<{key: string; url: string}>`; `deleteUpload(key: string) => Promise<void>`.

- [ ] **Step 1: Write the failing tests** in `src/features/categories/uploads.api.test.ts`:
```ts
it('posts the file as multipart form data', async () => {
  // stub fetch returning {success: true, message: 'OK', data: {key: 'k', url: 'u'}}
  const res = await uploadFile(new File(['x'], 'a.png', { type: 'image/png' }))
  expect(res).toEqual({ key: 'k', url: 'u' })
  // assert fetch called with method POST, url ending /api/uploads,
  // body instanceof FormData, and NO Content-Type header set by us
});
it('deletes by encoded key', async () => {
  await deleteUpload('a/b');
  // assert fetch called with method DELETE and url ending /api/uploads/a%2Fb
});
```
- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/features/categories/uploads.api.test.ts`
Expected: FAIL with "function not defined" (or "Cannot find module").

- [ ] **Step 3: Implement `apiForm` in `src/lib/api.ts` and `uploadFile`/`deleteUpload` in `src/features/categories/uploads.api.ts`**

`apiForm` mirrors `apiFetch` (same base URL, same `ApiError` rules) minus the JSON header.
- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/categories/uploads.api.test.ts`
Expected: PASS, all tests in file.
- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts src/features/categories/uploads.api.ts src/features/categories/uploads.api.test.ts
git commit -m "feat: R2 upload client for category cover"
```

### Task 2: Dropzone — validation helper + `ImageDropzone` component

**Files:**
- Create: `src/features/categories/imageUpload.ts`, `src/features/categories/imageUpload.test.ts`, `src/features/categories/ImageDropzone.tsx`
- Modify: `src/index.css` (append `.dropzone` styles)

**Interfaces:**
- Consumes: nothing.
- Produces: `MAX_IMAGE_BYTES`; `validateImageFile(file: File) => string | null`; `CoverValue`; `<ImageDropzone value onChange error />`.

- [ ] **Step 1: Write the failing tests** in `src/features/categories/imageUpload.test.ts`:
```ts
expect(validateImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
expect(validateImageFile(new File(['x'], 'a.txt', { type: 'text/plain' }))).toBeTruthy();
expect(validateImageFile(new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', { type: 'image/png' }))).toBeTruthy();
```
- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/features/categories/imageUpload.test.ts`
Expected: FAIL with "Cannot find module './imageUpload'".

- [ ] **Step 3: Implement `validateImageFile` + `CoverValue` in `src/features/categories/imageUpload.ts`**

Reject when `file.type` does not start with `image/`; reject when `file.size > MAX_IMAGE_BYTES` (`5 * 1024 * 1024`); messages in Vietnamese.
- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/categories/imageUpload.test.ts`
Expected: PASS.
- [ ] **Step 5: Write `ImageDropzone.tsx`** — dashed zone with the spec's idle text; `dragOver`/`dragLeave`/`drop` handlers with active class; hidden `<input type="file" accept="image/*">` opened by "Tải ảnh từ thiết bị"; "thêm ảnh từ URL" toggles a URL input; preview via `URL.createObjectURL` revoked on change/unmount; remove button calls `onChange(null)`; `error` prop renders under the zone. Device file and URL replace each other.
- [ ] **Step 6: Append `.dropzone` styles to `src/index.css`** (dashed `#CBD5E1`, `#F8FAFC`, 6px radius; `.active` tints `#0088FF`/`#E5F3FF`).
- [ ] **Step 7: Verify** — Run `npm run build` (pass), `npm run lint` (pass), `npm test` (all pass). Smoke: `npm run dev`, open `/categories/new`, dropzone renders, drag-active tints, oversize file shows the per-file error with no network call in devtools.
- [ ] **Step 8: Commit**

```bash
git add src/features/categories/imageUpload.ts src/features/categories/imageUpload.test.ts src/features/categories/ImageDropzone.tsx src/index.css
git commit -m "feat: category cover dropzone with validation"
```

### Task 3: Wire into `CategoryForm` — upload → submit → compensate

**Files:**
- Modify: `src/features/categories/CategoryForm.tsx`, `src/features/categories/categoryFields.ts` (only if the `imageUrl` field handling needs it — prefer no change)

**Interfaces:**
- Consumes: `uploadFile`, `deleteUpload` from Task 1; `validateImageFile`, `CoverValue` from Task 2; `toCategoryPayload(values)` unchanged — pass `{ ...values, imageUrl: resolvedUrl }` where `resolvedUrl` is the uploaded URL, the typed URL, or `''`.
- Produces: nothing downstream.

- [ ] **Step 1: Replace the cover-image card** — swap the URL-only `field('imageUrl', …)` for `<ImageDropzone>` bound to a new `cover: CoverValue` state (initialized from the loaded category's first image as `{kind:'url'}`, or `{kind:'url', url}` from a typed URL — device selection yields `{kind:'file'}`).
- [ ] **Step 2: Implement the submit sequence in `onSubmit`** — after existing field validation: if `cover.kind === 'file'`, first `validateImageFile` (block on message), then `await uploadFile` (Lưu shows progress, form locked; upload error lands on the dropzone `error` and aborts); submit `toCategoryPayload` with the resolved URL; if submit throws after an upload, best-effort `await deleteUpload(key)` (errors swallowed) before surfacing the category error exactly as today.
- [ ] **Step 3: Verify** — Run `npm run build` (pass), `npm run lint` (pass), `npm test` (all pass). Smoke with the backend running: add category with device file (creates with R2 URL), Hủy before submit (devtools shows zero calls), failed submit after upload (compensation DELETE visible in devtools).
- [ ] **Step 4: Commit**

```bash
git add src/features/categories/CategoryForm.tsx src/features/categories/categoryFields.ts
git commit -m "feat: upload category cover on submit with compensation"
```
