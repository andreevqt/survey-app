import type { ReactNode } from 'react';

export interface RequireAuthProps {
  children: ReactNode;
}

export type RequireAuthStatus = 'loading' | 'unauthenticated' | 'authenticated';
