# Users table CRUD (admin) — design

**Date:** 2026-06-01
**Status:** Approved (pending spec review)

## Goal

Bring the admin Users table in line with the rest of the dashboard tables and make
users fully manageable from the UI:

1. Restyle the Users table to match `AdminPollsTable` — drop the inline role
   `<Select>` from the row; keep a **read-only** role badge.
2. Add **Create** and **Edit** user modals (route-driven, like `PollFormModal`).
3. Add a per-row **Delete** button.

This requires new backend endpoints — the current `admin/users` controller only
supports `list`, `changeRole`, `bulkDelete`, and `export.csv`.

## Decisions (from brainstorming)

- **Backend:** full CRUD (create, edit, single delete).
- **Modals:** route-driven, mirroring `PollFormModal`.
- **Form fields:** Create = name, email, password, role. Edit = name, email, role
  + optional "set new password" (blank = keep current).
- **Role in row:** keep a read-only badge; role is edited in the modal.
- **`PATCH /admin/users/:id/role`** is removed and folded into `PATCH /admin/users/:id`
  (nothing else uses it once the inline select is gone).

## Backend

### Endpoints (all under `@Controller('admin/users')`, `AdminRoleGuard`)

| Method | Route | Purpose | Returns |
|---|---|---|---|
| `POST` | `/admin/users` | Create user | `UserSummaryDto` (201) |
| `PATCH` | `/admin/users/:id` | Edit name/email/role/password | `UserSummaryDto` |
| `DELETE` | `/admin/users/:id` | Delete one user | 204 |

`GET /`, `POST /bulk-delete`, `GET /export.csv` are unchanged.
**`PATCH /:id/role` is removed.**

### DTOs (`class-validator` + `@nestjs/swagger`, mirroring `RegisterDto` policy)

`RegisterDto` uses: email `@IsEmail` + `@Transform(trim().toLowerCase())`,
name `@MinLength(1) @MaxLength(80)`, password `@MinLength(8) @MaxLength(128)`.
Match it exactly.

```ts
// create-user.dto.ts
class CreateUserDto {
  @IsEmail() @Transform(({ value }) => value.trim().toLowerCase())  email!: string;
  @IsString() @MinLength(1) @MaxLength(80)   name!: string;
  @IsString() @MinLength(8) @MaxLength(128)  password!: string;
  @IsEnum(Role)                              role!: Role;   // USER | ADMIN
}

// update-user.dto.ts — all optional
class UpdateUserDto {
  @IsOptional() @IsEmail() @Transform(({ value }) => value?.trim().toLowerCase())  email?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80)   name?: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(128)  password?: string;
  @IsOptional() @IsEnum(Role)                             role?: Role;
}
```

### Service logic & invariants

`create({ name, email, password, role })`
- Email already normalized by the DTO `@Transform`; `bcrypt.hash(password, 10)`.
- Unique email → `409 EMAIL_TAKEN` (catch Prisma `P2002`).
- Return `{ id, email, name, role, createdAt }`.

`update({ adminId, userId, dto })`
- If `role` present and changes:
  - `adminId === userId && role !== ADMIN` → `400 SELF_DEMOTION_FORBIDDEN`.
  - Demoting an `ADMIN` who is the last admin → `403 LAST_ADMIN_FORBIDDEN`.
- If `email` present (already normalized by DTO): unique conflict → `409 EMAIL_TAKEN`.
- If `password` present: `bcrypt.hash`.
- **Revoke refresh tokens** (`refreshToken.deleteMany({ userId })`) when **role or
  password** changes, forcing re-login (extends the existing role-change behavior).
- `P2025` (no such user) → `404 NOT_FOUND`.
- Return updated `UserSummaryDto`.

