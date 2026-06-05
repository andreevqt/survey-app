import type { ButtonVariant, ButtonSize } from './types';

export const BUTTON_BASE =
  'inline-flex items-center justify-center rounded-md font-medium transition disabled:opacity-60 disabled:cursor-not-allowed';

export const VARIANT_CLS: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-600/60',
  secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-600/90',
};

export const SIZE_CLS: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};
