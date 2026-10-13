# Login UI Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle login (plus forgot/reset for consistency) to match Image 1 with zero logic change.

**Architecture:** UI-only edits to three existing page components plus `.auth-*` CSS extensions; keep `login/validateLogin/saveSession/navigate` paths untouched, no new deps, Unicode glyphs positioned via CSS.

**Tech Stack:** React 19 + TS + react-router v8, hand-rolled CSS in `src/index.css`, vitest for existing unit tests.

**Spec:** `docs/specs/auth.md` §3-§4 (§3 updated 2026-10-13 for Image 1)

## Global Constraints

- No new npm dependencies.
- `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `moduleDetection: force` — use `import type` for types, no unused vars.
- ESLint `react-hooks` + `react-refresh`: only export components from component files.
- Reuse `.card/.field/.error/.btn` tokens; new classes only under `.auth-*`.
- Vietnamese copy verbatim from spec/image: `Đăng nhập quản trị`, `Vui lòng nhập thông tin tài khoản quản trị để tiếp tục.`, `Tên đăng nhập *`, `Mật khẩu *`, `Quên mật khẩu?`, `Đăng nhập`.

## Review Focus

- Password toggle must not submit the form (`type="button"`) and must keep typed value when toggling type.
- Empty-submit still shows blank-field errors from `validateLogin`, not a server call.
- 401 still shows `Sai tên đăng nhập hoặc mật khẩu`; network failure still shows `Không kết nối được máy chủ`.
- Logged-in visit to `/login` still redirects to `/products`.
- Forgot uniform notice `Nếu tài khoản tồn tại, liên kết đặt lại đã được gửi` still shows on 401/404 without leaking.

---

### Task 1: Restyle LoginPage.tsx

**Files:**
- Modify: `src/features/auth/LoginPage.tsx`

**Interfaces:**
- Consumes: `login({username, password})` from `./auth.api`, `validateLogin` from `./authFields`, `loadSession/saveSession` from `../../lib/authSession`.
- Produces: Default-exported `LoginPage` with added `showPassword` boolean state; identical submit/navigation behavior.

- [ ] **Step 1: Edit `LoginPage.tsx` for Image 1 layout**

Add `const [showPassword, setShowPassword] = useState(false)`; badge `<div className="auth-badge" aria-hidden="true">🔒</div>`; `<h1>Đăng nhập quản trị</h1>` + `<p className="auth-sub">Vui lòng nhập thông tin tài khoản quản trị để tiếp tục.</p>`; wrap each input in `<div className="input-wrap">` with `<span className="input-icon" aria-hidden="true">` (`👤` / `🔒`); password input `type={showPassword ? 'text' : 'password'}` + `<button type="button" className="icon-btn eye-btn" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword((v) => !v)}>` (`🙈`/`👁`); replace forgot `<Link className="btn btn-default">` with `<div className="auth-link-row"><Link to="/forgot-password" className="auth-link">Quên mật khẩu?</Link></div>` placed between fields and submit; submit `<button className="btn btn-primary auth-submit">` unchanged labels.

- [ ] **Step 2: Typecheck the file**

Run: `npx tsc -b`
Expected: PASS with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/LoginPage.tsx
git commit -m "feat: restyle login page to match design"
```

### Task 2: Restyle Forgot + Reset pages

**Files:**
- Modify: `src/features/auth/ForgotPasswordPage.tsx`
- Modify: `src/features/auth/ResetPasswordPage.tsx`

**Interfaces:**
- Consumes: Same `requestPasswordReset/resetPassword` + validators as today; no signature changes.
- Produces: Same default exports with badge/subtitle/full-width button/`auth-link` back link.

- [ ] **Step 1: Edit both pages for shared visual language**

Add `auth-badge` + `auth-sub` (`Quên mật khẩu` → sub `Nhập thông tin tài khoản để nhận liên kết đặt lại.`; `Đặt lại mật khẩu` → sub `Nhập mật khẩu mới cho tài khoản của bạn.`); submit buttons get `auth-submit`; back-to-login `<Link className="auth-link">Quay lại đăng nhập</Link>` inside `.auth-link-row`. Reset password inputs reuse `.input-wrap` + lock glyph (no eye toggle — keep minimal).

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/ForgotPasswordPage.tsx src/features/auth/ResetPasswordPage.tsx
git commit -m "feat: align forgot/reset with login visual language"
```

### Task 3: Extend auth CSS

**Files:**
- Modify: `src/index.css` (append to `/* Auth pages */` section only)

**Interfaces:**
- Consumes: Existing CSS vars (`--primary`, `--card`, `--card-border`, `--text-secondary`, `--danger`).
- Produces: `.auth-badge`, `.auth-sub`, `.input-wrap`, `.input-icon`, `.eye-btn`, `.auth-link-row`, `.auth-link`, `.auth-submit` classes used by Task 1–2.

- [ ] **Step 1: Add `.auth-*` styles**

`.auth-card { max-width: 440px; border-radius: 16px; padding: 32px; gap: 16px; }`; `.auth-badge { width: 48px; height: 48px; border-radius: 12px; background: var(--primary-light); display: flex; align-items: center; justify-content: center; font-size: 22px; }`; `.auth-sub { color: var(--text-secondary); margin: 0; }`; `.input-wrap { position: relative; }` + `.input-wrap input { height: 48px; border-radius: 12px; padding-left: 40px; padding-right: 40px; }` (right padding only on password); `.input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); pointer-events: none; }`; `.eye-btn { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); }`; `.auth-link-row { display: flex; justify-content: flex-end; margin: 4px 0 16px; }`; `.auth-link { color: var(--primary); text-decoration: none; font-weight: 500; }` + hover underline; `.auth-submit { width: 100%; height: 48px; border-radius: 10px; justify-content: center; font-size: 15px; }`.

- [ ] **Step 2: Verify build + lint**

Run: `npm run build`
Expected: PASS. Run: `npm run lint`
Expected: PASS (no new warnings).

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: image-1 auth card styles"
```

### Task 4: Verify no regressions

**Files:**
- Test: existing `src/features/auth/authFields.test.ts`, `src/lib/*.test.ts` (no new test files — UI-only change, YAGNI).

- [ ] **Step 1: Run unit tests**

Run: `npm test`
Expected: PASS (all suites green).

- [ ] **Step 2: Manual smoke with `npm run dev` (+ API running)**

Check: `/login` matches Image 1; eye toggle keeps value; blank submit → field errors; wrong creds → `Sai tên đăng nhập hoặc mật khẩu`; correct → `/products`; reload stays logged in; direct `/login` while logged in → `/products`; forgot unknown user → uniform notice; reset invalid link → `Liên kết đã hết hạn hoặc không hợp lệ`.
