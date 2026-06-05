import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useCreateUser, useUpdateUser } from '../../../../api/mutations/admin';
import { useAuth } from '../../../../auth/useAuth';
import type { AdminUser } from '../../UsersTable/types';

type Role = AdminUser['role'];

export interface UserFormPageViewModel {
  name: string;
  email: string;
  role: Role;
  password: string;
  isEdit: boolean;
  roleDisabled: boolean;
  emailError: string | null;
  isSubmitting: boolean;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  setRole: (v: Role) => void;
  setPassword: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export function useUserFormPage(args: {
  mode: 'create' | 'edit';
  user?: AdminUser;
  onSuccess: () => void;
}): UserFormPageViewModel {
  const { mode, user, onSuccess } = args;
  const { user: me } = useAuth();
  const isEdit = mode === 'edit';

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<Role>(user?.role ?? 'USER');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const create = useCreateUser();
  const update = useUpdateUser(user?.id ?? '');

  const roleDisabled = isEdit && !!user && me?.id === user.id;

  const handleSetEmail = (v: string) => {
    setEmail(v);
    if (emailError) setEmailError(null);
  };

  const handleError = (err: any) => {
    if (err?.code === 'EMAIL_TAKEN') {
      setEmailError('Email is already in use');
      return;
    }
    const map: Record<string, string> = {
      LAST_ADMIN_FORBIDDEN: 'Cannot remove the last admin',
      SELF_DEMOTION_FORBIDDEN: 'You cannot demote yourself',
    };
    toast.error(map[err?.code] ?? (isEdit ? 'Could not update user' : 'Could not create user'));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    if (!isEdit) {
      create.mutate(
        { name, email, password, role },
        {
          onSuccess: () => {
            toast.success(`Created ${name}`);
            onSuccess();
          },
          onError: handleError,
        },
      );
      return;
    }

    update.mutate(
      {
        name,
        email,
        role,
        ...(password ? { password } : {}),
      },
      {
        onSuccess: () => {
          toast.success(`Updated ${name}`);
          onSuccess();
        },
        onError: handleError,
      },
    );
  };

  return {
    name,
    email,
    role,
    password,
    isEdit,
    roleDisabled,
    emailError,
    isSubmitting: create.isPending || update.isPending,
    setName,
    setEmail: handleSetEmail,
    setRole,
    setPassword,
    onSubmit,
  };
}
