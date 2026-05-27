import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, setForceLogoutHandler } from '../../../api/client';
import { queryClient } from '../context';
import type { AuthUser } from '../types';

export function useAuthProvider() {
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const r = await apiClient.GET('/auth/me');
      if (!r.response.ok) return null;
      return (r.data as AuthUser) ?? null;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    setForceLogoutHandler(() => {
      queryClient.setQueryData(['auth', 'me'], null);
    });
  }, []);

  return {
    user: meQuery.data ?? null,
    isLoading: meQuery.isLoading,
  };
}