`deleteOne({ adminId, userId })`
- `adminId === userId` → `403 SELF_DELETION_FORBIDDEN`.
- Target is the last admin → `403 LAST_ADMIN_FORBIDDEN`.
- `P2025` → `404 NOT_FOUND`.
- Reuses the guard checks already in `bulkDelete`; factor the shared
  last-admin/self checks so both paths stay consistent.

### Contract regen

After the controller/DTO changes: **`npm run gen:api`** (regenerates `openapi.json`
+ `frontend/src/api/schema.ts`).

## Frontend

### Table — `routes/dashboard/UsersTable/`

- Columns: **User** (avatar + name + email) · **Role** (read-only `Badge`) ·
  **Joined** · **Actions**.
- Actions: `Edit` (secondary) + `Delete` (danger), right-aligned, matching
  `AdminPollsTable`. `Delete` disabled when `isMe`.
- Props add `onEdit(user)` and `onDelete(user)`; remove the inline `<Select>` and
  the role-change wiring. `useUsersTable` collapses to `isMe` (and may be inlined).

### Route-driven modal (mirror `PollFormModal`)

- **Routes** (`router.tsx`), both `RequireAdmin`, element `UsersTab`:
  - `dashboard/all-users/new`
  - `dashboard/all-users/:id/edit`
- **Mount** in `DashboardShell.tsx` via `useMatch`:
  - `newUserMatch` → `<UserFormModal mode="create" />`
  - `editUserMatch` → `<UserFormModal mode="edit" id={...} />`
- **TopBar meta** (`useTopBarMeta.ts`): add branches for the two routes
  (title "New user" / "Edit user").
- **`UserFormModal`** under `layouts/DashboardShell/modals/UserFormModal/`:
  - Files: `UserFormModal.tsx`, `types.ts`, `index.ts`, `hooks/useUserFormModal.ts`.
  - Lifted-hook + `form="user-form"` footer-button pattern (per CLAUDE.md form-modal
    convention). Submit label "Create user" / "Save changes".
  - Edit mode resolves the user from the cached admin-users list (fallback: refetch);
    Suspense/ErrorBoundary wrapper like `PollFormModal`.
  - Fields: name, email, role (`Select`), password. In **create** password is
    required; in **edit** it's an optional "Set new password" field (blank = keep).
  - Role `Select` disabled when editing **self** (prevents self-demotion); show a hint.
  - `close()` navigates back to `/dashboard/all-users`.

### `UsersTab` — `routes/dashboard/UsersTab/`

- Header: add a **"New user"** button next to **Export CSV**, linking to
  `/dashboard/all-users/new`.
- Per-row `onEdit` → navigate `/dashboard/all-users/:id/edit`; per-row `onDelete`
  → open the existing `ConfirmDialog` for a single user, calling `useDeleteUser`.
- Keep the existing bulk-select banner + bulk `ConfirmDialog` unchanged.

### API hooks — `api/mutations/admin.ts`

- Add `useCreateUser`, `useUpdateUser`, `useDeleteUser` (each invalidates
  `['admin','users']`).
- **Remove `useChangeUserRole`** (replaced by `useUpdateUser`).
- `useBulkDeleteUsers` unchanged.
- Surface backend error `code`s (e.g. `EMAIL_TAKEN`, `LAST_ADMIN_FORBIDDEN`,
  `SELF_DEMOTION_FORBIDDEN`, `SELF_DELETION_FORBIDDEN`) via `toast`.

## Error handling

Backend throws typed errors with `code`; the frontend maps them to toast messages.
Modal stays open on error so the admin can correct input.

## Testing (deferred — code first, per project rule)

Follow-up after implementation:
- `users.service` specs: create (happy + `EMAIL_TAKEN`), update (role change revokes
  tokens, self-demotion, last-admin, email conflict, password hash), deleteOne
  (self, last-admin, not-found).
- Light frontend coverage of `UserFormModal` create/edit submit if time allows.

## Out of scope

- Pagination / search changes to the users list.
- Bulk edit.
- Email verification / invitation flow for created users.
