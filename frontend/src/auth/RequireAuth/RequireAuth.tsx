import { Navigate } from 'react-router-dom';
import { Spinner } from '../../components/primitives/Spinner';
import { useRequireAuth } from './hooks/useRequireAuth';
import type { RequireAuthProps } from './types';

export function RequireAuth({ children }: RequireAuthProps) {
  const { status, redirectState } = useRequireAuth();
  if (status === 'loading') return <div className="flex justify-center p-12"><Spinner size={28} /></div>;
  if (status === 'unauthenticated') return <Navigate to="/login" replace state={redirectState} />;
  return <>{children}</>;
}
