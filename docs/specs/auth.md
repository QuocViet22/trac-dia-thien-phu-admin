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
- Login and forgot-password are gated by a Cloudflare Turnstile
  challenge; a captcha failure shows a captcha-specific message and
  never reads as a wrong credential (§6).

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
- Visual (Image 1, 2026-10-13): centered white card (`max-width
  ~440px`, `radius 16px`, `padding 32px`) on canvas background; top
  lock badge (48px light-blue rounded square, Unicode `🔒` glyph, no
  icon lib); `h1 Đăng nhập quản trị` + gray subtitle `Vui lòng nhập
  thông tin tài khoản quản trị để tiếp tục.`; labels with red `*`;
  inputs `height 48px`, `radius 12px`, left Unicode glyph
  (`👤` username, `🔒` password) via CSS-positioned span, no new
  deps; password eye toggle button (`👁`/`🙈`, `type="button"`,
  `aria-label`, local `showPassword` state only); `Quên mật khẩu?`
  as right-aligned blue text link (`<Link className="auth-link">`)
  → `/forgot-password`. No registration link (accounts are
  admin-managed).
- Submit button full-width primary (`height 48px`, `radius 10px`):
  `Đăng nhập` / `Đang đăng nhập…`. All new classes live under
  `.auth-*` in `src/index.css`, reusing `.card/.field/.error/.btn`
  tokens.
- Bot protection: a Cloudflare Turnstile widget (managed, explicit
  render) sits between the password field and the `Quên mật khẩu?` row.
  The button stays enabled: submitting without a token shows
  `Vui lòng hoàn tất xác thực bảo mật.` and makes no request. `403`
  shows `Xác thực bảo mật không hợp lệ. Vui lòng thử lại.`, `503` shows
  `Dịch vụ xác thực bảo mật tạm thời không khả dụng. Vui lòng thử lại
  sau.`; both reset the widget. See §6.
- If a valid session already exists, visiting `/login` redirects to
  `/products`.

## 4. Forgot + reset pages (public, outside `AdminShell`)

- Shared visual language with §3: same centered `.auth-card`
  (badge + title + gray subtitle), full-width primary button,
  back-to-login as `auth-link`. No new deps, no layout divergence.

- `/forgot-password`: fields `Tên đăng nhập *` + `Email *` (blank +
  email-format checks client-side). Same Turnstile widget with action
  `password-reset`, below the email field (see §6). Submit
  `POST /api/auth/forgot-password` → always the uniform notice
  `Nếu tài khoản tồn tại, liên kết đặt lại đã được gửi` — including
  on backend 401/404-shaped answers, which must NOT surface (no
  existence leak). Back-to-login link underneath.
  **Captcha outcomes are handled before that branch**: a `403`/`503`
  must show the captcha error and leave the form in its unsent state —
  reporting "a link was sent" when the request never ran would be a
  lie. Neither status leaks account existence.
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
  and navigate to `/login` even if it fails).
- Frontend role gating: none — any signed-in session sees the admin;
  the backend enforces ADMIN on writes (403s surface as inline errors
  via the existing `ApiError` path).

## 6. Bot protection (Cloudflare Turnstile)

Server-side contract: `docs/specs/turnstile.md` in the API repo. Login
and forgot-password both take `turnstileToken`; the API answers `403`
(rejected) or `503` (verifier unavailable).

- `index.html` loads
  `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`
  with `async defer`. There is no CSP meta tag in this app, so no policy
  change is required.
- `features/auth/TurnstileWidget.tsx` (new, no new npm deps): renders
  explicitly into a `div`, waits for the script via `turnstile.ready()`,
  and calls `turnstile.remove()` on unmount. Props: `action`
  (`login` | `password-reset`), `onToken(token | null)`, `resetKey`.
  A changed `resetKey` calls `turnstile.reset()`; `expired-callback` and
  `error-callback` both emit `null`, so a dead token can never be
  submitted. The widget renders with `theme: 'light'` to match the white
  card. The `window.turnstile` shape is declared in a
  `declare global` block in the same file — no `@types` package, and no
  helper exports (the repo lint rule allows only component exports from
  component files).
- Failure path: the script is `async`, so the widget waits up to 10 s
  for `window.turnstile` and then gives up; a `render` exception and
  `error-callback` also fail it. All three cases replace the widget with
  `Không tải được xác thực bảo mật. Vui lòng tải lại trang.` and emit no
  token, so a blocked script, an "invalid domain" widget (see §8 in the
  API spec) or a Cloudflare fault is visible and blocks submission
  instead of leaving an empty box the user can never satisfy.
- Sitekey: `VITE_TURNSTILE_SITE_KEY`, inlined at build time. Vite loads
  only `.env`, `.env.local`, `.env.<mode>` and `.env.<mode>.local`;
  `.env.example` is a **template and is never read** — it documents the
  keys and nothing else. `.env.development` carries the real sitekey for
  `npm run dev`, `.env.production` for `npm run build`. Both are
  committed because a sitekey is public, like `VITE_API_URL`.
  `.env.development*` is preferred over `.env.local` because `.env.local`
  is also loaded by a production build, where it would silently override
  `.env.production`.
- `vite.config.ts` refuses a production build with no sitekey
  (`VITE_TURNSTILE_SITE_KEY is required for a production build`), so a
  login page that can only ever show the fail-closed message cannot
  ship. If one slips through anyway (a dev build, a hand-edited env),
  the widget still renders the message and emits no token.
- Local dev needs the sitekey's Cloudflare **Hostname Management** to
  allow `localhost`; otherwise the widget fires `error-callback` with
  code `110200` and lands on the same message. The widget logs the code
  in dev (`Turnstile error 110200`) so the two causes — missing key and
  disallowed hostname — are distinguishable. The API must validate that
  widget's secret; `application-dev.yaml` carries it (API spec §4).
- Token lifecycle: single use, valid 5 minutes. Reset after **every**
  failed submit, not only captcha failures: the attempt consumes it.
- Layout: `.login-turnstile { margin: 4px 0 16px; min-height: 65px }` in
  `LoginPage.css`, so the card does not jump while the script loads. The
  widget is Cloudflare-managed and brings its own accessible iframe; the
  submit button is never disabled by token state (§3, §4).
- `src/features/auth/index.html` — a copied Cloudflare
  `<form action="/api/subscribe">` snippet that nothing imports — is
  deleted.

## 7. Out of scope (deferred, not faked)

- Component/DOM tests (no testing-library installed; vitest unit
  tests only — validation, token store, fetch-wrapper behavior).
- E2E login flow tests.
- Password-strength meter.
- Session expiry countdown / idle timeout.
- OAuth2 / social login.
