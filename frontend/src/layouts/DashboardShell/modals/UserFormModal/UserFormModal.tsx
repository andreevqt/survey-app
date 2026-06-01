import { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../../components/primitives/Modal';
import { Button } from '../../../../components/primitives/Button';
import { Input } from '../../../../components/primitives/Input';
import { Field } from '../../../../components/primitives/Field';
import { Select } from '../../../../components/primitives/Select';
import { Spinner } from '../../../../components/primitives/Spinner';
import { ErrorBoundary, SectionError } from '../../../../components/feedback/ErrorBoundary';
import { useAdminUsersSuspense } from '../../../../api/queries/admin';
import { useUserFormModal } from './hooks/useUserFormModal';
import type { AdminUser } from '../../../../routes/dashboard/UsersTable/types';
import type { UserFormModalProps } from './types';

const FORM_ID = 'user-form';

export function UserFormModal({ mode, id }: UserFormModalProps) {
  const navigate = useNavigate();
  const close = () => navigate('/dashboard/all-users');
  const title = mode === 'edit' ? 'Edit user' : 'New user';

  if (mode === 'edit' && id) {
    return (
      <ErrorBoundary
        resetKeys={[id]}
        fallback={(p) => (
          <Modal open onClose={close} size="md" title={title}>
            <SectionError {...p} message="Could not load this user." />
          </Modal>
        )}
      >
        <Suspense
          fallback={
            <Modal open onClose={close} size="md" title={title}>
              <div className="flex justify-center py-16"><Spinner size={28} /></div>
            </Modal>
          }
        >
          <UserFormEditView id={id} title={title} onClose={close} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return <UserFormView title={title} mode="create" onClose={close} />;
}

function UserFormEditView({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  const { data } = useAdminUsersSuspense();
  const user = data.items.find((u: AdminUser) => u.id === id);
  if (!user) {
    return (
      <Modal open onClose={onClose} size="md" title={title}>
        <div className="p-6 text-sm text-gray-500">User not found.</div>
      </Modal>
    );
  }
  return <UserFormView title={title} mode="edit" user={user} onClose={onClose} />;
}

function UserFormView({
  title,
  mode,
  user,
  onClose,
}: {
  title: string;
  mode: 'create' | 'edit';
  user?: AdminUser;
  onClose: () => void;
}) {
  const vm = useUserFormModal({ mode, user, onSuccess: onClose });

  const footer = (
    <div className="flex flex-1 justify-end gap-3">
      <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
      <Button type="submit" form={FORM_ID} isLoading={vm.isSubmitting}>
        {vm.isEdit ? 'Save changes' : 'Create user'}
      </Button>
    </div>
  );

  return (
    <Modal open onClose={onClose} size="md" title={title} footer={footer}>
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
            minLength={vm.isEdit ? undefined : 8}
            required={!vm.isEdit}
          />
        </Field>
      </form>
    </Modal>
  );
}
