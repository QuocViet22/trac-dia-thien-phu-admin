# Auth Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add login, route guard, and forgot/reset-password pages to the admin UI, with bearer-token transport and single-flight silent refresh.

**Architecture:** New `features/auth/` module (API calls, pages, guard, field validation) plus cross-cutting `src/lib/authSession.ts` (localStorage session + single-flight refresh over raw `fetch`, so `lib/api.ts` can consume it without a features→lib inversion); `apiFetch`/`apiForm` attach the bearer token and retry once after refresh; public auth routes sit outside `AdminShell`, which gets wrapped in `RequireAuth`.

**Tech Stack:** React 19, `react-router` (existing, `createBrowserRouter` + lazy routes), hand-rolled forms (existing convention), `vitest` (existing, `npm test`).

**Spec:** `docs/specs/auth.md` — the plan argues from the spec; executors read both. (Deviation from spec §1, applied here and in the spec: session storage lives in `src/lib/authSession.ts`, not `features/auth/tokenStore.ts` — the API layer in `lib/` must consume it, and `lib/` never imports from `features/`.)

## Global Constraints

- `npm run build` (`tsc -b && vite build`) must pass — `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `moduleDetection: force` are on: no unused vars, no enums, `import type` for types.
- `npm run lint` must pass — only components exported from component files (helpers live in `.ts` files, never alongside components).
- `npm test` (`vitest run`) must pass for touched suites.
- UI labels in Vietnamese as written in this plan; spec/plan in English.
- No new dependencies (router + vitest already installed; no testing-library — unit tests only, no DOM tests).
- Backend contract (verified in `trac-dia-thien-phu-api`): `POST /api/auth/login {username, password}` → `{accessToken, refreshToken, tokenType, expiresIn, username, roleType: 'ADMIN'|'USER'}`; `POST /api/auth/refresh {refreshToken}` → same shape (rotated); `POST /api/auth/logout {refreshToken}` → 204; `POST /api/auth/forgot-password {username, email}` → 200 uniform `"If the account exists, a reset link was sent"`; `POST /api/auth/reset-password {token, newPassword}` → 200 `"Password has been reset"`, 401 `"invalid or expired reset token"`. Login 401 message: `"invalid username or password"`.

## Review Focus

- Expired access + valid refresh on a page load must silently recover (one refresh call even under concurrent requests), never flash the login page. → Task 2 single-flight test.
- Refresh token also expired/revoked (final 401) must clear storage AND land on `/login` — a half-logged-in shell with dead tokens is worse than a login redirect. → Task 2 redirect test.
- `localStorage` containing garbage (user tampered with it) must behave as logged-out, never throw during render. → Task 1 corrupt-storage test.
- Forgot-password with an unreachable backend must show a connection error, NOT the uniform success notice (the notice asserts an email was sent). → Task 3 error-branch check.
- `/reset-password` opened without `?token=` must show invalid-link with zero network calls. → Task 3 no-token test (assert `fetch` not called).

---

### Task 1: Types + auth API + fields + session module (red → green)

**Files:**
- Modify: `src/lib/types.ts` (add `TokenResponse`, `RoleName`)
- Modify: `src/lib/api.ts` (export `apiBaseUrl` — rename existing private `baseUrl`, update its 2 call sites in the same file)
- Create: `src/features/auth/auth.api.ts`
- Create: `src/features/auth/authFields.ts`
- Create: `src/lib/authSession.ts`
- Test: `src/features/auth/authFields.test.ts`, `src/lib/authSession.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from `src/lib/api`; raw `fetch` + `VITE_API_URL` for refresh (no recursion through `apiFetch`).
- Produces: `type RoleName = 'ADMIN' | 'USER'`; `interface TokenResponse { accessToken: string; refreshToken: string; tokenType: string; expiresIn: number; username: string; roleType: RoleName }`; `login({username, password}): Promise<TokenResponse>`; `requestPasswordReset({username, email}): Promise<string>` (returns the uniform message, callers display their own Vietnamese notice); `resetPassword({token, newPassword}): Promise<string>`; `logout(refreshToken: string): Promise<void>`; `interface AuthSession { accessToken: string; refreshToken: string; username: string; role: RoleName }`; `loadSession(): AuthSession | null`; `saveSession(s: AuthSession): void`; `clearSession(): void`; `refreshSession(): Promise<AuthSession | null>` (single-flight; null after clearing on failure); `validateLogin/forgot/reset` + `LoginValues/ForgotValues/ResetValues` in `authFields.ts`.

