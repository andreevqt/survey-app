import { ReactNode } from 'react';

export type BadgeVariant = 'default' | 'success' | 'info' | 'danger';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}
