# Settings Modal Implementation Plan (Spec 3 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a routed Settings modal at `/dashboard/settings` with Profile (editable name + email, real), Password change (real), Sessions (real Sign out), and three visual-stub sections (Email notifications, Appearance, Danger zone). Avatar dropdown gains `Your profile` + `Settings` items above the existing Sign out.

**Architecture:** Backend adds two endpoints on the existing `AuthController` (`PATCH /auth/me`, `POST /auth/change-password`) backed by new `AuthService` methods. Frontend adds two mutation hooks in `auth-mutations.ts`, a new `SettingsModal` folder with one wrapper component and six section components, an updated `AvatarMenu`, one new route in `router.tsx`, and one new `useMatch` overlay in `DashboardShell`.

**Tech Stack:** NestJS 10 + Prisma + bcryptjs backend; React 19 + TS + react-hook-form + zod + TanStack Query + sonner frontend.

**Spec:** [docs/superpowers/specs/2026-05-28-settings-modal-design.md](../specs/2026-05-28-settings-modal-design.md)

---

## File map

**Backend create:**
- `backend/src/auth/dto/update-me.dto.ts`
- `backend/src/auth/dto/change-password.dto.ts`

**Backend modify:**
- `backend/src/auth/auth.controller.ts` — add 2 handlers
- `backend/src/auth/auth.service.ts` — add `updateMe`, `changePassword`

**Backend regenerate:** `openapi.json`, `frontend/src/api/schema.ts`

**Frontend create:**
- `frontend/src/layouts/DashboardShell/modals/SettingsModal/SettingsModal.tsx`
- `frontend/src/layouts/DashboardShell/modals/SettingsModal/index.ts`
- `frontend/src/layouts/DashboardShell/modals/SettingsModal/types.ts`
- `frontend/src/layouts/DashboardShell/modals/SettingsModal/sections/ProfileSection.tsx`
- `frontend/src/layouts/DashboardShell/modals/SettingsModal/sections/PasswordSection.tsx`
- `frontend/src/layouts/DashboardShell/modals/SettingsModal/sections/EmailNotificationsSection.tsx`
- `frontend/src/layouts/DashboardShell/modals/SettingsModal/sections/AppearanceSection.tsx`
- `frontend/src/layouts/DashboardShell/modals/SettingsModal/sections/SessionsSection.tsx`
- `frontend/src/layouts/DashboardShell/modals/SettingsModal/sections/DangerZoneSection.tsx`

**Frontend modify:**
- `frontend/src/auth/auth-mutations.ts` — add 2 new mutation hooks
- `frontend/src/layouts/DashboardShell/TopBar/AvatarMenu.tsx` — add Your profile + Settings link items + divider
- `frontend/src/layouts/DashboardShell/DashboardShell.tsx` — add `useMatch('/dashboard/settings')` + render `<SettingsModal />`
- `frontend/src/router.tsx` — add `settings` child route under `/dashboard`

---

## Task 1: Backend `PATCH /auth/me` + service method

**Files:**
- Create: `backend/src/auth/dto/update-me.dto.ts`
- Modify: `backend/src/auth/auth.service.ts`
- Modify: `backend/src/auth/auth.controller.ts`

- [ ] **Step 1: Create `UpdateMeDto`**

Write `backend/src/auth/dto/update-me.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Alice Example' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'alice@example.com' })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  email?: string;
}
```

(Mirrors `RegisterDto` pattern. Both fields optional; the service handles the no-op case where neither is provided.)

- [ ] **Step 2: Add `updateMe` to `AuthService`**

Read `backend/src/auth/auth.service.ts` first. Insert this method directly after `findUserById` (around line 81) and before `private findRefreshRow`:

```ts
  async updateMe(userId: string, dto: { name?: string; email?: string }) {
    const data: { name?: string; email?: string } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already registered' });
      }
      data.email = email;
    }
    if (Object.keys(data).length === 0) {
      return this.findUserById(userId);
    }
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
```

(Reuses `ConflictException` already imported at the top of the file.)

- [ ] **Step 3: Add `PATCH /auth/me` to `AuthController`**