- [ ] **Step 1: Write the failing tests** — Create `src/features/auth/authFields.test.ts` mirroring `categoryFields.test.ts` shape:

```ts
import { describe, expect, it } from 'vitest'
import { validateForgot, validateLogin, validateReset } from './authFields'

describe('validateLogin', () => {
  it('accepts non-blank credentials', () => {
    expect(validateLogin({ username: 'alice', password: 'secret123' })).toEqual({})
  })

  it('rejects blank username and password', () => {
    expect(validateLogin({ username: '  ', password: 'secret123' }).username).toBeTruthy()
    expect(validateLogin({ username: 'alice', password: '' }).password).toBeTruthy()
  })
})

describe('validateForgot', () => {
  it('accepts a well-formed pair', () => {
    expect(validateForgot({ username: 'alice', email: 'alice@example.com' })).toEqual({})
  })

  it('rejects blanks and malformed email', () => {
    expect(validateForgot({ username: '', email: 'alice@example.com' }).username).toBeTruthy()
    expect(validateForgot({ username: 'alice', email: 'not-an-email' }).email).toBeTruthy()
  })
})

describe('validateReset', () => {
  it('accepts matching passwords of length 8+', () => {
    expect(validateReset({ newPassword: 'brand-new-1', confirm: 'brand-new-1' })).toEqual({})
  })

  it('rejects short and mismatched passwords', () => {
    expect(validateReset({ newPassword: 'short', confirm: 'short' }).newPassword).toBeTruthy()
    expect(validateReset({ newPassword: 'brand-new-1', confirm: 'other-pass-2' }).confirm).toBeTruthy()
  })
})
```

Create `src/lib/authSession.test.ts` (node env: no `localStorage`, no `window` — stub both):

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, loadSession, refreshSession, saveSession } from './authSession'
import type { AuthSession } from './authSession'

function memoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  }
}

const session: AuthSession = {
  accessToken: 'a',
  refreshToken: 'r',
  username: 'alice',
  role: 'ADMIN',
}

function pairResponse(accessToken = 'a2', refreshToken = 'r2'): Response {
  return new Response(
    JSON.stringify({
      success: true,
      message: 'OK',
      data: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900, username: 'alice', roleType: 'ADMIN' },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
})

describe('session storage', () => {
  it('round-trips a session and clears it', () => {
    saveSession(session)
    expect(loadSession()).toEqual(session)
    clearSession()
    expect(loadSession()).toBeNull()
  })

  it('treats corrupt storage as logged out', () => {
    localStorage.setItem('tp_admin_auth', '{broken')
    expect(loadSession()).toBeNull()
  })
})

describe('refreshSession', () => {
  it('persists the rotated pair on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => pairResponse()))
    saveSession(session)

    const next = await refreshSession()

    expect(next?.accessToken).toBe('a2')
    expect(loadSession()?.refreshToken).toBe('r2')
  })

  it('issues one refresh for concurrent callers (single-flight)', async () => {
    const fetchMock = vi.fn(async () => pairResponse())
    vi.stubGlobal('fetch', fetchMock)
    saveSession(session)

    const [a, b] = await Promise.all([refreshSession(), refreshSession()])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a?.accessToken).toBe('a2')
    expect(b?.accessToken).toBe('a2')
  })

  it('clears storage and returns null when the refresh token is dead', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ success: false, message: 'invalid refresh token', data: null }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    )
    saveSession(session)

    await expect(refreshSession()).resolves.toBeNull()
    expect(loadSession()).toBeNull()
  })

  it('returns null without network when no session exists', async () => {
    const fetchMock = vi.fn(async () => pairResponse())
    vi.stubGlobal('fetch', fetchMock)
    clearSession()

    await expect(refreshSession()).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/auth/authFields.test.ts src/lib/authSession.test.ts`
Expected: FAIL with "Failed to resolve import" (neither module exists yet).

- [ ] **Step 3: Implement types + API + fields + session**

`src/lib/types.ts` — append:

```ts
export type RoleName = 'ADMIN' | 'USER'

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  username: string
  roleType: RoleName
}
```

`src/lib/api.ts` — rename private `baseUrl` to exported `apiBaseUrl` (update the 2 call sites in `apiFetch`/`apiForm` in the same edit).

`src/features/auth/auth.api.ts` (mirrors `categories.api.ts` shape):

```ts
import { apiFetch } from '../../lib/api'
import type { TokenResponse } from '../../lib/types'

export function login(payload: { username: string; password: string }): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) })
}

