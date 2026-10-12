# Account CRUD UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the accounts list + create/edit pages to the admin UI, bound to `GET/POST/PUT/DELETE /api/accounts`.

**Architecture:** Mirror the Category module exactly: `accounts.api.ts` endpoint calls over the bearer `apiFetch` (auth plan), `AccountList` modeled on `CategoryList` minus bulk/images/pager, `AccountForm` modeled on `CategoryForm` minus images/rich-text, `accountFields.ts` validation + payload mapping with tests. No new dependencies.

**Tech Stack:** React 19, `react-router` (existing), hand-rolled forms (existing convention), `vitest` (existing, `npm test`).

**Spec:** `docs/specs/account.md` — the plan argues from the spec; executors read both.

**Requires:** the `docs/plans/auth_pages.md` plan implemented first (bearer transport, guard, session, logout). This plan adds the account routes + pages + the `Tài khoản` shell entry.

## Global Constraints

- `npm run build` (`tsc -b && vite build`) must pass — `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `moduleDetection: force` are on: no unused vars, no enums (`roleType: 'ADMIN' | 'USER'` union), `import type` for types.
- `npm run lint` must pass — only components exported from component files.
- `npm test` (`vitest run`) must pass for touched suites.
- Form fields map 1:1 to backend DTOs — `username`, `email`, `password`, `roleType`. Never invent fields.
- UI labels in Vietnamese as written in this plan; spec/plan in English.
- No new dependencies.
- Backend contract (verified in `trac-dia-thien-phu-api`): `AccountResponse {id, username, email, roleType: 'ADMIN'|'USER', createdAt, updatedAt}` (no password field, ever); `CreateAccountRequest/UpdateAccountRequest {username, password, roleType, email}` with `password` required on BOTH create and edit (min 8), `email` valid format; duplicates → 409 (`username already exists…` / `email already exists…`).

## Review Focus

- Direct URL to unknown `/accounts/:id` must show not-found, not a stuck spinner. → Task 3 `isNotFoundError` branch.
- Duplicate email (`409`) must land on the email field, duplicate username on the username field — never swapped, never a generic toast. → Task 3 message-sniffing mapping + test below (field-level mapping is UI code; pin the pure mapper in `accountFields.test.ts`).
- Blank password on edit must block client-side with zero network calls (password is write-only; edit never prefills it). → Task 1 validation test + Task 3 submit guard.
- Zero accounts must render an empty state, not a blank table. → Task 2 empty-list check.
- Malformed email must fail client-side with zero network calls. → Task 1 email-format test.

---

### Task 1: Types + API client + fields (red → green)

**Files:**
- Modify: `src/lib/types.ts` (add `Account`, `RoleName` lives in auth plan — if auth plan ran, reuse its `RoleName`; else define `roleType: 'ADMIN' | 'USER'` inline. Check first: grep `RoleName` in `src/lib/types.ts`; reuse when present, never duplicate.)
- Create: `src/features/accounts/accounts.api.ts`
- Create: `src/features/accounts/accountFields.ts`
- Test: `src/features/accounts/accountFields.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from `src/lib/api` (bearer + 401 handling from the auth plan — this task needs no auth logic of its own).
- Produces: `interface Account { id: string; username: string; email: string; roleType: 'ADMIN' | 'USER'; createdAt: string; updatedAt: string }`; `listAccounts(): Promise<Account[]>`; `getAccount(id): Promise<Account>`; `createAccount(payload): Promise<Account>`; `updateAccount(id, payload): Promise<Account>`; `deleteAccount(id): Promise<void>`; `interface AccountFormValues { username: string; email: string; password: string; role: '' | 'ADMIN' | 'USER' }`; `validateAccount(v): Record<string, string>`; `toAccountPayload(v): AccountPayload`; `interface AccountPayload { username: string; email: string; password: string; roleType: 'ADMIN' | 'USER' }`; `fieldForConflict(message: string): 'username' | 'email' | null` (pure mapper for 409 placement — Review Focus #2 pinned here).

- [ ] **Step 1: Write the failing test** — Create `src/features/accounts/accountFields.test.ts` mirroring `categoryFields.test.ts` shape:

```ts
import { describe, expect, it } from 'vitest'
import { fieldForConflict, toAccountPayload, validateAccount } from './accountFields'

const valid = {
  username: 'alice',
  email: 'alice@example.com',
  password: 'secret123',
  role: 'ADMIN' as const,
}

describe('validateAccount', () => {
  it('accepts a valid form', () => {
    expect(validateAccount(valid)).toEqual({})
  })

  it('rejects blanks, malformed email, and short password', () => {
    expect(validateAccount({ ...valid, username: '  ' }).username).toBeTruthy()
    expect(validateAccount({ ...valid, email: 'not-an-email' }).email).toBeTruthy()
    expect(validateAccount({ ...valid, password: 'short' }).password).toBeTruthy()
    expect(validateAccount({ ...valid, role: '' }).role).toBeTruthy()
  })

  it('rejects fields longer than 256 characters', () => {
    expect(validateAccount({ ...valid, username: 'x'.repeat(257) }).username).toBeTruthy()
  })
})

describe('toAccountPayload', () => {
  it('trims text fields and passes the role through', () => {
    expect(toAccountPayload({ ...valid, username: '  alice  ' })).toEqual({
      username: 'alice',
      email: 'alice@example.com',
      password: 'secret123',
      roleType: 'ADMIN',
    })
  })
})

describe('fieldForConflict', () => {
  it('routes username conflicts to the username field', () => {
    expect(fieldForConflict('username already exists: alice')).toBe('username')
  })

  it('routes email conflicts to the email field', () => {
    expect(fieldForConflict('email already exists: alice@example.com')).toBe('email')
  })

  it('returns null for anything else (form-level message)', () => {
    expect(fieldForConflict('account already exists')).toBeNull()
    expect(fieldForConflict('')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/accounts/accountFields.test.ts`
Expected: FAIL with "Failed to resolve import ./accountFields" (file does not exist yet).

- [ ] **Step 3: Implement types + api + fields**

`src/lib/types.ts` — append:

```ts
export interface Account {
  id: string
  username: string
  email: string
  roleType: 'ADMIN' | 'USER'
  createdAt: string
  updatedAt: string
}
```

(Write the union inline — do NOT import `RoleName` from anywhere: `types.ts` is the definition site. If the auth plan already added a `RoleName` alias here, use it instead and skip this note; check with grep first.)

`src/features/accounts/accounts.api.ts` (mirrors `categories.api.ts` line-for-line shape):

```ts
import { apiFetch } from '../../lib/api'
import type { Account } from '../../lib/types'
import type { AccountPayload } from './accountFields'

export function listAccounts(): Promise<Account[]> {
  return apiFetch<Account[]>('/api/accounts')
}

export function getAccount(id: string): Promise<Account> {
  return apiFetch<Account>(`/api/accounts/${id}`)
}

export function createAccount(payload: AccountPayload): Promise<Account> {
  return apiFetch<Account>('/api/accounts', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateAccount(id: string, payload: AccountPayload): Promise<Account> {
  return apiFetch<Account>(`/api/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteAccount(id: string): Promise<void> {
  return apiFetch<void>(`/api/accounts/${id}`, { method: 'DELETE' })
}
```

`src/features/accounts/accountFields.ts` (mirrors `categoryFields.ts` helpers):

```ts
export interface AccountFormValues {
  username: string
  email: string
  password: string
  role: '' | 'ADMIN' | 'USER'
}

const MAX = 256
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function blank(s: string): boolean {
  return s.trim().length === 0
}

export function validateAccount(v: AccountFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (blank(v.username)) errors.username = 'Tên đăng nhập là bắt buộc'
  if (blank(v.email)) errors.email = 'Email là bắt buộc'
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Email không hợp lệ'
  if (blank(v.password)) errors.password = 'Mật khẩu là bắt buộc'
  else if (v.password.length < 8) errors.password = 'Mật khẩu tối thiểu 8 ký tự'
  if (v.role === '') errors.role = 'Vai trò là bắt buộc'
  if (v.username.length > MAX) errors.username = 'Tối đa 256 ký tự'
  if (v.email.length > MAX) errors.email = 'Tối đa 256 ký tự'
  return errors
}

export interface AccountPayload {
  username: string
  email: string
  password: string
  roleType: 'ADMIN' | 'USER'
}

export function toAccountPayload(v: AccountFormValues): AccountPayload {
  if (v.role === '') throw new Error('role is required')
  return {
    username: v.username.trim(),
    email: v.email.trim(),
    password: v.password,
    roleType: v.role,
  }
}

export function fieldForConflict(message: string): 'username' | 'email' | null {
  const lower = message.toLowerCase()
  if (lower.includes('username')) return 'username'
  if (lower.includes('email')) return 'email'
  return null
}
```

`toAccountPayload` throws on empty role because `validateAccount` must run first (same trust boundary as the other `*Fields` modules — the form always validates before mapping; the throw documents the precondition instead of silently emitting an invalid payload).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/accounts/accountFields.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify build + lint**

Run: `npm run build`
Expected: pass. Run: `npm run lint`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/features/accounts/accounts.api.ts src/features/accounts/accountFields.ts src/features/accounts/accountFields.test.ts
git commit -m "feat: account api client, types, and form fields"
```

---

### Task 2: AccountList + routes (build-gated)

No DOM test runner exists, so this task is gated by `tsc` + `eslint` + smoke (same as the repo's page workflow); the data layer underneath is unit-tested (Task 1).

**Files:**
- Create: `src/features/accounts/AccountList.tsx`
- Modify: `src/App.tsx` (lazy `AccountList`, route `/accounts`)
- Modify: `src/components/AdminShell.tsx` (TITLES + `'/accounts': 'Tài khoản'` with `titleFor` startsWith branch, nav `<NavLink to="/accounts">Tài khoản</NavLink>`)

**Interfaces:**
- Consumes: `listAccounts`, `deleteAccount` from Task 1; `Account` type.
- Produces: `<AccountList/>` default export at `/accounts` (single delete with confirm modal, no bulk, no pager — render all rows).

- [ ] **Step 1: Write `AccountList.tsx`** — Follow `CategoryList.tsx` structure minus checkbox/bulk/pager/images: `all`/`query`/`page`? No — no pager state at all. State: `all`, `query`, `loading`, `error`, `confirmId: string | null` (single id, not array), `deleting`, `nonce`. `useEffect` fetch with cancellation guard + `nonce` retry (copy CategoryList lines 25-43 shape, calling `listAccounts`). Filter: `query` over `username` + `email`. Columns: `Tên đăng nhập`, `Email`, `Vai trò`, `Ngày tạo` (`createdAt` via `toLocaleDateString('vi-VN')`), `Thao tác` (edit → `/accounts/${id}`, delete → `setConfirmId`). Delete: `await deleteAccount(id)` then refetch; error → inline `fetch-error`-style message (no `ErrorPopup` — account delete has no backend guards, so no 409-popup path exists). Confirm modal copies CategoryList markup with title `Xác nhận xóa tài khoản` + body `Xóa tài khoản này? Hành động này không thể hoàn tác.` Empty: `Không có tài khoản nào`. Page head: `Tài khoản` + `+ Thêm tài khoản` link to `/accounts/new`. Search placeholder: `Tìm kiếm theo tên, email`.

- [ ] **Step 2: Wire route + shell nav in `src/App.tsx` / `AdminShell.tsx`** — Add `const AccountList = lazy(() => import('./features/accounts/AccountList.tsx'))`; add `{ path: 'accounts', element: <Suspense fallback={…same…}><AccountList /></Suspense> }` inside the guarded AdminShell children (next to categories/news routes). In `AdminShell.tsx`: TITLES + `'/accounts': 'Tài khoản'`, `titleFor` gains `if (pathname.startsWith('/accounts')) return 'Tài khoản'`, nav gains `<NavLink to="/accounts">Tài khoản</NavLink>`.

- [ ] **Step 3: Verify build + lint + tests**

Run: `npx vitest run`
Expected: PASS (whole suite — no regressions). Run: `npm run build`
Expected: pass. Run: `npm run lint`
Expected: pass.

- [ ] **Step 4: Smoke with local stack** — `npm run dev` (logged in as ADMIN): `/accounts` lists seeded accounts; search filters by username and email; delete asks confirmation then removes the row; backend down → fetch-error + retry (stop API, reload, check).

- [ ] **Step 5: Commit**

```bash
git add src/features/accounts/AccountList.tsx src/App.tsx src/components/AdminShell.tsx
git commit -m "feat: account list with delete"
```

---

### Task 3: AccountForm + routes + full verification (build-gated)

**Files:**
- Create: `src/features/accounts/AccountForm.tsx`
- Modify: `src/App.tsx` (lazy `AccountForm`, routes `/accounts/new`, `/accounts/:id`)

**Interfaces:**
- Consumes: `getAccount`, `createAccount`, `updateAccount` from Task 1; `validateAccount`, `toAccountPayload`, `fieldForConflict` from Task 1; `formErrorForApi` is NOT used (409s are field-routed via `fieldForConflict`); `isNotFoundError` from `src/lib/formErrors`.
- Produces: `<AccountForm/>` default export used by both `/accounts/new` and `/accounts/:id`.

- [ ] **Step 1: Write `AccountForm.tsx`** — Copy `CategoryForm.tsx` shape minus images/rich-text/parent/gallery: `EMPTY: AccountFormValues` (`username/email/password ''`, `role: ''`); `fromAccount(a: Account): AccountFormValues` (all fields except `password: ''` — write-only, never prefilled); `isCreate = id === undefined`; edit effect `getAccount(id)` → prefill; `isNotFoundError` → not-found view `Không tìm thấy tài khoản`, other error → fetch-error + retry (nonce). Layout: single `Thông tin chung` card (no 70/30 split — 4 fields don't need a rail): `Tên đăng nhập *` (text), `Email *` (email input), `Mật khẩu *` (password input + hint `Bắt buộc nhập lại mật khẩu khi sửa` on edit), `Vai trò *` (select `Chọn vai trò` / `Quản trị`→`ADMIN` / `Người dùng`→`USER`). Reuse the `field()` helper + `page-head` + `sticky-footer` (`Hủy` → `/accounts`, `Lưu`) markup from CategoryForm verbatim. Submit: `validateAccount` → `setErrors`, block on errors (zero network calls when invalid — Review Focus #3/#5); `toAccountPayload(values)`; create → `POST` + navigate `/accounts`, edit → `PUT` + navigate `/accounts`; catch: if `ApiError` status 409 → `fieldForConflict(message)` → field error (`Tên đăng nhập đã tồn tại` / `Email đã tồn tại`) or `formMessage` when null; else `formMessage = err.message`.

- [ ] **Step 2: Wire routes in `src/App.tsx`** — Add `const AccountForm = lazy(() => import('./features/accounts/AccountForm.tsx'))`; add `{ path: 'accounts/new', … }` and `{ path: 'accounts/:id', … }` next to the `accounts` route (same Suspense fallback pattern).

- [ ] **Step 3: Run full verification**

Run: `npx vitest run`
Expected: PASS. Run: `npm run build`
Expected: pass. Run: `npm run lint`
Expected: pass.

- [ ] **Step 4: Smoke with local stack** — `npm run dev`: blank/invalid fields blocked with zero network calls (devtools); malformed email blocked; create valid → `201` + back at `/accounts`; duplicate username → username field error; duplicate email → email field error; edit prefills everything but password; unknown `/accounts/:id` → not-found view; update without touching password still requires re-entering one (backend rule surfaced client-side).

- [ ] **Step 5: Commit**

```bash
git add src/features/accounts/AccountForm.tsx src/App.tsx
git commit -m "feat: account create/edit form with routes"
```