Read `backend/src/auth/auth.controller.ts`. Insert this handler immediately after the existing `me()` handler (around line 68) and before `private setCookies`:

```ts
  @Patch('me')
  @ApiOkResponse({ type: AuthUserDto })
  async updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: UpdateMeDto,
  ): Promise<AuthUserDto> {
    return this.auth.updateMe(user.id, body);
  }
```

You'll need to add two imports at the top of the file:

```ts
// existing import line — add 'Patch':
import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';

// new import for the DTO:
import { UpdateMeDto } from './dto/update-me.dto';
```

(The class is already decorated with `@UseGuards(JwtAccessGuard)` at controller level, so `PATCH /auth/me` is gated by access-token auth automatically — no `@Public()` decorator.)

- [ ] **Step 4: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app && npm run check:ts
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add backend/src/auth/dto/update-me.dto.ts \
        backend/src/auth/auth.service.ts \
        backend/src/auth/auth.controller.ts && \
git commit -m "$(cat <<'EOF'
feat(backend): add PATCH /auth/me for profile updates

Authenticated endpoint updates the current user's name and/or email.
Returns AuthUserDto. Conflict on email collision with another user.
No tokens revoked.

Spec: docs/superpowers/specs/2026-05-28-settings-modal-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Backend `POST /auth/change-password` + service method + schema regen

**Files:**
- Create: `backend/src/auth/dto/change-password.dto.ts`
- Modify: `backend/src/auth/auth.service.ts`
- Modify: `backend/src/auth/auth.controller.ts`
- Regenerate: `openapi.json`, `frontend/src/api/schema.ts`

- [ ] **Step 1: Create `ChangePasswordDto`**

Write `backend/src/auth/dto/change-password.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
```

- [ ] **Step 2: Add `changePassword` to `AuthService`**

Insert into `backend/src/auth/auth.service.ts` directly after the `updateMe` method added in Task 1:

```ts
  async changePassword(userId: string, dto: { currentPassword: string; newPassword: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED' });
    }
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({ code: 'CURRENT_PASSWORD_INVALID', message: 'Current password is incorrect' });
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
```

(`UnauthorizedException` and `bcrypt` are already imported at the top of the file.)

- [ ] **Step 3: Add `POST /auth/change-password` to `AuthController`**

Insert this handler immediately after the `updateMe` handler from Task 1:

```ts
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: ChangePasswordDto,
  ): Promise<void> {
    await this.auth.changePassword(user.id, body);
  }
```

Add the import:

```ts
import { ChangePasswordDto } from './dto/change-password.dto';
```

- [ ] **Step 4: Regenerate OpenAPI schema**

From repo root:

```bash
cd /Users/andreevxdr/sources/survey-app && npm run gen:api
```

If `gen:api` fails locally on DATABASE_URL (it tries to run `spec:export` outside Docker), use the same workaround as previous specs:

```bash
docker compose exec backend npx ts-node -T src/spec-export.ts > /tmp/openapi.json
docker cp survey-app-backend-1:/tmp/openapi.json /Users/andreevxdr/sources/survey-app/openapi.json
cd /Users/andreevxdr/sources/survey-app && npx openapi-typescript ./openapi.json -o ./frontend/src/api/schema.ts
```

Verify both new paths landed:

```bash
grep '"/auth/me"\|"/auth/change-password"' /Users/andreevxdr/sources/survey-app/openapi.json /Users/andreevxdr/sources/survey-app/frontend/src/api/schema.ts | head -20
```

Expected: `/auth/me` matches twice (GET + PATCH on the same path in OpenAPI) and `/auth/change-password` matches once per file. The frontend `schema.ts` should now have `patch:` and `post:` keys under those paths respectively.

- [ ] **Step 5: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app && npm run check:ts
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add backend/src/auth/dto/change-password.dto.ts \
        backend/src/auth/auth.service.ts \
        backend/src/auth/auth.controller.ts \
        openapi.json \
        frontend/src/api/schema.ts && \
git commit -m "$(cat <<'EOF'
feat(backend): add POST /auth/change-password