export function requestPasswordReset(payload: { username: string; email: string }): Promise<string> {
  return apiFetch<string>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) })
}

export function resetPassword(payload: { token: string; newPassword: string }): Promise<string> {
  return apiFetch<string>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) })
}

export function logout(refreshToken: string): Promise<void> {
  return apiFetch<void>('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) })
}
```

`src/features/auth/authFields.ts` (mirrors `categoryFields.ts` helpers):

```ts
export interface LoginValues {
  username: string
  password: string
}

export interface ForgotValues {
  username: string
  email: string
}

export interface ResetValues {
  newPassword: string
  confirm: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function blank(s: string): boolean {
  return s.trim().length === 0
}

export function validateLogin(v: LoginValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (blank(v.username)) errors.username = 'Tên đăng nhập là bắt buộc'
  if (blank(v.password)) errors.password = 'Mật khẩu là bắt buộc'
  return errors
}

export function validateForgot(v: ForgotValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (blank(v.username)) errors.username = 'Tên đăng nhập là bắt buộc'
  if (blank(v.email)) errors.email = 'Email là bắt buộc'
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Email không hợp lệ'
  return errors
}

export function validateReset(v: ResetValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (blank(v.newPassword)) errors.newPassword = 'Mật khẩu mới là bắt buộc'
  else if (v.newPassword.length < 8) errors.newPassword = 'Mật khẩu tối thiểu 8 ký tự'
  if (v.confirm !== v.newPassword) errors.confirm = 'Nhập lại mật khẩu không khớp'
  return errors
}
```

`src/lib/authSession.ts`:

```ts
import { apiBaseUrl } from './api'
import type { RoleName, TokenResponse } from './types'

export interface AuthSession {
  accessToken: string
  refreshToken: string
  username: string
  role: RoleName
}

const KEY = 'tp_admin_auth'

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage
}

export function loadSession(): AuthSession | null {
  try {
    const raw = storage()?.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.username || !parsed.role) return null
    return parsed as AuthSession
  } catch {
    return null
  }
}

export function saveSession(session: AuthSession): void {
  storage()?.setItem(KEY, JSON.stringify(session))
}

export function clearSession(): void {
  storage()?.removeItem(KEY)
}

let inflight: Promise<AuthSession | null> | null = null

