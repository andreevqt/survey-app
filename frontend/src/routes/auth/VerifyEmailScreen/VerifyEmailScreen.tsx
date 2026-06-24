import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AuthSplit } from '../AuthSplit';
import { AuthFormCard } from '../AuthFormCard';
import { Button } from '../../../components/primitives/Button';
import { useVerifyEmailMutation } from '../../../auth/auth-mutations';

export function VerifyEmailScreen() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const verify = useVerifyEmailMutation();
  const [error, setError] = useState<string | null>(null);

  const onConfirm = async () => {
    setError(null);
    try {
      await verify.mutateAsync({ token });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      setError(code === 'TOKEN_EXPIRED' ? 'This link has expired.' : 'This link is invalid.');
    }
  };

  return (
    <AuthSplit side={<h1 className="font-bold text-gray-900" style={{ fontSize: 'clamp(36px,5vw,56px)' }}>One click to go.</h1>}>
      <AuthFormCard>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Confirm your email</h2>
        {!token ? (
          <p className="mt-2 text-sm text-red-600">Missing token.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-600">Click below to activate your account.</p>
            <Button type="button" size="lg" className="mt-6 w-full" isLoading={verify.isPending} onClick={onConfirm}>
              Confirm email
            </Button>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </>
        )}
        <p className="mt-5 text-center text-sm text-gray-600">
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">Back to sign in</Link>
        </p>
      </AuthFormCard>
    </AuthSplit>
  );
}
