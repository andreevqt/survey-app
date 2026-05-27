import { useLocation } from 'react-router-dom';
import { useAuth } from '../../useAuth';
import type { RequireAuthStatus } from '../types';

export function useRequireAuth(): { status: RequireAuthStatus; redirectState: { from: string } } {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  let status: RequireAuthStatus;
  if (isLoading) {
    status = 'loading';
  } else if (!user) {
    status = 'unauthenticated';
  } else {
    status = 'authenticated';
  }

  return { status, redirectState: { from: location.pathname } };
}
