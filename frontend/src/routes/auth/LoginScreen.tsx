import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthSplit } from './AuthSplit';
import { AuthBenefits } from './AuthBenefits';
import { AuthFormCard } from './AuthFormCard';
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
    <AuthSplit
      side={
        <>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
            Welcome back
          </div>
          <h1
            className="mt-5 font-bold text-gray-900"
            style={{ fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.04, letterSpacing: '-0.03em' }}
          >
            Sign in to keep<br />
            <span className="text-indigo-600">asking</span>.
          </h1>
          <p className="mt-5 max-w-[460px] text-[17px] leading-relaxed text-gray-600">
            Your polls, your responses, your analytics — pick up exactly where you left off.
          </p>
          <AuthBenefits />
        </>
      }
    >
      <AuthFormCard>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Sign in</h2>
        <p className="mt-1.5 text-sm text-gray-500">Enter your email and password.</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Email" htmlFor="login-email" error={errors.email?.message}>
            <Input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
          </Field>

          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label htmlFor="login-pw" className="text-sm font-medium text-gray-700">Password</label>
              <button
                type="button"
                onClick={() => toast.info('Password reset is not implemented yet.')}
                className="text-xs text-indigo-600 hover:underline"
              >
                Forgot?
              </button>
            </div>
            <Input id="login-pw" type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
            {errors.password?.message && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" size="lg" isLoading={login.isPending} className="w-full">
            Sign in
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:underline">
            Create one
          </Link>
        </p>
      </AuthFormCard>
    </AuthSplit>
  );
}
