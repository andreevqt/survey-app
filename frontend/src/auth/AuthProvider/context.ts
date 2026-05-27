import { createContext, useContext } from 'react';
import { QueryClient } from '@tanstack/react-query';
import type { AuthState, AuthUser } from './types';

export const AuthContext = createContext<AuthState | null>(null);

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function setMeInCache(user: AuthUser | null) {
  queryClient.setQueryData(['auth', 'me'], user);
}
