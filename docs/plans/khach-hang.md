# Khách Hàng (Contact Messages) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Khách Hàng" admin tab that lists contact-form messages with search, pagination, detail, status toggle and delete.

**Architecture:** A new `src/features/customers/` feature mirroring `features/news/`: pure helpers + API wrappers with vitest coverage, then `CustomerList` (modelled on `NewsList.tsx`) and `CustomerDetail`, wired into `AdminShell` and `App.tsx`. No new dependencies, no new CSS, no shared component extraction.

**Tech Stack:** React 19, react-router 8, TypeScript, plain CSS classes from `src/index.css`, vitest + `vi.stubGlobal('fetch')` (no jsdom).

**Spec:** `docs/specs/khach-hang.md`

## Global Constraints

- Plain CSS only — this repo has no Tailwind. Reuse `.card`, `.filterbar`, `.grid`, `.badge`, `.badge.warning`, `.badge.success`, `.pager`, `.modal-backdrop`, `.modal`, `.btn`, `.icon-btn`, `.empty`, `.loading`, `.fetch-error`, `.page-head`.
- `apiFetch` unwraps `{ success, message, data }`; `ApiError(message, status)`; 401 already triggers refresh/redirect in `src/lib/api.ts`.
- Tests are vitest, colocated `*.test.ts`, no component rendering (`@testing-library` is not installed). Do not add it.
- Vietnamese UI labels; dates via `toLocaleDateString('vi-VN')` / `toLocaleString('vi-VN')`.
- `verbatimModuleSyntax` — type imports use `import type`; no unused locals/params.
- Gates: `npm test`, `npm run lint`, `npm run build` (the build is the typecheck).

## Review Focus

- Deleting the last row on the last page must clamp to the previous page, not leave an empty table (Task 2 pager logic).
- A search containing only spaces must send no `q` parameter (Task 1 `buildListQuery` test).
- The status toggle must be visible after the refetch, not just locally (Task 3 refetches the row).
- Opening `/customer-contact/<unknown-id>` must show the 404 state, not a crash or a blank page (Task 3 `isNotFoundError` branch).
- A long message must keep its line breaks and not widen the page (Task 3 `whiteSpace: 'pre-wrap'` inside `.card`).

---

### Task 1: Types, API wrappers and pure helpers

**Files:**
- Modify: `src/lib/types.ts` (append `CustomerContact`)
- Create: `src/features/customers/customer.api.ts`
- Create: `src/features/customers/customerFields.ts`
- Test: `src/features/customers/customerFields.test.ts`
- Test: `src/features/customers/customer.api.test.ts`

**Interfaces:**
- Produces:
  - `CustomerContact { id, name, email, address, phone, message, processed, createdAt }`
  - `ContactQuery { page: number; size: number; q?: string; processed?: boolean }` (declared in `customerFields.ts`; `customer.api.ts` imports it, so there is no import cycle)
  - `listContacts(query: ContactQuery): Promise<PageResult<CustomerContact>>`
  - `getContact(id: string): Promise<CustomerContact>`
  - `setProcessed(id: string, processed: boolean): Promise<CustomerContact>`
  - `deleteContact(id: string): Promise<void>`
  - `StatusFilter = '' | 'new' | 'done'`
  - `toProcessed(filter: StatusFilter): boolean | undefined`
  - `statusOf(contact: CustomerContact): { label: string; className: string }`
  - `buildListQuery(query: ContactQuery): string`

- [ ] **Step 1: Write the failing helper test.**

