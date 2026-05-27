import type { ReactNode } from 'react';

export interface RequireAdminProps {
  children: ReactNode;
}

export type RequireAdminStatus = 'loading' | 'unauthenticated' | 'forbidden' | 'authorized';
