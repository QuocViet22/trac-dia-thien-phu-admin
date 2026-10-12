# Account Admin — Spec

Full CRUD admin for login accounts, bound to the real backend
(`GET/POST/PUT/DELETE /api/accounts` in `trac-dia-thien-phu-api`,
ADMIN-only; see `docs/specs/account_controller.md` in the API repo).
Requires the auth milestone (`docs/specs/auth.md` — session, guard,
and bearer transport) to be usable: every write here carries the
admin JWT or the backend answers 401/403.

Success criteria:

- `AdminShell` gains a **Tài khoản** sidebar entry (→ `/accounts`,
  title `Tài khoản`).
- `/accounts` lists all accounts (username, email, role, created-at)
  with working edit/delete actions.
- `/accounts/new` creates an account (`201`); blank/invalid fields
  are rejected client-side; duplicate username or email surfaces the
  backend `409`.
- `/accounts/:id` loads and updates (`200`, full update — password
  always re-sent); unknown id shows a not-found state.
- Delete uses the design's confirm modal; backend rejections surface
  inline.

## 1. List page (`/accounts`)

- Data: `GET /api/accounts` returns the **full list, unpaged**
  (account lists are admin-scale; no client pagination in v1 —
  render all rows).
- Filter bar: text search client-side over username + email. No
  `Bộ lọc khác` button in v1.
- Columns: username, email, role (`ADMIN`/`USER` — display as-is),
  created-at (locale date), actions. No password/hash column ever —
  the API never returns one.
- Row actions: edit (→ `/accounts/:id`), delete (confirm modal,
  `DELETE`, refetch afterwards). No bulk bar in v1 (single delete
  only — accounts are few and destructive).

## 2. Form pages (`/accounts/new`, `/accounts/:id`)

Fields map 1:1 to `CreateAccountRequest` / `UpdateAccountRequest`:

| UI field | API field | Rules |
|---|---|---|
| Tên đăng nhập * | `username` | required, max 256 |
| Email * | `email` | required, valid email format, max 256, unique |
| Mật khẩu * | `password` | required on create AND edit (API full-update rule — editing username/role requires re-entering a password), min 8, max 256 |
| Vai trò * | `roleType` | required select: `ADMIN` / `USER` |

- Edit loads `GET /api/accounts/{id}` and prefills everything except
  password (always blank on edit — it is write-only); submit `PUT`
  with the full payload.
- Client validation mirrors the API: blank checks, email regex,
  password min 8. Duplicate username/email surfaces the backend 409
  message inline (`username already exists` /
  `email already exists`).
- Shared validators live in `features/accounts/accountFields.ts` with
  `accountFields.test.ts`, mirroring the `*Fields.ts` convention.

## 3. API module (`features/accounts/accounts.api.ts`)

Thin wrappers over `apiFetch`, mirroring `categories.api.ts`:

```ts
listAccounts(): Promise<Account[]>
getAccount(id: string): Promise<Account>
createAccount(payload: AccountPayload): Promise<Account>
updateAccount(id: string, payload: AccountPayload): Promise<Account>
deleteAccount(id: string): Promise<void>
```

`Account` and `AccountPayload` types go in `src/lib/types.ts` /
`accountFields.ts` respectively (`roleType: 'ADMIN' | 'USER'` union —
no enums per repo lint). No `password` field on the `Account` response
type (the API never sends one; the type must make leakage
unrepresentable).

## 4. Out of scope (deferred, not faked)

- Bulk delete / bulk role change.
- Client-side pagination or sorting (add when the list outgrows a page).
- Password confirm field on the account form (single entry like the
  API; the reset page keeps its confirm field).
- Show/hide password toggle.
- Deactivating accounts without deleting (no backend status field).