```ts
import { describe, expect, it } from 'vitest'
import type { CustomerContact } from '../../lib/types'
import { buildListQuery, statusOf, toProcessed } from './customerFields'

const contact = (processed: boolean): CustomerContact => ({
  id: 'id-1',
  name: 'Nguyễn Văn A',
  email: 'a@example.com',
  address: null,
  phone: '0901',
  message: null,
  processed,
  createdAt: '2026-10-27T15:00:00Z',
})

describe('buildListQuery', () => {
  it('omits blank q and undefined processed', () => {
    expect(buildListQuery({ page: 0, size: 20, q: '   ' })).toBe('page=0&size=20')
  })

  it('trims q and serialises the tri-state filter', () => {
    expect(buildListQuery({ page: 2, size: 10, q: ' 0901 ', processed: false }))
      .toBe('page=2&size=10&q=0901&processed=false')
    expect(buildListQuery({ page: 0, size: 20, processed: true }))
      .toBe('page=0&size=20&processed=true')
  })
})

describe('toProcessed', () => {
  it('maps the three tabs', () => {
    expect(toProcessed('')).toBeUndefined()
    expect(toProcessed('new')).toBe(false)
    expect(toProcessed('done')).toBe(true)
  })
})

describe('statusOf', () => {
  it('labels and classes both states', () => {
    expect(statusOf(contact(false))).toEqual({ label: 'Mới', className: 'badge warning' })
    expect(statusOf(contact(true))).toEqual({ label: 'Đã xử lý', className: 'badge success' })
  })
})
```

- [ ] **Step 2: Run it to verify it fails.**

Run: `npm test -- customerFields`
Expected: FAIL — `./customerFields` has no exported members.

- [ ] **Step 3: Add the type and the helpers.**

Append `CustomerContact` to `src/lib/types.ts` exactly as the spec's response fields. Create `customerFields.ts` with `ContactQuery`, `StatusFilter`, `toProcessed` (switch: `''` → `undefined`, `'new'` → `false`, `'done'` → `true`), `statusOf` (returns `badge warning`/`Mới` or `badge success`/`Đã xử lý`), and `buildListQuery` using `URLSearchParams` with `page`/`size`, adding trimmed `q` only when non-empty and `processed` only when not `undefined`.

- [ ] **Step 4: Run it to verify it passes.**

Run: `npm test -- customerFields`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing API test.**

Use the same fetch/storage stub pattern as `src/lib/api.test.ts` (in-memory `Storage` assigned to `globalThis.localStorage`, a `jsonResponse` helper, `afterEach(() => vi.unstubAllGlobals())`):

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { deleteContact, getContact, listContacts, setProcessed } from './customer.api'
import type { CustomerContact } from '../../lib/types'

const contact: CustomerContact = {
  id: 'abc', name: 'Nguyễn Văn A', email: 'a@example.com', address: null,
  phone: '0901', message: null, processed: false, createdAt: '2026-10-27T15:00:00Z',
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => { /* install the in-memory Storage stub from api.test.ts */ })
afterEach(() => vi.unstubAllGlobals())

describe('customer api', () => {
  it('lists with the built query and unwraps the page', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      success: true, message: 'OK',
      data: { content: [contact], totalElements: 1, number: 0, size: 20 },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await listContacts({ page: 0, size: 20, processed: false })

    expect(fetchMock.mock.calls[0]![0]).toContain('/api/customer-contacts?page=0&size=20&processed=false')
    expect(result.total).toBe(1)
    expect(result.items[0]!.name).toBe('Nguyễn Văn A')
  })

  it('sends PUT processed and DELETE by id', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'OK', data: { ...contact, processed: true } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    expect((await setProcessed('abc', true)).processed).toBe(true)
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: 'PUT', body: '{"processed":true}' })
    await expect(deleteContact('abc')).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'DELETE' })
  })

  it('propagates ApiError with the backend message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ success: false, message: 'Contact message not found: abc', data: null }, 404),
    ))

    await expect(getContact('abc')).rejects.toMatchObject({ status: 404, message: 'Contact message not found: abc' })
  })
})
```

- [ ] **Step 6: Run it to verify it fails.**

Run: `npm test -- customer.api`
Expected: FAIL — `customer.api.ts` does not exist.

- [ ] **Step 7: Implement `customer.api.ts`.**

`ContactQuery` is imported from `customerFields.ts`; `listContacts` calls `apiFetch<SpringPage<CustomerContact>>(`/api/customer-contacts?${buildListQuery(query)}`)` and returns `unwrapPage(...)`; `getContact` GET; `setProcessed` PUT with `JSON.stringify({ processed })`; `deleteContact` DELETE. Use `import type` for the types.

- [ ] **Step 8: Run the full test suite.**

Run: `npm test`
Expected: PASS (existing 76 + new tests).

- [ ] **Step 9: Commit.**

```bash
git add src/lib/types.ts src/features/customers/customerFields.ts \
        src/features/customers/customer.api.ts \
        src/features/customers/customerFields.test.ts \
        src/features/customers/customer.api.test.ts
