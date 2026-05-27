import { QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, queryClient } from './context';
import { useAuthProvider } from './hooks/useAuthProvider';
import type { AuthProviderProps } from './types';

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </QueryClientProvider>
  );
}

function InnerAuthProvider({ children }: AuthProviderProps) {
  const state = useAuthProvider();
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
