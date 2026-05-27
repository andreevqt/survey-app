import { Link } from 'react-router-dom';
import { AuthSplit } from '../AuthSplit';
import { AuthBenefits } from '../AuthBenefits';
import { AuthFormCard } from '../AuthFormCard';
import { Button } from '../../../components/primitives/Button';
import { Input } from '../../../components/primitives/Input';
import { Field } from '../../../components/primitives/Field';
import { useRegisterScreen } from './hooks/useRegisterScreen';

export function RegisterScreen() {
  const { registerInput, errors, isPending, onSubmit } = useRegisterScreen();

  return (
    <AuthSplit
      side={
        <>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
            Free · No credit card
          </div>
          <h1
            className="mt-5 font-bold text-gray-900"
            style={{ fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.04, letterSpacing: '-0.03em' }}
          >
            Create your<br />
            <span className="text-indigo-600">first poll</span> in 60s.
          </h1>
          <p className="mt-5 max-w-[460px] text-[17px] leading-relaxed text-gray-600">
            One account, unlimited polls. Share a link, collect responses, watch the bars fill.
          </p>
          <AuthBenefits />
        </>
      }
    >
      <AuthFormCard>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Create account</h2>
        <p className="mt-1.5 text-sm text-gray-500">Takes about a minute.</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Name" htmlFor="reg-name" error={errors.name?.message}>
            <Input id="reg-name" autoComplete="name" placeholder="Alex Petrov" {...registerInput('name')} />
          </Field>
          <Field label="Email" htmlFor="reg-email" error={errors.email?.message}>
            <Input id="reg-email" type="email" autoComplete="email" placeholder="you@example.com" {...registerInput('email')} />
          </Field>
          <div>
            <label htmlFor="reg-pw" className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <Input id="reg-pw" type="password" autoComplete="new-password" placeholder="At least 8 characters" {...registerInput('password')} />
            {errors.password?.message ? (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            ) : (
              <p className="mt-1.5 text-xs text-gray-500">
                Use 8+ characters with a mix of letters, numbers &amp; symbols.
              </p>
            )}
          </div>

          <Button type="submit" size="lg" isLoading={isPending} className="w-full">
            Create account
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </AuthFormCard>

      <p className="mx-auto mt-4 max-w-[380px] text-center text-xs leading-relaxed text-gray-500">
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>
    </AuthSplit>
  );
}