git commit -m "feat: add contact message API client and list helpers"
```

---

### Task 2: `CustomerList` screen, routes and sidebar tab

**Files:**
- Create: `src/features/customers/CustomerList.tsx`
- Modify: `src/App.tsx` (lazy import + two routes)
- Modify: `src/components/AdminShell.tsx` (nav item, `TITLES`, `titleFor`)

**Interfaces:**
- Consumes: `listContacts`, `deleteContact` (Task 1), `CustomerContact`, `StatusFilter`, `toProcessed`, `statusOf`.
- Produces: `/customer-contact` route rendering `CustomerList`; sidebar tab "Khách Hàng"; topbar title for both routes.

- [ ] **Step 1: Create `CustomerList.tsx` modelled on `src/features/news/NewsList.tsx`.**

Same structure: `page`/`size` (`SIZES = [10, 20, 50]`), `items`/`total`/`loading`/`error`/`nonce`, `useEffect` with the `cancelled` flag, `lastPage` clamp, `fetch-error` + "Thử lại", `.empty` text `Không có tin nhắn nào`, `.pager` markup, inline `.modal-backdrop` confirm. Differences:

- Heading: `<h1>Tin nhắn liên hệ</h1>` (no "+ Thêm" button).
- Filter bar: status tabs `Tất cả` / `Mới` / `Đã xử lý` using `StatusFilter` + `toProcessed`, and a search `<form onSubmit={...}>` whose handler calls `event.preventDefault()`, with `<input placeholder="Tìm theo tên, email, số điện thoại" />` + `Tìm` submit button. Submit trims and resets `page` to 0; clearing the input and submitting sends no `q`.
- Table columns: Tên, Điện thoại, Email, Ngày gửi (`toLocaleDateString('vi-VN')`), Trạng thái (`statusOf` badge), Thao tác. No checkbox/bulk bar.
- Row actions: `Xem` (`.icon-btn`, `title="Xem chi tiết"`, navigate to `/customer-contact/${c.id}`) and delete (`.icon-btn danger`, opens confirm for that row).
- Delete confirm copy: `Xóa tin nhắn của {name}? Hành động này không thể hoàn tác.` On success refetch the current page; if `page > 0` and the refetch returns an empty page, step back one page (same clamp rule as the load effect).

- [ ] **Step 2: Wire the routes.**

In `src/App.tsx`: `const CustomerList = lazy(() => import('./features/customers/CustomerList.tsx'))` and
`{ path: 'khach-hang', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><CustomerList /></Suspense> }`.
(`CustomerDetail` route is added in Task 3.)

- [ ] **Step 3: Add the sidebar tab and title.**

In `AdminShell.tsx`: `<NavLink to="/customer-contact">Khách Hàng</NavLink>` after Trang chủ; `'/customer-contact': 'Khách Hàng'` in `TITLES`; `if (pathname.startsWith('/customer-contact')) return 'Khách Hàng'` in `titleFor`.

- [ ] **Step 4: Verify build + lint.**

Run: `npm run build; if ($?) { npm run lint }`
Expected: both exit 0.

- [ ] **Step 5: Commit.**

```bash
git add src/features/customers/CustomerList.tsx src/App.tsx src/components/AdminShell.tsx
git commit -m "feat: add the Khach Hang contact message list"
```

---

### Task 3: `CustomerDetail` screen

**Files:**
- Create: `src/features/customers/CustomerDetail.tsx`
- Modify: `src/App.tsx` (lazy import + `khach-hang/:id` route)

**Interfaces:**
- Consumes: `getContact`, `setProcessed`, `deleteContact` (Task 1), `statusOf`.
- Produces: `/customer-contact/:id` route.

- [ ] **Step 1: Create `CustomerDetail.tsx`.**

Use `useParams()`; load with `getContact(id)` in a `useEffect` (`cancelled` flag); states `Đang tải…`, `fetch-error` + retry, and `isNotFoundError(error)` from `src/lib/formErrors.ts` → `.empty` `Không tìm thấy tin nhắn` with a back link. Content inside `.card`:

- Back link `<Link to="/customer-contact">← Danh sách</Link>`.
- Status badge from `statusOf`, plus `Ngày gửi` (`toLocaleString('vi-VN')`).
- Fields: Tên, Email, Điện thoại, Địa chỉ (`—` when null) using the existing `.field` layout.
- Message body in a bordered block with `style={{ whiteSpace: 'pre-wrap' }}`, `—` when null.
- Actions: `.btn btn-primary` toggling `setProcessed(id, !processed)` then replacing state with the returned row; `.btn btn-danger` opening the confirm modal, then `deleteContact(id)` and `navigate('/customer-contact')`.
- Errors from the toggle/delete render in `.fetch-error` above the actions.

- [ ] **Step 2: Add the route.**

`const CustomerDetail = lazy(() => import('./features/customers/CustomerDetail.tsx'))` and
`{ path: 'khach-hang/:id', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><CustomerDetail /></Suspense> }`.

- [ ] **Step 3: Verify build + lint.**

Run: `npm run build; if ($?) { npm run lint }`
Expected: both exit 0.

- [ ] **Step 4: Commit.**

```bash
git add src/features/customers/CustomerDetail.tsx src/App.tsx
git commit -m "feat: add the contact message detail screen"
```

---

### Task 4: Gates and manual verification

**Files:**
- Modify: `docs/specs/khach-hang.md` (only if behaviour changed)

**Interfaces:**
- Consumes: all tasks.
- Produces: verified feature.

- [x] **Step 1: Run the gates.**

Run: `npm test; if ($?) { npm run lint }; if ($?) { npm run build }`
Expected: all exit 0.

- [x] **Step 2: Manual check against the API.**

Start the API (dev, port 8080) and the admin (`npm run dev`), log in with the usual admin account. If the list is empty, seed two rows in the dev database:

```sql
INSERT INTO customer_contact_info (id,name,email,address,phone,message,processed,created_at,updated_at)
VALUES (UUID_TO_BIN(UUID()),'Nguyễn Văn A','a@example.com','Thanh Hóa','0901234567','Tôi cần tư vấn.\nMáy đo đạc.',FALSE,NOW(6),NOW(6)),
       (UUID_TO_BIN(UUID()),'Trần Thị B','b@example.com',NULL,'0912345678','Báo giá giúp tôi.',TRUE,NOW(6),NOW(6));
