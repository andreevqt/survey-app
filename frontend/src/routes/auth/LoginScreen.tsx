import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthCard } from './AuthCard';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { Field } from '../../components/primitives/Field';
import { useLoginMutation } from '../../auth/auth-mutations';
import { loginSchema, LoginFormValues } from '../../forms/schemas/login.schema';

export function LoginScreen() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
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

  return (
    <AuthCard title="Sign in" subtitle="Enter your email and password.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="login-email" error={errors.email?.message}>
          <Input id="login-email" type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="login-pw" error={errors.password?.message}>
          <Input id="login-pw" type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" isLoading={login.isPending}>Sign in</Button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        New here? <Link to="/register" className="text-indigo-600 hover:underline">Create an account</Link>
      </p>
    </AuthCard>
  );
}
