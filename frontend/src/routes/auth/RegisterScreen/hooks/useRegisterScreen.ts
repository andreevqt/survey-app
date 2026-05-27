import { BaseSyntheticEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useRegisterMutation } from '../../../../auth/auth-mutations';
import { registerSchema, RegisterFormValues } from '../../../../forms/schemas/register.schema';

export function useRegisterScreen() {
  const {
    register: registerInput,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const reg = useRegisterMutation();
  const navigate = useNavigate();

  const onSubmit = handleSubmit(async (values) => {
    try {
      await reg.mutateAsync(values);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { code?: string };
      if (apiErr?.code === 'EMAIL_TAKEN') toast.error('That email is already registered.');
      else toast.error('Could not create your account.');
    }
  });

  return {
    registerInput,
    errors,
    isPending: reg.isPending,
    onSubmit: onSubmit as (e?: BaseSyntheticEvent) => void,
  };
}
