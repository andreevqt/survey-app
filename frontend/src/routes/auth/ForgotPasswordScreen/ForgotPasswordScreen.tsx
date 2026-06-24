import { BaseSyntheticEvent, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { AuthSplit } from '../AuthSplit';
import { AuthFormCard } from '../AuthFormCard';
import { Button } from '../../../components/primitives/Button';
import { Input } from '../../../components/primitives/Input';
import { Field } from '../../../components/primitives/Field';
import { forgotPasswordSchema, ForgotPasswordValues } from '../../../forms/schemas/forgot-password.schema';
import { useForgotPasswordMutation } from '../../../auth/auth-mutations';

export function ForgotPasswordScreen() {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });
  const forgot = useForgotPasswordMutation();
  const [sent, setSent] = useState(false);
  const onSubmit = handleSubmit(async (values) => {
    await forgot.mutateAsync(values);
    setSent(true);
  }) as (e?: BaseSyntheticEvent) => void;

  return (
    <AuthSplit side={<h1 className="font-bold text-gray-900" style={{ fontSize: 'clamp(36px,5vw,56px)' }}>Reset it.</h1>}>
      <AuthFormCard>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Forgot password</h2>
        {sent ? (
          <p className="mt-2 text-sm text-gray-600">If that email is registered, a reset link is on its way.</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <Field label="Email" htmlFor="fp-email" error={errors.email?.message}>
              <Input id="fp-email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
            </Field>
            <Button type="submit" size="lg" isLoading={forgot.isPending} className="w-full">Send reset link</Button>
          </form>
        )}
        <p className="mt-5 text-center text-sm text-gray-600">
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">Back to sign in</Link>
        </p>
      </AuthFormCard>
    </AuthSplit>
  );
}
