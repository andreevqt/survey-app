import { useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthSplit } from '../AuthSplit';
import { AuthFormCard } from '../AuthFormCard';
import { Button } from '../../../components/primitives/Button';
import { useResendVerificationMutation } from '../../../auth/auth-mutations';

export function CheckEmailScreen() {
  const { state } = useLocation() as { state?: { email?: string } };
  const email = state?.email;
  const resend = useResendVerificationMutation();
  return (
    <AuthSplit side={<h1 className="font-bold text-gray-900" style={{ fontSize: 'clamp(36px,5vw,56px)' }}>Almost there.</h1>}>
      <AuthFormCard>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Check your email</h2>
        <p className="mt-2 text-sm text-gray-600">
          We sent a confirmation link{email ? <> to <span className="font-medium">{email}</span></> : ''}. Click it to activate your account.
        </p>
        <Button
          type="button"
          size="lg"
          className="mt-6 w-full"
          isLoading={resend.isPending}
          onClick={async () => {
            if (!email) return;
            await resend.mutateAsync({ email });
            toast.success('Verification email resent.');
          }}
        >
          Resend email
        </Button>
        <p className="mt-5 text-center text-sm text-gray-600">
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">Back to sign in</Link>
        </p>
      </AuthFormCard>
    </AuthSplit>
  );
}
