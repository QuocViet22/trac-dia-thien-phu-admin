# Auth Admin — Spec

Login, route guard, and password flows for the Thiên Phú back-office
admin, bound to the real backend (`trac-dia-thien-phu-api`:
`POST /api/auth/login|refresh|logout|forgot-password|reset-password`,
`ApiResponse` envelope `{success, message, data}` — see
`docs/specs/auth_controller.md` and `docs/specs/password_reset.md` in
the API repo). No auth exists in the admin UI today: `apiFetch` sends
no credentials and every route is public.

Success criteria:

- `/login` signs in with username + password, persists the session,
  and lands on `/products`; bad credentials show `Sai tên đăng nhập
  hoặc mật khẩu` without revealing which half was wrong.
- A **Quên mật khẩu** button on the login page leads to
  `/forgot-password`; submitting shows the uniform notice regardless
  of whether the account exists.
- `/reset-password?token=` sets a new password (with confirmation);
  bad/expired links show `Liên kết đã hết hạn hoặc không hợp lệ`.
- All `/`-shell routes require a session (else redirect to `/login`);
  expired access tokens refresh silently; an ADMIN-only write with a
  non-admin session surfaces the backend `403`.
- No new npm dependencies.

## 1. Token storage (`features/auth/tokenStore.ts`)

- localStorage keys (single object under one key, `tp_admin_auth`):
  `{accessToken, refreshToken, username, role}`. Helpers:
  `loadAuth()`, `saveAuth()`, `clearAuth()`.
- Refresh is single-flight: one shared promise for concurrent 401s —
  the first caller performs `POST /api/auth/refresh`, the rest await
  the same promise; the rotated pair overwrites storage. Rotation
  failure clears storage (session is dead).
- No `remember me` — localStorage is already persistent.

## 2. Transport (`src/lib/api.ts`)

- `apiFetch` attaches `Authorization: Bearer <accessToken>` when a
  session exists (same for `apiForm` — uploads are ADMIN-only too).
- On 401: exactly one silent refresh-and-retry (new pair persisted);
  if the retry still 401s (or no refresh token exists), clear storage
  and `window.location.assign('/login')`. Non-401 errors keep today's
  `ApiError` behavior unchanged.
- Types added to `src/lib/types.ts`: `TokenPair`
  (`accessToken`, `refreshToken`, `tokenType`, `expiresIn`,
  `username`, `roleType: 'ADMIN' | 'USER'`). No enums (repo lint
  forbids them).

## 3. Login page (`/login`, outside `AdminShell`)

- Hand-rolled form (no new deps), fields: `Tên đăng nhập *`,
  `Mật khẩu *`, client-side blank checks only (credential validity is
  the server's answer). Submit `POST /api/auth/login` → persist pair
  → `Navigate to /products`.
- 401 → inline form error `Sai tên đăng nhập hoặc mật khẩu`; network
  failure → `Không kết nối được máy chủ`.
- **Quên mật khẩu** button (secondary/ghost style) → navigates to
  `/forgot-password`. No registration link (accounts are
  admin-managed).
- If a valid session already exists, visiting `/login` redirects to
  `/products`.

## 4. Forgot + reset pages (public, outside `AdminShell`)

- `/forgot-password`: fields `Tên đăng nhập *` + `Email *` (blank +
  email-format checks client-side). Submit
  `POST /api/auth/forgot-password` → always the uniform notice
  `Nếu tài khoản tồn tại, liên kết đặt lại đã được gửi` — including
  on backend 401/404-shaped answers, which must NOT surface (no
  existence leak). Back-to-login link underneath.
- `/reset-password`: reads `token` from the query string (missing
  token → `Liên kết đã hết hạn hoặc không hợp lệ` with zero network
  calls). Fields `Mật khẩu mới *` (min 8) + `Nhập lại mật khẩu *`
  (must match, client-side). Submit
  `POST /api/auth/reset-password` → success state
  `Đặt lại mật khẩu thành công` + login link. Backend 401 →
  `Liên kết đã hết hạn hoặc không hợp lệ`.
- Shared field validators live in
  `features/auth/authFields.ts` with `authFields.test.ts`, mirroring
  the `*Fields.ts` + `.test.ts` convention. Token-store behavior
  (`save/load/clear/overwrite`) gets a `tokenStore.test.ts`.

## 5. Route guard + shell (`RequireAuth`, topbar)

- `features/auth/RequireAuth.tsx`: no stored access token → `<Navigate
  to="/login" replace />`; otherwise renders `<Outlet />`. `App.tsx`
  wraps the `AdminShell` route element with it; `/login`,
  `/forgot-password`, `/reset-password` stay outside.
- `AdminShell` topbar gains: current username (from storage) + **Đăng
  xuất** button → `POST /api/auth/logout` (best-effort: clear storage
  and navigate to `/login` even if it fails) + **Tài khoản** sidebar
  entry (`Tài khoản`, → `/accounts`).
- Frontend role gating: none — any signed-in session sees the admin;
  the backend enforces ADMIN on writes (403s surface as inline errors
  via the existing `ApiError` path).

## 6. Out of scope (deferred, not faked)

- Component/DOM tests (no testing-library installed; vitest unit
  tests only — validation, token store, fetch-wrapper behavior).
- E2E login flow tests.
- Password-strength meter, show/hide password toggle.
- Session expiry countdown / idle timeout.
- OAuth2 / social login.
