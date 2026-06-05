import clsx from 'clsx';
import type { ButtonVariant, ButtonSize } from '../types';
import { BUTTON_BASE, VARIANT_CLS, SIZE_CLS } from '../constants';

interface UseButtonInput {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

interface UseButtonResult {
  className: string;
  disabled: boolean;
}

export function useButton({
  variant = 'primary',
  size = 'md',
  isLoading,
  disabled,
  className,
}: UseButtonInput): UseButtonResult {
  return {
    className: clsx(BUTTON_BASE, VARIANT_CLS[variant], SIZE_CLS[size], className),
    disabled: !!(disabled || isLoading),
  };
}
