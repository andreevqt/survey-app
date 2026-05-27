import { ReactNode } from 'react';

export interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}
