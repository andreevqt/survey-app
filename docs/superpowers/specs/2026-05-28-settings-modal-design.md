# Settings modal — design (Spec 3 of 3)

**Date:** 2026-05-28
**Scope:** Backend (2 new endpoints) + frontend (new `SettingsModal` with 6 sections, new avatar menu items, new route, schema regen).
**Decomposition:** Final spec in the 3-spec dashboard-alignment sequence. Spec 1 landed the shell, Spec 2 the table + modals + search, Spec 2-follow-up the admin polls mutations. Spec 3 wires up the avatar dropdown's `Your profile` / `Settings` items to a routed Settings modal that lets the user edit profile + password.

## Problem

The avatar dropdown in the top bar (added in Spec 1) currently has only `Sign out`. The canonical design ([`design/Polls App.html`](../../../design/Polls%20App.html) line 2489 `SettingsModal` + line 2364 `SettingsScreen`) shows a richer dropdown — `Your profile` / `Settings` / `Sign out` — and a settings modal with sections for Profile, Password, Email notifications, Appearance, Sessions, and a Danger zone. The backend has `GET /auth/me` but no endpoint to update the user, so the modal can't be fully implemented today.

## Goal

Land a routed Settings modal at `/dashboard/settings` that:
- Supports real edits to **Profile** (name + email) via a new `PATCH /api/v1/auth/me` endpoint.
- Supports real **password change** via a new `POST /api/v1/auth/change-password` endpoint.
- Provides a real **Sign out** action in the Sessions section (uses the existing logout mutation).
- Renders **Email notifications**, **Appearance**, and **Danger zone** sections as visual stubs (disabled inputs / "coming soon" hints) matching the design's layout.

## Non-goals (deferred)

- Email notification persistence (no backend support; toggles render disabled).
- Theme persistence (Light/Dark/System buttons render disabled).
- Account deletion (Danger zone shows a button → toast "coming soon").
- Avatar upload (design has buttons but no backend for image storage; not rendered).
- Forgot-password flow.
- Revoking refresh tokens after password change — user's other tabs stay logged in. Documented as intentional Spec 3 scope; can be revisited later.

## Design

### Routing

New child route under `/dashboard`:
- `/dashboard/settings` — element `<MyPollsTab />` (the same background-tab pattern used by `PollFormModal` and `AnalyticsModal`). `DashboardShell.tsx` adds a `useMatch('/dashboard/settings')` check and renders `<SettingsModal />` as an overlay.

Modal close → `navigate('/dashboard')`. No admin/owner context split for Settings (the user always edits their own account, regardless of role).

### Avatar menu (`AvatarMenu.tsx`) update

Replace the single `Sign out` item with three:

1. **Your profile** — `<Link to="/dashboard/settings">`.
2. **Settings** — `<Link to="/dashboard/settings">` (same target; the design shows both, both deep-link to the same modal — pragmatic and matches the design).
3. **Sign out** — button calling `useLogoutMutation` (existing behavior preserved).

A thin divider sits between the two link items and the Sign out item to match the design (`role="separator"`).

### Backend

#### `PATCH /api/v1/auth/me`

- Authenticated route. Lives in `backend/src/auth/auth.controller.ts` next to existing `GET /auth/me`.
- DTO `UpdateMeDto` in `backend/src/auth/dto/update-me.dto.ts`:
  - `name?: string` (1–80 chars)
  - `email?: string` (valid email)
  - Both optional. If both omitted, returns current user unchanged.
- Service method `AuthService.updateMe(userId, dto)`:
  - Look up user by id.
  - If `email` provided AND different from current, check uniqueness with `prisma.user.findUnique({ where: { email } })`. If taken → `ConflictException({ code: 'EMAIL_TAKEN', message: '...' })`.
  - `prisma.user.update({ where: { id }, data: { name?, email? } })`.
  - Return `AuthUserDto` (existing DTO at `backend/src/auth/dto/auth-response.dto.ts`) — `{ id, email, name, role }`.
- Response: `200 AuthUserDto`.

#### `POST /api/v1/auth/change-password`

- Authenticated route.
- DTO `ChangePasswordDto`:
  - `currentPassword: string` (min 1)
  - `newPassword: string` (min 8)
- Service method `AuthService.changePassword(userId, dto)`:
  - Load user; verify `bcrypt.compare(currentPassword, user.passwordHash)`. If no match → `UnauthorizedException({ code: 'CURRENT_PASSWORD_INVALID' })`.
  - Hash new: `bcrypt.hash(newPassword, 10)` (matches existing register cost).
  - `prisma.user.update({ where: { id }, data: { passwordHash } })`.
  - No token revocation. Return `200 { ok: true }` or `204`.

### Frontend mutations

Add to `frontend/src/auth/auth-mutations.ts`:

- **`useUpdateMeMutation()`** — calls `PATCH /auth/me`. On success: invalidate the `me` query (so `useAuth()` re-reads the new name/email). Match the existing mutation pattern.
- **`useChangePasswordMutation()`** — calls `POST /auth/change-password`. No cache invalidation.

