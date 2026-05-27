import { BaseSyntheticEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLoginMutation } from '../../../../auth/auth-mutations';
import { loginSchema, LoginFormValues } from '../../../../forms/schemas/login.schema';

export function useLoginScreen() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const login = useLoginMutation();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      navigate(location.state?.from ?? '/dashboard', { replace: true });
    } catch {
      toast.error('Invalid email or password');
    }
  });

  const onForgotClick = () => {
    toast.info('Password reset is not implemented yet.');
  };

  return {
    register,
    errors,
    isPending: login.isPending,
    onSubmit: onSubmit as (e?: BaseSyntheticEvent) => void,
    onForgotClick,
  };
}