Authenticated endpoint validates the current password (bcrypt
compare) and updates the user's password hash. Returns 204. Refresh
tokens are NOT revoked — other sessions remain valid. Returns 401
CURRENT_PASSWORD_INVALID when the current password doesn't match.

Spec: docs/superpowers/specs/2026-05-28-settings-modal-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Frontend `useUpdateMeMutation` + `useChangePasswordMutation`

**Files:**
- Modify: `frontend/src/auth/auth-mutations.ts`

- [ ] **Step 1: Append both hooks to `auth-mutations.ts`**

Read the file first to confirm existing imports. Then append at the END:

```ts
export function useUpdateMeMutation() {
  return useMutation({
    mutationFn: async (input: { name?: string; email?: string }) => {
      const r = await apiClient.PATCH('/auth/me', { body: input });
      if (!r.response.ok) throw r.error ?? new Error('Update failed');
      return (r.data as AuthUser);
    },
    onSuccess: (user) => setMeInCache(user),
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
      const r = await apiClient.POST('/auth/change-password', { body: input });
      if (!r.response.ok) throw r.error ?? new Error('Password change failed');
    },
  });
}
```

(Mirrors the existing `useLoginMutation` / `useRegisterMutation` shape: `apiClient.METHOD`, check `response.ok`, throw `r.error`. `useUpdateMeMutation` reuses `setMeInCache` so `useAuth()` immediately reflects the new name/email everywhere.)

- [ ] **Step 2: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/auth/auth-mutations.ts && \
git commit -m "$(cat <<'EOF'
feat(frontend): add useUpdateMeMutation + useChangePasswordMutation

useUpdateMeMutation updates the current user via PATCH /auth/me and
refreshes the me-cache so useAuth() reflects the new name/email
immediately. useChangePasswordMutation hits POST /auth/change-password
and returns 204; no cache invalidation needed.

Spec: docs/superpowers/specs/2026-05-28-settings-modal-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: SettingsModal scaffold + ProfileSection + PasswordSection (real sections)

**Files:**
- Create: `frontend/src/layouts/DashboardShell/modals/SettingsModal/types.ts`
- Create: `frontend/src/layouts/DashboardShell/modals/SettingsModal/sections/ProfileSection.tsx`
- Create: `frontend/src/layouts/DashboardShell/modals/SettingsModal/sections/PasswordSection.tsx`
- Create: `frontend/src/layouts/DashboardShell/modals/SettingsModal/SettingsModal.tsx`
- Create: `frontend/src/layouts/DashboardShell/modals/SettingsModal/index.ts`

- [ ] **Step 1: Create `types.ts`**

```ts
export interface SettingsModalProps {
  // Currently no external props; the modal reads everything from useAuth + mutations.
  // Empty record kept as a hook for future expansion (modal/edit context, etc.).
  _placeholder?: never;
}
```

(The eslint rule the project disallows empty interfaces, hence the never field. If the project's TS config doesn't trip on empty interfaces, an `export type SettingsModalProps = Record<PropertyKey, never>;` works too.)

- [ ] **Step 2: Create `ProfileSection.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '../../../../../components/primitives/Input';
import { Field } from '../../../../../components/primitives/Field';
import { Button } from '../../../../../components/primitives/Button';
import { Badge } from '../../../../../components/primitives/Badge';
import { Avatar } from '../../../../../components/primitives/Avatar';
import { useAuth } from '../../../../../auth/useAuth';
import { useUpdateMeMutation } from '../../../../../auth/auth-mutations';

export function ProfileSection() {
  const { user } = useAuth();
  const update = useUpdateMeMutation();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
  }, [user?.name, user?.email]);

  const onCancel = () => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setEmailError(null);
  };

  const onSave = async () => {
    setEmailError(null);
    try {
      await update.mutateAsync({
        name: name !== user?.name ? name : undefined,
        email: email !== user?.email ? email : undefined,
      });
      toast.success('Profile updated');
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 409) {
        setEmailError('Email is already in use');
      } else {
        toast.error('Could not update profile');
      }
    }
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900">Profile</h3>
      <p className="mt-1 text-sm text-gray-500">This information will be displayed publicly on polls you create.</p>
      <div className="mt-4 flex items-center gap-4">
        <Avatar name={name || '?'} size="lg" />
        <div>
          <p className="text-sm font-medium text-gray-900">{name || 'Untitled user'}</p>
          <p className="text-xs text-gray-500">{email}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>
        <Field label="Email" error={emailError ?? undefined}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Role</p>
          <div className="flex items-center gap-2">
            <Badge variant={user?.role === 'ADMIN' ? 'info' : 'default'}>{user?.role ?? 'USER'}</Badge>
            <span className="text-xs text-gray-500">Contact an admin to change your role.</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave} isLoading={update.isPending}>Save changes</Button>
      </div>
    </div>
  );
}
```