export function refreshSession(): Promise<AuthSession | null> {
  if (inflight) return inflight
  inflight = (async (): Promise<AuthSession | null> => {
    const current = loadSession()
    if (!current) return null
    try {
      const res = await fetch(`${apiBaseUrl()}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      })
      const body = (await res.json()) as { success: boolean; data: TokenResponse }
      if (!res.ok || !body.success) throw new Error('refresh failed')
      const next: AuthSession = {
        accessToken: body.data.accessToken,
        refreshToken: body.data.refreshToken,
        username: body.data.username,
        role: body.data.roleType,
      }
      saveSession(next)
      return next
    } catch {
      clearSession()
      return null
    } finally {
      inflight = null
    }
  })()
  return inflight
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/auth/authFields.test.ts src/lib/authSession.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify build + lint**

Run: `npm run build`
Expected: pass. Run: `npm run lint`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/api.ts src/features/auth/auth.api.ts src/features/auth/authFields.ts src/features/auth/authFields.test.ts src/lib/authSession.ts src/lib/authSession.test.ts
git commit -m "feat: auth api client, fields, and session store"
```

---

### Task 2: Bearer transport with single silent refresh (red → green)

**Files:**
- Modify: `src/lib/api.ts` (`requestWithAuthRefresh` helper; `apiFetch` + `apiForm` route through it)
- Test: append to `src/lib/api.test.ts` (bearer attach, 401→refresh→retry, dead-refresh→clear+redirect)

**Interfaces:**
- Consumes: `loadSession`, `refreshSession`, `clearSession` from `./authSession`.
- Produces: unchanged `apiFetch`/`apiForm` signatures (callers untouched); `Authorization: Bearer` attached when a session exists; exactly one refresh+retry per 401; dead session → cleared storage + `window.location.assign('/login')` (guarded by `typeof window` so node/vitest never touches it).

- [ ] **Step 1: Write the failing tests** — Append to `src/lib/api.test.ts` (existing `jsonResponse` helper + `afterEach(vi.unstubAllGlobals)` reused; stub `localStorage` with the same in-memory shape as Task 1 and `window` with a `location.assign` mock where asserted):

```ts
describe('auth transport', () => {
  it('attaches the bearer token when a session exists', async () => {
    vi.stubGlobal('localStorage', memoryStorage())
    localStorage.setItem(
      'tp_admin_auth',
      JSON.stringify({ accessToken: 'a1', refreshToken: 'r1', username: 'alice', role: 'ADMIN' }),
    )
    const seen: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown, init?: RequestInit) => {
        seen.push((init?.headers as Record<string, string>)['Authorization'] ?? '')
        return jsonResponse({ success: true, message: 'OK', data: [] })
      }),
    )

    await apiFetch('/api/categories')

    expect(seen).toEqual(['Bearer a1'])
  })
```

For `memoryStorage`, extract the helper from Task 1's test into this file too (duplicate the 12-line helper — test-only duplication beats cross-test imports; keep each test file self-contained like the existing suite).

```ts
  it('refreshes once and retries the request after a 401', async () => {
    vi.stubGlobal('localStorage', memoryStorage())
    localStorage.setItem(
      'tp_admin_auth',
      JSON.stringify({ accessToken: 'expired', refreshToken: 'r1', username: 'alice', role: 'ADMIN' }),
    )
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown, init?: RequestInit) => {
        calls += 1
        const target = String(url)
        if (target.endsWith('/api/auth/refresh')) {
          return jsonResponse({
            success: true,
            message: 'OK',
            data: { accessToken: 'a2', refreshToken: 'r2', tokenType: 'Bearer', expiresIn: 900, username: 'alice', roleType: 'ADMIN' },
          })
        }
        if (calls === 1) return jsonResponse({ success: false, message: 'auth', data: null }, 401)
        return jsonResponse({ success: true, message: 'OK', data: [] })
      }),
    )

    const data = await apiFetch('/api/categories')

    expect(data).toEqual([])
    expect(calls).toBe(3)
    expect(JSON.parse(localStorage.getItem('tp_admin_auth') ?? '{}').accessToken).toBe('a2')
  })

  it('clears storage and redirects to login when refresh is dead', async () => {
    vi.stubGlobal('localStorage', memoryStorage())
    localStorage.setItem(
      'tp_admin_auth',
      JSON.stringify({ accessToken: 'dead', refreshToken: 'dead', username: 'alice', role: 'ADMIN' }),
    )
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { assign } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) =>
        String(url).endsWith('/api/auth/refresh')
          ? jsonResponse({ success: false, message: 'invalid refresh token', data: null }, 401)
          : jsonResponse({ success: false, message: 'auth', data: null }, 401),
      ),
    )

    await expect(apiFetch('/api/categories')).rejects.toBeInstanceOf(ApiError)
    expect(localStorage.getItem('tp_admin_auth')).toBeNull()
    expect(assign).toHaveBeenCalledWith('/login')
  })
})
```

Note: the redirect assertion needs `window` stubbed because the implementation guards with `typeof window === 'undefined'`. Without the stub, node skips the redirect and only clear+throw are observable.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/api.test.ts`
Expected: FAIL — no `Authorization` header is sent today and no refresh/redirect exists (first two tests fail on header/refresh assertions; the third fails because storage is never cleared — all for the right reasons, not typos).

- [ ] **Step 3: Implement in `src/lib/api.ts`** — Add imports (`clearSession`, `loadSession`, `refreshSession` from `./authSession`), rename `baseUrl` → exported `apiBaseUrl` if Task 1 hasn't (it has — verify, don't duplicate), and insert this helper before `apiFetch`:

```ts
async function requestWithAuthRefresh(url: string, init?: RequestInit): Promise<Response> {
  const session = loadSession()
  const withAuth: RequestInit = {
    ...init,
    headers: {
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...init?.headers,
    },
  }
  const first = await fetch(url, withAuth)
  if (first.status !== 401) return first
  const next = await refreshSession()
  if (!next) {
    clearSession()
    if (typeof window !== 'undefined') window.location.assign('/login')
    return first
  }
  return fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${next.accessToken}`, ...init?.headers },
  })
}
```

Then change `apiFetch` to `const res = await requestWithAuthRefresh(`${apiBaseUrl()}${path}`, init)` (keeping the rest of its body identical) and `apiForm` to `const res = await requestWithAuthRefresh(`${apiBaseUrl()}${path}`, { method: 'POST', body: form })`. Note: caller's explicit `Authorization` header still wins (spread last) — used by no one today, preserved for flexibility.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/api.test.ts src/lib/authSession.test.ts`
Expected: PASS (existing envelope tests unaffected — no session in storage there means no header, identical behavior).

- [ ] **Step 5: Verify build + lint**

Run: `npm run build`
Expected: pass. Run: `npm run lint`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api.ts src/lib/authSession.ts src/lib/api.test.ts
git commit -m "feat: bearer transport with single silent refresh"
```

Note: `src/lib/authSession.ts` is recommitted here only if Step 3 touched it (it shouldn't — Task 1 owns it; drop it from the `git add` if unchanged).

---

### Task 3: Login / forgot / reset pages + guard + shell + routes (build-gated)

Pages have no DOM test runner (no testing-library, none added), so this task is gated by `tsc` + `eslint` + targeted smoke, following the repo's existing page workflow. Validation and transport underneath are already unit-tested (Tasks 1–2).

**Files:**
- Create: `src/features/auth/LoginPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `RequireAuth.tsx`
- Modify: `src/App.tsx` (3 lazy public routes + guard wrap + 3 account-route placeholders? No — account routes come in the account plan. This task adds ONLY the 3 auth routes + guard wrap.)
- Modify: `src/components/AdminShell.tsx` (username + logout in topbar)

**Interfaces:**
- Consumes: `login/requestPasswordReset/resetPassword/logout` from `auth.api`; `saveSession/loadSession/clearSession` from `lib/authSession`; `validateLogin/validateForgot/validateReset`.
- Produces: default-exported page components (one per file, per lint rule); `RequireAuth` default export rendering `<Outlet />` or `<Navigate to="/login" replace />`.

- [ ] **Step 1: Write `RequireAuth.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router'
import { loadSession } from '../lib/authSession'

export default function RequireAuth() {
  if (!loadSession()?.accessToken) return <Navigate to="/login" replace />
  return <Outlet />
}
```

- [ ] **Step 2: Write `LoginPage.tsx`** — `username`/`password`/`errors`/`formMessage`/`saving` state (CategoryForm conventions); submit: `validateLogin` → `setErrors`, block on errors; `await login({username: u.trim(), password})` → `saveSession({accessToken, refreshToken, username, role: roleType})` → `navigate('/products', { replace: true })`; catch: `ApiError` status 401 → `formMessage = 'Sai tên đăng nhập hoặc mật khẩu'`, else `err.message` or `'Không kết nối được máy chủ'`. If `loadSession()` exists on render → `<Navigate to="/products" replace />`. Layout: centered `.card.auth-card` (new CSS classes go in `src/index.css` next to existing card styles — check class names there first and reuse `.card`, `.field`, `.error`, `.btn btn-primary` verbatim); ghost button `Quên mật khẩu` as `<Link to="/forgot-password" className="btn btn-default">`.

- [ ] **Step 3: Write `ForgotPasswordPage.tsx`** — `username`/`email` state; submit: `validateForgot` → errors; `await requestPasswordReset(...)` → `sent=true` notice `Nếu tài khoản tồn tại, liên kết đặt lại đã được gửi` (shown on ANY success — and on `ApiError` 401/404 too, mapping both to the same notice to preserve uniformity; other errors → `formMessage`). Link back `Quay lại đăng nhập`.

- [ ] **Step 4: Write `ResetPasswordPage.tsx`** — `const [params] = useSearchParams()`; `token = params.get('token') ?? ''`; blank token → invalid-link view with zero network calls (`fetch` must never fire — assert by code reading, no test runner for DOM); fields `newPassword`/`confirm`; submit: `validateReset` → errors; `await resetPassword({token, newPassword})` → success view `Đặt lại mật khẩu thành công` + login link; `ApiError` 401 → invalid-link view `Liên kết đã hết hạn hoặc không hợp lệ`.

- [ ] **Step 5: Wire `App.tsx` + shell** — Add lazy imports + routes `{ path: 'login' }`, `{ path: 'forgot-password' }`, `{ path: 'reset-password' }` as SIBLINGS of the `'/'` route (outside the shell, same `Suspense` fallback). Change the `'/'` route to nest: `element: <RequireAuth />` with child `{ element: <AdminShell />, children: [ ...all existing children unchanged... ] }`. `AdminShell` topbar right side: `{username}` from `loadSession()` + **Đăng xuất** button → `await logout(refresh).catch(() => {})` with the stored refresh token (or skip the call when absent) → `clearSession()` → `navigate('/login', { replace: true })`. (The `Tài khoản` sidebar entry comes with the account plan — this task adds no account navigation.)

- [ ] **Step 6: Verify build + lint + full tests**

Run: `npx vitest run`
Expected: PASS (whole suite — no regressions). Run: `npm run build`
Expected: pass. Run: `npm run lint`
Expected: pass.

- [ ] **Step 7: Smoke with local stack** — `npm run dev` (+ API running): wrong credentials → inline 401 message; correct → `/products`; reload → still logged in; direct `/login` while logged in → `/products`; direct `/products` logged out → `/login`; forgot with unknown user → uniform notice; reset link flow end-to-end with a real Gmail delivery; expired link → invalid-link view; user stays logged in across access-token expiry (check network: one refresh + retry).

- [ ] **Step 8: Commit**

```bash
git add src/features/auth/LoginPage.tsx src/features/auth/ForgotPasswordPage.tsx src/features/auth/ResetPasswordPage.tsx src/features/auth/RequireAuth.tsx src/App.tsx src/components/AdminShell.tsx src/index.css
git commit -m "feat: login, guard, and password pages"
```

(Only include `src/index.css` if new classes were actually added.)
