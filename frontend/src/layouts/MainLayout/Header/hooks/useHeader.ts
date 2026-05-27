import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../auth/useAuth';
import { useLogoutMutation } from '../../../../auth/auth-mutations';
import type { HeaderViewModel } from '../types';

export function useHeader(): HeaderViewModel {
  const { user } = useAuth();
  const logout = useLogoutMutation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout.mutate(undefined, { onSuccess: () => navigate('/') });
  };

  return { user, handleSignOut };
}