(Uses existing primitives. `Field` accepts an `error` prop that renders an inline message — already used by `PollForm`.)

- [ ] **Step 3: Create `PasswordSection.tsx`**

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '../../../../../components/primitives/Input';
import { Field } from '../../../../../components/primitives/Field';
import { Button } from '../../../../../components/primitives/Button';
import { useChangePasswordMutation } from '../../../../../auth/auth-mutations';

export function PasswordSection() {
  const change = useChangePasswordMutation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [lengthError, setLengthError] = useState<string | null>(null);

  const onUpdate = async () => {
    setCurrentError(null);
    setMatchError(null);
    setLengthError(null);
    if (newPassword.length < 8) {
      setLengthError('Use at least 8 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMatchError('Passwords do not match');
      return;
    }
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 401) {
        setCurrentError('Current password is incorrect');
      } else {
        toast.error('Could not update password');
      }
    }
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900">Password</h3>
      <p className="mt-1 text-sm text-gray-500">Update the password used to sign in.</p>
      <div className="mt-4 flex flex-col gap-4">
        <Field label="Current password" error={currentError ?? undefined}>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Field label="New password" error={lengthError ?? undefined}>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </Field>
        <Field label="Confirm new password" error={matchError ?? undefined}>
          <Input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="Re-enter new password"
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onUpdate} isLoading={change.isPending}>Update password</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `SettingsModal.tsx` (scaffold for now — stubs land next task)**

```tsx
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../../components/primitives/Modal';
import { ProfileSection } from './sections/ProfileSection';
import { PasswordSection } from './sections/PasswordSection';

export function SettingsModal() {
  const navigate = useNavigate();
  const close = () => navigate('/dashboard');

  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title="Settings"
      subtitle="Manage your account and preferences."
    >
      <div className="flex flex-col divide-y divide-gray-200">
        <div className="pb-6"><ProfileSection /></div>
        <div className="py-6"><PasswordSection /></div>
      </div>
    </Modal>
  );
}
```

(Stub sections added in Task 5.)

- [ ] **Step 5: Create `index.ts`**

```ts
export { SettingsModal } from './SettingsModal';
```

- [ ] **Step 6: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/layouts/DashboardShell/modals/SettingsModal && \
git commit -m "$(cat <<'EOF'
feat(frontend): SettingsModal scaffold + Profile/Password sections

Modal at xl size with Settings title. Profile section edits name and
email via useUpdateMeMutation (inline error on 409 EMAIL_TAKEN).
Password section edits current/new/confirm with client validation
plus inline error on 401 from useChangePasswordMutation. Stub
sections (email prefs, appearance, sessions, danger zone) land in
the next task; the modal is not yet routed.

Spec: docs/superpowers/specs/2026-05-28-settings-modal-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Stub sections + Sessions + Danger zone, compose into SettingsModal

**Files:**
- Create: `frontend/src/layouts/DashboardShell/modals/SettingsModal/sections/EmailNotificationsSection.tsx`
- Create: `frontend/src/layouts/DashboardShell/modals/SettingsModal/sections/AppearanceSection.tsx`
- Create: `frontend/src/layouts/DashboardShell/modals/SettingsModal/sections/SessionsSection.tsx`
- Create: `frontend/src/layouts/DashboardShell/modals/SettingsModal/sections/DangerZoneSection.tsx`
- Modify: `frontend/src/layouts/DashboardShell/modals/SettingsModal/SettingsModal.tsx`

