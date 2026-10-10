# Shared Modules Move Implementation Plan

> Move-only refactor: relocate shared code out of feature folders into
> existing shared homes. Zero behavior change — no logic edits, only
> file moves + import path fixes.

**Goal:** End all sideways `features/* → features/*` imports:
`ProductForm` pulls 5 image modules from `../categories/`;
`CategoryForm` pulls `formErrorForApi`/`isNotFoundError` from
`../products/productFields`.

**Spec:** none (no behavior or contract changes; `product.md` and
`category.md` describe behavior, not file locations).

## Moves (`git mv`, history preserved)

| From | To | Reason |
|---|---|---|
| `src/features/categories/ImageDropzone.tsx` | `src/components/ImageDropzone.tsx` | shared UI, next to `RichText.tsx` |
| `src/features/categories/GalleryManager.tsx` | `src/components/GalleryManager.tsx` | shared UI |
| `src/features/categories/imageUpload.ts` | `src/lib/imageUpload.ts` | shared logic, next to `api.ts` |
| `src/features/categories/imageUpload.test.ts` | `src/lib/imageUpload.test.ts` | moves with its module |
| `src/features/categories/uploads.api.ts` | `src/lib/uploads.api.ts` | shared logic |
| `src/features/categories/uploads.api.test.ts` | `src/lib/uploads.api.test.ts` | moves with its module |
| `FormApiError`, `isNotFoundError`, `formErrorForApi` (productFields.ts:90-104) | new `src/lib/formErrors.ts` | generic envelope logic, used by both forms |

## Import fixes (only lines that name a moved module)

- `src/features/products/ProductForm.tsx:7-11` → `../../components/ImageDropzone.tsx`, `../../components/GalleryManager.tsx`, `../../lib/imageUpload`, `../../lib/uploads.api`.
- `src/features/categories/CategoryForm.tsx:5,9-13` → `formErrorForApi, isNotFoundError` from `../../lib/formErrors`; image modules from `../../components/…`, `../../lib/…`.
- `src/components/GalleryManager.tsx`, `src/components/ImageDropzone.tsx` internal `./imageUpload` → `../lib/imageUpload`.
- Moved tests: `./uploads.api` → `./uploads.api` (unchanged, moved together); check `productFields.test.ts` — if it covers `formErrorForApi`/`isNotFoundError`, move those cases to new `src/lib/formErrors.test.ts`, else no test changes.
- `productFields.ts` keeps product-only helpers (`validateProduct`, `toProductPayload`, …); `categoryFields.ts` untouched.

## Out of scope

- Extracting the duplicated upload → submit → compensate flow (explicitly deferred by user decision).
- Any logic, copy, or styling change.

## Verification

- `npm run build` (pass — `verbatimModuleSyntax`/`noUnusedLocals` catch bad moves).
- `npm run lint` (pass).
- `npm test` (all pass, same count as before — proves zero behavior change).
- `grep` for `from '\.\./(categories|products)'` under `src/features/` → zero hits (proves the goal).

## Commits

1. `refactor: move shared image modules to components and lib` (moves + import fixes + formErrors extract).
