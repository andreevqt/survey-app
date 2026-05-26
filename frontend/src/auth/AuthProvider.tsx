import { createContext, ReactNode, useContext, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { apiClient, setForceLogoutHandler } from '../api/client';

export interface AuthUser { id: string; email: string; name: string; role: 'USER' | 'ADMIN' }
type AuthState = { user: AuthUser | null; isLoading: boolean };

const AuthContext = createContext<AuthState | null>(null);
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </QueryClientProvider>
  );
}

function InnerAuthProvider({ children }: { children: ReactNode }) {
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const r = await apiClient.GET('/auth/me' as any, {} as any);
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

  return (
    <AuthContext.Provider value={{ user: meQuery.data ?? null, isLoading: meQuery.isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function setMeInCache(user: AuthUser | null) {
  queryClient.setQueryData(['auth', 'me'], user);
}

export { queryClient };
