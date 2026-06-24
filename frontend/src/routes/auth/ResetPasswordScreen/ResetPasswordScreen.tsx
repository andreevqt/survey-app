import { BaseSyntheticEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthSplit } from '../AuthSplit';
import { AuthFormCard } from '../AuthFormCard';
import { Button } from '../../../components/primitives/Button';
import { Input } from '../../../components/primitives/Input';
import { Field } from '../../../components/primitives/Field';
import { resetPasswordSchema, ResetPasswordValues } from '../../../forms/schemas/reset-password.schema';
import { useResetPasswordMutation } from '../../../auth/auth-mutations';

export function ResetPasswordScreen() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const reset = useResetPasswordMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });
  const onSubmit = handleSubmit(async (values) => {
    try {
      await reset.mutateAsync({ token, newPassword: values.password });
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      toast.error(code === 'TOKEN_EXPIRED' ? 'This link has expired.' : 'This link is invalid.');
    }
  }) as (e?: BaseSyntheticEvent) => void;

  return (
    <AuthSplit side={<h1 className="font-bold text-gray-900" style={{ fontSize: 'clamp(36px,5vw,56px)' }}>New password.</h1>}>
      <AuthFormCard>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Set a new password</h2>
        {!token ? (
          <p className="mt-2 text-sm text-red-600">Missing token.</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <Field label="New password" htmlFor="rp-pw" error={errors.password?.message}>
              <Input id="rp-pw" type="password" autoComplete="new-password" placeholder="At least 8 characters" {...register('password')} />
            </Field>
            <Field label="Confirm password" htmlFor="rp-confirm" error={errors.confirm?.message}>
              <Input id="rp-confirm" type="password" autoComplete="new-password" placeholder="Repeat password" {...register('confirm')} />
            </Field>
            <Button type="submit" size="lg" isLoading={reset.isPending} className="w-full">Update password</Button>
          </form>
        )}
        <p className="mt-5 text-center text-sm text-gray-600">
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">Back to sign in</Link>
        </p>
      </AuthFormCard>
    </AuthSplit>
  );
}
