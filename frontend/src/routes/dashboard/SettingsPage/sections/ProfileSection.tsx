import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '../../../../components/primitives/Input';
import { Field } from '../../../../components/primitives/Field';
import { Button } from '../../../../components/primitives/Button';
import { Badge } from '../../../../components/primitives/Badge';
import { Avatar } from '../../../../components/primitives/Avatar';
import { useAuth } from '../../../../auth/useAuth';
import { useUpdateMeMutation } from '../../../../auth/auth-mutations';

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
