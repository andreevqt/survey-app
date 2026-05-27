import { Navigate } from 'react-router-dom';
import { Spinner } from '../../components/primitives/Spinner';
import { useRequireAdmin } from './hooks/useRequireAdmin';
import type { RequireAdminProps } from './types';

export function RequireAdmin({ children }: RequireAdminProps) {
  const { status } = useRequireAdmin();
  if (status === 'loading') return <div className="flex justify-center p-12"><Spinner size={28} /></div>;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  if (status === 'forbidden') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
