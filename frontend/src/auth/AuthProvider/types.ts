import type { ReactNode } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

export interface AuthProviderProps {
  children: ReactNode;
}
