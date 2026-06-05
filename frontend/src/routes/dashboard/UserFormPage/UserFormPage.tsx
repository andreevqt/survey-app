import { Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../../components/primitives/Card';
import { Button } from '../../../components/primitives/Button';
import { Input } from '../../../components/primitives/Input';
import { Field } from '../../../components/primitives/Field';
import { Select } from '../../../components/primitives/Select';
import { SectionSpinner } from '../../../components/feedback/SectionSpinner';
import { ErrorBoundary, SectionError } from '../../../components/feedback/ErrorBoundary';
import { useAdminUsersSuspense } from '../../../api/queries/admin';
import { useUserFormPage } from './hooks/useUserFormPage';
import type { AdminUser } from '../UsersTable/types';
import type { UserFormPageProps } from './types';

const FORM_ID = 'user-form';

export function UserFormPage({ mode }: UserFormPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const close = () => navigate('/dashboard/all-users');

  if (mode === 'edit' && id) {
    return (
      <div className="mt-8 px-8">
        <ErrorBoundary
          resetKeys={[id]}
          fallback={(p) => (
            <Card className="max-w-xl mx-auto">
              <SectionError {...p} message="Could not load this user." />
            </Card>
          )}
        >
          <Suspense fallback={<SectionSpinner />}>
            <UserFormEditView id={id} onClose={close} />
          </Suspense>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="mt-8 px-8">
      <UserFormView mode="create" onClose={close} />
    </div>
  );
}

function UserFormEditView({ id, onClose }: { id: string; onClose: () => void }) {
  // Resolve the target from the page-1 admin-users cache — the same query the
  // UsersTab table renders. Edit is always launched from a visible row, so the
  // user is present. A manual deep-link to a user beyond page 1 falls through to
  // the "User not found" branch below (acceptable until the list is paginated).
  const { data } = useAdminUsersSuspense();
  const user = data.items.find((u: AdminUser) => u.id === id);
  if (!user) {
    return <Card className="max-w-xl mx-auto"><div className="text-sm text-gray-500">User not found.</div></Card>;
  }
  return <UserFormView mode="edit" user={user} onClose={onClose} />;
}

function UserFormView({
  mode,
  user,
  onClose,
}: {
  mode: 'create' | 'edit';
  user?: AdminUser;
  onClose: () => void;
}) {
  const vm = useUserFormPage({ mode, user, onSuccess: onClose });

  return (
    <Card className="max-w-xl mx-auto">
      <form id={FORM_ID} onSubmit={vm.onSubmit} className="flex flex-col gap-4">
        <Field label="Full name">
          <Input value={vm.name} onChange={(e) => vm.setName(e.target.value)} maxLength={80} required />
        </Field>
        <Field label="Email" error={vm.emailError ?? undefined}>
          <Input type="email" value={vm.email} onChange={(e) => vm.setEmail(e.target.value)} required />
        </Field>
        <Field label="Role">
          <Select
            value={vm.role}
            disabled={vm.roleDisabled}
            onChange={(v) => vm.setRole(v as AdminUser['role'])}
            options={[
              { value: 'USER', label: 'USER' },
              { value: 'ADMIN', label: 'ADMIN' },
            ]}
          />
        </Field>
        {vm.roleDisabled && (
          <p className="-mt-2 text-xs text-gray-500">You cannot change your own role.</p>
        )}
        <Field label={vm.isEdit ? 'Set new password' : 'Password'}>
          <Input
            type="password"
            value={vm.password}
            onChange={(e) => vm.setPassword(e.target.value)}
            placeholder={vm.isEdit ? 'Leave blank to keep current' : 'At least 8 characters'}
            minLength={!vm.isEdit || vm.password.length > 0 ? 8 : undefined}
            required={!vm.isEdit}
          />
        </Field>
      </form>
      <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-5">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" form={FORM_ID} isLoading={vm.isSubmitting}>
          {vm.isEdit ? 'Save changes' : 'Create user'}
        </Button>
      </div>
    </Card>
  );
}
