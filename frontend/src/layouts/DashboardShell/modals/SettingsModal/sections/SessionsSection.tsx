import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../../components/primitives/Button';
import { useLogoutMutation } from '../../../../../auth/auth-mutations';

export function SessionsSection() {
  const navigate = useNavigate();
  const logout = useLogoutMutation();

  const onSignOut = () =>
    logout.mutate(undefined, { onSuccess: () => navigate('/') });

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900">Sessions</h3>
      <p className="mt-1 text-sm text-gray-500">You are signed in on this device.</p>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Sign out of this session</p>
          <p className="text-xs text-gray-500">You will need to log in again to access your polls.</p>
        </div>
        <Button variant="secondary" onClick={onSignOut} isLoading={logout.isPending}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
