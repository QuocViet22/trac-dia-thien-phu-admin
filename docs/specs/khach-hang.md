# Khách Hàng (Contact Messages) — Admin Spec

Source: the "Khách Hàng" sidebar tab requested by the owner; data comes from
the public `/lien-he` form through the API defined in
`trac-dia-thien-phu-api/docs/specs/customer_contact.md`.

Scope approved: list + detail + status toggle + delete. No email notification,
no editing of submitted fields, no bulk delete.

## Goals

- New sidebar tab **Khách Hàng** at `/customer-contact`, listing submitted contact
  messages newest first, with server pagination and a search box.
- Detail page at `/customer-contact/:id` showing the full message and contact data,
  with a **Mới / Đã xử lý** toggle and delete.
- Match existing admin patterns: `apiFetch` + `ApiError`, per-feature
  `*.api.ts`, `table.grid`, `.filterbar`, `.pager`, `.modal`, `.badge`, plain
  CSS only.

## Non-goals

- No create/edit form for messages (the public form is the only writer).
- No reply/email action, no attachments, no export.
- No changes to the `CUSTOMER_NEWS` news type or its "Khách hàng" label
  (owner decision: the news screens stay as they are).
- No bulk selection/delete; no new shared table/pagination component.

## Naming note

Admin already labels the `CUSTOMER_NEWS` news type "Khách hàng" in
`NewsList.tsx` and `NewsForm.tsx`. The new tab reuses that word for contact
messages. This is a known ambiguity accepted by the owner; the tab's route and
topbar title ("Khách Hàng") identify it. `docs/specs/news.md` is not changed.

## API contract

Uses `POST /api/customer-contacts` (public, not called from admin) and:

| Call | Endpoint |
| --- | --- |
| List | `GET /api/customer-contacts?page&size&q&processed` |
| Detail | `GET /api/customer-contacts/{id}` |
| Toggle | `PUT /api/customer-contacts/{id}` body `{ "processed": boolean }` |
| Delete | `DELETE /api/customer-contacts/{id}` |

Response fields: `id, name, email, address, phone, message, processed,
createdAt`. All admin calls need the JWT that `apiFetch` already attaches.

## Architecture

- `src/components/AdminShell.tsx`: add `<NavLink to="/customer-contact">Khách Hàng</NavLink>`,
  a `TITLES['/customer-contact']` entry and a `pathname.startsWith('/customer-contact')`
  branch in `titleFor` (otherwise the detail route titles "Quản trị").
- `src/App.tsx`: lazy imports + routes
  `khach-hang` → `CustomerList`, `khach-hang/:id` → `CustomerDetail`, wrapped in
  the same `Suspense` fallback as the other pages.
- `src/lib/types.ts`: `CustomerContact` (`id, name, email, address, phone,
  message, processed, createdAt`), reusing `SpringPage`/`PageResult`.
- `src/features/customers/customer.api.ts`: `listContacts({ page, size, q,
  processed })` → `unwrapPage`, `getContact(id)`, `setProcessed(id, processed)`,
  `deleteContact(id)`.
- `src/features/customers/customerFields.ts`: pure helpers — `STATUS_LABEL`,
  `statusOf(contact)` (badge class), `buildListQuery`, `formatSentAt`.
- `src/features/customers/CustomerList.tsx` (~200 lines, modelled on
  `NewsList.tsx`): table, status tabs, search form, pager, inline confirm modal.
- `src/features/customers/CustomerDetail.tsx` (~130 lines): read-only fields,
  status toggle, delete, back link, 404 state via `isNotFoundError`.

No new CSS: `.badge.warning` = Mới, `.badge.success` = Đã xử lý, `.badge` with
no modifier if a third state ever appears.

## Screen behaviour

**List** (`/customer-contact`)

- Columns: Tên, Điện thoại, Email, Ngày gửi, Trạng thái, and a row action
  "Xem" linking to the detail.
- Status tabs: Tất cả (`processed` absent) / Mới (`false`) / Đã xử lý (`true`).
  Changing a tab resets `page` to 0.
- Search: text input + "Tìm" submit (no debounce; matches existing screens),
  trims the value, resets `page` to 0. Cleared search returns to the full list.
- Pager: size `10/20/50`, `‹`/`›`, `{page + 1} / {totalPages}`, same markup as
  `NewsList`; clamp `page` when the last row on a page is deleted.
- States: `Đang tải…`, `Không có tin nhắn nào`, and the standard `fetch-error`
  block with "Thử lại" (nonce refetch), exactly like `NewsList`.
- Delete: inline `.modal-backdrop` confirmation with the sender's name; on
  success refetch the current page; on failure show the message inline.

**Detail** (`/customer-contact/:id`)

- Shows name, email, phone, address (`—` when null), sent date/time, status
  badge, and the message body with preserved line breaks
  (`style={{ whiteSpace: 'pre-wrap' }}` — admin has no Tailwind).
- Primary action toggles `processed` (label "Đánh dấu đã xử lý" / "Đánh dấu
  chưa xử lý"); optimistic UI is not used — update then refetch.
- Delete with confirmation, then navigate to `/customer-contact`.
- Back link to the list; loading, error/retry and 404 states.

## Tests

Vitest, pure logic + fetch stubs only (no jsdom in this repo):

- `customerFields.test.ts`: status label/class mapping, query string building
  (empty `q` omitted, `processed` tri-state), date formatting.
- `customer.api.test.ts`: URL + method + body for list/get/update/delete,
  `unwrapPage` mapping, `ApiError` propagation (same style as
  `src/lib/api.test.ts`).

No component tests; the screens are verified by build + manual/headless run.

## Verification

- `npm test`, `npm run lint`, `npm run build` pass.
- Against the smoke API: the tab appears, lists seeded rows, search and status
  tabs narrow the list, detail opens, toggle flips the badge, delete removes the
  row and clamps the page.
- `/products`, `/categories`, `/news`, `/homepage` unchanged.
