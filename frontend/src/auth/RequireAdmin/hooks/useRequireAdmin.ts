import { useAuth } from '../../useAuth';
import type { RequireAdminStatus } from '../types';

export function useRequireAdmin(): { status: RequireAdminStatus } {
  const { user, isLoading } = useAuth();

  let status: RequireAdminStatus;
  if (isLoading) {
    status = 'loading';
  } else if (!user) {
    status = 'unauthenticated';
  } else if (user.role !== 'ADMIN') {
    status = 'forbidden';
  } else {
    status = 'authorized';
  }

  return { status };
}