(Note: file name is `auth-mutations.ts`, not the typical `api/mutations/auth.ts`. The mutations sit in the `auth/` folder. Don't refactor — match the existing pattern.)

### Frontend modal — `SettingsModal`

Folder `frontend/src/layouts/DashboardShell/modals/SettingsModal/`:

```
SettingsModal/
  SettingsModal.tsx              — Modal shell + section composition
  index.ts                       — barrel
  types.ts                       — SettingsModalProps (empty for now)
  hooks/useSettingsModal.ts      — minimal helper for close-nav (or inline)
  sections/
    ProfileSection.tsx           — editable name+email form (real)
    PasswordSection.tsx          — current+new+confirm form (real)
    EmailNotificationsSection.tsx — 3 disabled toggles (stub)
    AppearanceSection.tsx        — 3 disabled theme buttons (stub)
    SessionsSection.tsx          — Sign out button (real)
    DangerZoneSection.tsx        — Delete account button → toast "coming soon" (stub)
```

The outer modal uses the existing `Modal` primitive at `size="xl"`. Title: `Settings`. Subtitle: `Manage your account and preferences.`. No footer — each section has its own action buttons inline.

Sections are visually separated by `<hr className="border-gray-200">` or similar. Each section has a header row (title + short subtitle) and a body. The component file structure mirrors the design's `SettingsSection` + `SettingsRow` helpers but doesn't introduce them as primitives — keep simple per-section components.

### Section details

#### Profile (real)

- `useAuth()` provides initial `user.name`, `user.email`, `user.role`.
- RHF form with zod schema (`name: string().min(1).max(80)`, `email: string().email()`).
- Avatar preview (uses existing `<Avatar name={name} size="lg">`).
- Save button → calls `useUpdateMeMutation`. On success: toast "Profile updated". On 409 EMAIL_TAKEN: inline error on the email field.
- Cancel button resets the form to current values.
- Role shown as `<Badge variant={role === 'ADMIN' ? 'info' : 'default'}>` with "Contact an admin to change your role." muted hint.

#### Password (real)

- RHF form with zod (`currentPassword: string().min(1)`, `newPassword: string().min(8)`, `confirmNewPassword: string()`, plus a refinement that `newPassword === confirmNewPassword`).
- Three `<Input type="password">` fields.
- Update button → calls `useChangePasswordMutation`. On success: clear fields + toast "Password updated". On 401 CURRENT_PASSWORD_INVALID: inline error on current-password field.

#### Email notifications (stub)

- Three disabled `<input type="checkbox">` rows (or styled toggle component if available — likely just `<input type="checkbox" disabled className="accent-indigo-600">`).
- Each row: title + body text + the disabled checkbox.
- Section-level muted footer: "Email notifications coming soon."

#### Appearance (stub)

- Theme label + 3 disabled buttons (Light / Dark / System) in a row.
- Section-level muted footer: "Theme switching coming soon."

#### Sessions (real)

- One row: "Sign out of this session" / body text / Sign out button (variant="secondary") → calls `useLogoutMutation`. On success: navigate to `/`.

#### Danger zone (stub)

- Header in red.
- One row: "Delete account" with body, button variant="danger".
- Click → `<ConfirmDialog>` "Delete your account?" with explanatory body.
- Confirm → `toast.message('Account deletion coming soon')` + close dialog (no actual delete).

### Components affected (summary)

**Backend create:**
- `backend/src/auth/dto/update-me.dto.ts`
- `backend/src/auth/dto/change-password.dto.ts`

**Backend modify:**
- `backend/src/auth/auth.controller.ts` — add 2 new routes.
- `backend/src/auth/auth.service.ts` — add `updateMe`, `changePassword`.

**Backend regenerate:** `openapi.json`, `frontend/src/api/schema.ts`.

**Frontend create:**
- `frontend/src/layouts/DashboardShell/modals/SettingsModal/` (all files listed above).

**Frontend modify:**
- `frontend/src/auth/auth-mutations.ts` — add `useUpdateMeMutation`, `useChangePasswordMutation`.
- `frontend/src/layouts/DashboardShell/TopBar/AvatarMenu.tsx` — add Your profile + Settings links above Sign out, divider between.
- `frontend/src/layouts/DashboardShell/DashboardShell.tsx` — add `useMatch('/dashboard/settings')` + render `<SettingsModal />`.
- `frontend/src/router.tsx` — add `settings` child route under `/dashboard`, element `<MyPollsTab />`.

### Verification

After implementation, on a local dev server:

1. Click the avatar in the top bar → dropdown shows three items: Your profile, Settings, Sign out.
2. Click "Settings" → URL `/dashboard/settings`, modal opens with all 6 sections visible. Profile section pre-filled with current user's name + email + role badge.
3. Change name → click Save → toast "Profile updated". Header avatar name updates if name displayed.
4. Try to change email to one already used → inline error "Email already taken".
5. Change password with correct current → toast "Password updated"; fields clear.
6. Wrong current password → inline error on current-password field.
7. Click Sign out in the modal's Sessions section → logged out, redirected to `/`.
8. Click Delete account → ConfirmDialog → confirm → toast "Account deletion coming soon"; nothing deleted.
9. `npm run check:ts` clean.
10. Deep-link `/dashboard/settings` while logged out → `RequireAuth` redirects to `/login`.

### Risks

- **`auth-mutations.ts` placement.** Existing mutations sit in `frontend/src/auth/`, not `api/mutations/`. The plan must place new hooks there for consistency.
- **`Modal` size + section count.** Six sections in one xl-modal will be tall. The modal already has `overflow-y-auto` on the body. Confirm during smoke that scrolling works.
- **Email change forcing re-login.** This spec does NOT invalidate refresh tokens. If the user changes email and the new email is used for login, the existing session still works. Spec intent: profile edit ≠ re-auth.
- **Server-error mapping.** `useUpdateMeMutation` and `useChangePasswordMutation` must surface the backend error `code` to the section's inline error UI (not just a generic toast). Each section reads `mutation.error?.response?.status` (or a parsed error code) to decide where to render the message.