```

Check: tab "Khách Hàng" appears and is active on both routes; list shows both rows with Mới/Đã xử lý badges; search `nguyễn` returns one row; tabs filter; detail shows the message with its line break; toggle flips the badge after refetch; delete asks for confirmation, removes the row, and the pager stays valid; `/customer-contact/<random-uuid>` shows the not-found state.

- [x] **Step 3: Update the spec if behaviour changed** (final step; compare with `docs/specs/khach-hang.md`).

- [x] **Step 4: Commit.**

```bash
git add docs/specs/khach-hang.md
git commit -m "docs: update the Khach Hang spec after implementation"
```

---

# Follow-up: Search always shows results

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking `Tìm` on `/customer-contact` always re-runs the query and renders a result, and an empty result says whether a search matched nothing.

**Architecture:** Keep the existing `nonce`-driven refetch in `CustomerList`; user-initiated refresh actions bump `nonce` so the effect runs even when `q`, `page` and `status` are unchanged. Move the empty-state copy into a pure helper in `customerFields.ts` so it is covered by the existing vitest setup (no jsdom).

**Tech Stack:** React 19, TypeScript, plain CSS, vitest + `vi.stubGlobal` (no component rendering).

**Spec:** `docs/specs/khach-hang.md` (Screen behaviour → List → Search)

## Global Constraints

- No new dependencies, no jsdom, no CSS changes.
- Plain CSS classes only; reuse `.empty`, `.loading`, `.fetch-error`.
- `verbatimModuleSyntax` — `import type` for types; no unused locals.
- Gates: `npm test`, `npm run lint`, `npm run build`.

## Review Focus

- Submitting the same keyword twice while on page 0 must refetch, not freeze on `Đang tải…`.
- Re-clicking the already-active status tab must not freeze the table.
- Clearing the search box and submitting must return the unfiltered list.
- A search with no matches must say `Không tìm thấy tin nhắn phù hợp với “{q}”`, not `Không có tin nhắn nào`.
- Whitespace-only input must behave like an empty search (no `q` sent, generic empty copy).

---

### Task 5: Empty-state helper and nonce-driven refetch

**Files:**
- Modify: `src/features/customers/customerFields.ts`
- Modify: `src/features/customers/CustomerList.tsx`
- Test: `src/features/customers/customerFields.test.ts`

**Interfaces:**
- Consumes: `buildListQuery`, `ContactQuery`, existing `nonce` state and refetch effect in `CustomerList.tsx`.
- Produces: `emptyListMessage(q: string): string` exported from `customerFields.ts`.

- [x] **Step 1: Write the failing test.**

Add `emptyListMessage` to the existing `./customerFields` import at the top of `src/features/customers/customerFields.test.ts`, then append:

```ts
describe('emptyListMessage', () => {
  it('uses the generic copy when no search is applied', () => {
    expect(emptyListMessage('')).toBe('Không có tin nhắn nào')
    expect(emptyListMessage('   ')).toBe('Không có tin nhắn nào')
  })

  it('names the searched term when a search matched nothing', () => {
    expect(emptyListMessage(' 0901 ')).toBe('Không tìm thấy tin nhắn phù hợp với “0901”')
  })
})
```

- [x] **Step 2: Run it to verify it fails.**

Run: `npm test -- customerFields`
Expected: FAIL — `emptyListMessage` is not exported.

- [x] **Step 3: Implement `emptyListMessage` in `src/features/customers/customerFields.ts`.**

Signature `export function emptyListMessage(q: string): string`. Trim `q`; when empty return `Không có tin nhắn nào`; otherwise return `Không tìm thấy tin nhắn phù hợp với “{trimmed}”` (curly quotes exactly as in the spec).

- [x] **Step 4: Run it to verify it passes.**

Run: `npm test -- customerFields`
Expected: PASS.

- [x] **Step 5: Bump `nonce` for every user-initiated refresh in `CustomerList.tsx`.**

- `onSearch`: after `setQ(search.trim())` and `setPage(0)`, add `setNonce((n) => n + 1)`. Keep `setLoading(true)`.
- Status-tab `onClick`: after `setStatus(t.key)` and `setPage(0)`, add `setNonce((n) => n + 1)`. Keep `setLoading(true)`.
- Leave the pager and size handlers as they are (their controls already guard against no-op changes).

- [x] **Step 6: Use the helper for the empty state.**

Import `emptyListMessage` from `./customerFields` and replace the hardcoded `<div className="empty">Không có tin nhắn nào</div>` with `<div className="empty">{emptyListMessage(q)}</div>`.

- [x] **Step 7: Run the gates.**

Run: `npm test; if ($?) { npm run lint }; if ($?) { npm run build }`
Expected: all exit 0.

- [ ] **Step 8: Manual check against the API.**

Start the API and `npm run dev`, open `/customer-contact`:
type a term, click `Tìm` twice → table reloads both times, never stuck on `Đang tải…`; click the active `Tất cả` tab → table reloads; search a nonsense term → `Không tìm thấy tin nhắn phù hợp với “…”`; clear the box, click `Tìm` → full list returns.

- [x] **Step 9: Update the spec if behaviour changed** (final step; `docs/specs/khach-hang.md` already records this behaviour — adjust only if the implementation differs).

- [x] **Step 10: Commit.**

```bash
git add src/features/customers/customerFields.ts src/features/customers/customerFields.test.ts \
        src/features/customers/CustomerList.tsx docs/specs/khach-hang.md docs/plans/khach-hang.md
git commit -m "fix: always refetch contact list when searching"
```
