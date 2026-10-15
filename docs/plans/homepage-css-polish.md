# Homepage CSS Polish Plan

**Goal:** Align `/homepage` spacing with Category/Product pages. CSS/classes only, no behavior or API change.

**Spec:** `docs/specs/homepage.md` §6.

## Constraints

- Single global `src/index.css`, prefixed `homepage-*` / `preview-*` classes only.
- `import type` for types, no unused locals (build will fail otherwise).
- Verify with `npm run build` + manual dropdown -> edit -> preview -> reload.

## Tasks

### Task 1: Header + selector

**Files:**
- Modify: `src/index.css`, `src/features/homepage/HomepagePage.tsx`

- [ ] **Step 1:** Add `.homepage-head` (group counter + button right) and `.homepage-counter` badge style; constrain `.filterbar select` width.
- [ ] **Step 2:** Update `HomepagePage.tsx` header to use badge + action group, no inline layout.
- [ ] **Step 3:** Run `npm run build`. Expected: PASS; manual: counter aligned right with button on desktop + mobile.

### Task 2: Editors + preview

**Files:**
- Modify: `src/index.css`, `src/features/homepage/ImageSectionEditor.tsx`, `src/features/homepage/EntitySectionEditor.tsx`, `src/features/homepage/HomepagePreview.tsx`

- [ ] **Step 1:** Add `.homepage-add`, `.preview-modal`, `.preview-section`, `.preview-grid` classes; remove inline `marginTop` / `maxWidth` / flex styles from the three components.
- [ ] **Step 2:** Run `npm run build` + `npm run lint`. Expected: PASS; manual: tables, add-forms, preview match list-page spacing.