- [ ] **Step 1: Create `EmailNotificationsSection.tsx` (stub)**

```tsx
export function EmailNotificationsSection() {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900">Email notifications</h3>
      <p className="mt-1 text-sm text-gray-500">Choose which emails you want to receive from Polls.</p>
      <ul className="mt-4 flex flex-col gap-3">
        <li className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">New responses</p>
            <p className="text-xs text-gray-500">Get an email whenever someone submits a response to one of your polls.</p>
          </div>
          <input type="checkbox" disabled className="accent-indigo-600 mt-1" aria-label="New responses (coming soon)" />
        </li>
        <li className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Weekly summary</p>
            <p className="text-xs text-gray-500">A weekly digest of activity across your polls every Monday.</p>
          </div>
          <input type="checkbox" disabled className="accent-indigo-600 mt-1" aria-label="Weekly summary (coming soon)" />
        </li>
        <li className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Product updates</p>
            <p className="text-xs text-gray-500">Occasional news about new features and tips.</p>
          </div>
          <input type="checkbox" disabled className="accent-indigo-600 mt-1" aria-label="Product updates (coming soon)" />
        </li>
      </ul>
      <p className="mt-4 text-xs text-gray-400 italic">Email notifications — coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `AppearanceSection.tsx` (stub)**

```tsx
export function AppearanceSection() {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900">Appearance</h3>
      <p className="mt-1 text-sm text-gray-500">Change how Polls looks on this device.</p>
      <div className="mt-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {(['Light', 'Dark', 'System'] as const).map((label) => (
            <button
              key={label}
              type="button"
              disabled
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-400 italic">Theme switching — coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 3: Create `SessionsSection.tsx` (real)**

```tsx
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../../components/primitives/Button';
import { useLogoutMutation } from '../../../../../auth/auth-mutations';

export function SessionsSection() {
  const navigate = useNavigate();
  const logout = useLogoutMutation();

  const onSignOut = () =>
    logout.mutate(undefined, { onSuccess: () => navigate('/') });

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900">Sessions</h3>
      <p className="mt-1 text-sm text-gray-500">You are signed in on this device.</p>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Sign out of this session</p>
          <p className="text-xs text-gray-500">You will need to log in again to access your polls.</p>
        </div>
        <Button variant="secondary" onClick={onSignOut} isLoading={logout.isPending}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `DangerZoneSection.tsx` (stub with ConfirmDialog)**

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../../../../components/primitives/Button';
import { ConfirmDialog } from '../../../../../components/primitives/ConfirmDialog';
import { useAuth } from '../../../../../auth/useAuth';

export function DangerZoneSection() {
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);

  const onConfirm = () => {
    setConfirming(false);
    toast.message('Account deletion — coming soon');
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-red-700">Danger zone</h3>
      <p className="mt-1 text-sm text-gray-500">Irreversible actions. Please be certain.</p>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Delete account</p>
          <p className="text-xs text-gray-500">
            Permanently delete your account along with all of your polls and responses. This cannot be undone.
          </p>
        </div>
        <Button variant="danger" onClick={() => setConfirming(true)}>Delete account</Button>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Delete your account?"
          body={`This will permanently erase ${user?.name ?? 'your account'} and all associated polls, questions and responses. This action cannot be undone.`}
          confirmLabel="Delete account"
          onCancel={() => setConfirming(false)}
          onConfirm={onConfirm}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Update `SettingsModal.tsx` to compose all 6 sections**

Replace `frontend/src/layouts/DashboardShell/modals/SettingsModal/SettingsModal.tsx` with:

```tsx
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../../components/primitives/Modal';
import { ProfileSection } from './sections/ProfileSection';
import { PasswordSection } from './sections/PasswordSection';
import { EmailNotificationsSection } from './sections/EmailNotificationsSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { SessionsSection } from './sections/SessionsSection';
import { DangerZoneSection } from './sections/DangerZoneSection';

export function SettingsModal() {
  const navigate = useNavigate();
  const close = () => navigate('/dashboard');

  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title="Settings"
      subtitle="Manage your account and preferences."
    >
      <div className="flex flex-col divide-y divide-gray-200">
        <div className="pb-6"><ProfileSection /></div>
        <div className="py-6"><PasswordSection /></div>
        <div className="py-6"><EmailNotificationsSection /></div>
        <div className="py-6"><AppearanceSection /></div>
        <div className="py-6"><SessionsSection /></div>
        <div className="py-6"><DangerZoneSection /></div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 6: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/layouts/DashboardShell/modals/SettingsModal && \
git commit -m "$(cat <<'EOF'
feat(frontend): add stub sections + compose SettingsModal

EmailNotificationsSection, AppearanceSection, DangerZoneSection are
visual stubs (disabled controls with "coming soon" hints). The
DangerZoneSection's Delete account button opens a ConfirmDialog;
confirming shows a toast and dismisses. SessionsSection has a real
Sign out button calling useLogoutMutation. SettingsModal composes
all six sections with divider rows.

Spec: docs/superpowers/specs/2026-05-28-settings-modal-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wire up — AvatarMenu update + route + DashboardShell overlay

**Files:**
- Modify: `frontend/src/layouts/DashboardShell/TopBar/AvatarMenu.tsx`
- Modify: `frontend/src/layouts/DashboardShell/DashboardShell.tsx`
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: Update `AvatarMenu.tsx` — add Your profile + Settings link items**

Read `frontend/src/layouts/DashboardShell/TopBar/AvatarMenu.tsx` first. Replace its full contents with:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../../../components/primitives/Avatar';
import { useAuth } from '../../../auth/useAuth';
import { useLogoutMutation } from '../../../auth/auth-mutations';

export function AvatarMenu() {
  const { user } = useAuth();
  const logout = useLogoutMutation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignOut = () => {
    setOpen(false);
    logout.mutate(undefined, { onSuccess: () => navigate('/') });
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Account';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 ml-1 pl-1 pr-2.5 py-1 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <Avatar name={user?.name ?? '?'} size="sm" />
        <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">{firstName}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" className="text-gray-400" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-md bg-white border border-gray-200 shadow-lg py-1 z-20"
        >
          <li role="menuitem">
            <Link
              to="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Your profile
            </Link>
          </li>
          <li role="menuitem">
            <Link
              to="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Settings
            </Link>
          </li>
          <li role="separator" aria-hidden="true" className="my-1 border-t border-gray-100" />
          <li role="menuitem">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Sign out
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
```

Diffs vs. previous version:
- New `Link` import.
- Two `Link` menuitem rows above Sign out, both targeting `/dashboard/settings`. Each closes the menu on click.
- New `role="separator"` row between the link items and Sign out.

- [ ] **Step 2: Update `DashboardShell.tsx` — render Settings modal on match**

Read the current file. Replace its full contents with:

```tsx
import { Outlet, useMatch } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SidebarSearchProvider } from './SidebarSearchContext';
import { PollFormModal } from './modals/PollFormModal';
import { AnalyticsModal } from './modals/AnalyticsModal';
import { SettingsModal } from './modals/SettingsModal';

export function DashboardShell() {
  const newMatch = useMatch('/dashboard/polls/new');
  const editMatch = useMatch('/dashboard/polls/:id/edit');
  const analyticsMatch = useMatch('/dashboard/polls/:id/analytics');
  const adminEditMatch = useMatch('/dashboard/all-polls/:id/edit');
  const adminAnalyticsMatch = useMatch('/dashboard/all-polls/:id/analytics');
  const settingsMatch = useMatch('/dashboard/settings');

  return (
    <SidebarSearchProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 px-8 py-7 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
      {newMatch && <PollFormModal mode="create" />}
      {editMatch && <PollFormModal mode="edit" id={editMatch.params.id!} />}
      {analyticsMatch && <AnalyticsModal id={analyticsMatch.params.id!} />}
      {adminEditMatch && <PollFormModal mode="edit" context="admin" id={adminEditMatch.params.id!} />}
      {adminAnalyticsMatch && <AnalyticsModal id={adminAnalyticsMatch.params.id!} context="admin" />}
      {settingsMatch && <SettingsModal />}
    </SidebarSearchProvider>
  );
}
```

Diffs vs. previous version: added `SettingsModal` import, a new `settingsMatch` line, and the conditional `{settingsMatch && <SettingsModal />}` overlay.

- [ ] **Step 3: Update `router.tsx` — add `settings` child route under `/dashboard`**

Read the file. In the `/dashboard` route's `children` array, add a new entry. The final children list should look like:

```tsx
    children: [
      { index: true, element: <MyPollsTab /> },
      { path: 'all-users', element: <RequireAdmin><UsersTab /></RequireAdmin> },
      { path: 'all-polls', element: <RequireAdmin><AllPollsTab /></RequireAdmin> },
      { path: 'polls/new', element: <MyPollsTab /> },
      { path: 'polls/:id/edit', element: <MyPollsTab /> },
      { path: 'polls/:id/analytics', element: <MyPollsTab /> },
      { path: 'all-polls/:id/edit', element: <RequireAdmin><AllPollsTab /></RequireAdmin> },
      { path: 'all-polls/:id/analytics', element: <RequireAdmin><AllPollsTab /></RequireAdmin> },
      { path: 'settings', element: <MyPollsTab /> },
    ],
```

(Element is `<MyPollsTab />` — the background. The modal overlay is rendered by `DashboardShell`. The parent route already wraps with `<RequireAuth>` so unauth users are redirected.)

- [ ] **Step 4: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/layouts/DashboardShell/TopBar/AvatarMenu.tsx \
        frontend/src/layouts/DashboardShell/DashboardShell.tsx \
        frontend/src/router.tsx && \
git commit -m "$(cat <<'EOF'
feat(frontend): wire Settings modal — avatar menu + route + overlay

AvatarMenu gains Your profile and Settings Link items above a
separator and the Sign out button. DashboardShell matches
/dashboard/settings via useMatch and renders SettingsModal on top
of the My polls background. router.tsx adds the new settings child
route under /dashboard.

Spec: docs/superpowers/specs/2026-05-28-settings-modal-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:**
  - PATCH /auth/me + DTO + service → Task 1.
  - POST /auth/change-password + DTO + service → Task 2.
  - Schema regen → Task 2 Step 4.
  - useUpdateMeMutation + useChangePasswordMutation → Task 3.
  - SettingsModal + ProfileSection + PasswordSection → Task 4.
  - 4 remaining sections (Email/Appearance/Sessions/Danger) → Task 5.
  - AvatarMenu items + divider → Task 6 Step 1.
  - /dashboard/settings route → Task 6 Step 3.
  - useMatch overlay in DashboardShell → Task 6 Step 2.

- **Placeholder scan:** No "TBD", "add appropriate error handling", or "similar to Task N". All sections have complete code blocks.

- **Type consistency:**
  - `useUpdateMeMutation` input `{ name?, email? }` matches `PATCH /auth/me` body shape and `UpdateMeDto`.
  - `useChangePasswordMutation` input `{ currentPassword, newPassword }` matches `ChangePasswordDto`.
  - Inline error mapping: `useUpdateMeMutation` errors on 409 → email field; `useChangePasswordMutation` errors on 401 → current-password field. Both check `err.status ?? err.response.status` since openapi-fetch's error shape varies.
  - `AuthUser` type re-used from `auth/AuthProvider` (same import the existing mutations use).

- **Error-shape risk:** The plan's error mapping (`err?.status ?? err?.response?.status`) is a defensive guess at openapi-fetch's thrown error shape. If during implementation the actual thrown shape differs, the implementer should `console.log(err)` in the catch once, inspect, and adjust the field path. The user-visible behavior (inline error vs toast) is what matters, not the exact property chain.

- **Avatar dropdown UX:** Clicking either `Your profile` or `Settings` navigates to the same modal route. This is intentional per the spec — both items deep-link to the Settings modal. The design has both items present, so we render both even though they're equivalent. A future spec could split them into different modal tabs.

- **Modal section divider:** Using `divide-y divide-gray-200` on the flex column with `py-6` per section gives clean hairline separators matching the design's `SettingsSection` borders.
