import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const VARIANT_CLS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-600/60',
  secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-600/90',
};
const SIZE_CLS: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', isLoading, disabled, className = '', children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-md font-medium transition disabled:opacity-60 disabled:cursor-not-allowed ${VARIANT_CLS[variant]} ${SIZE_CLS[size]} ${className}`}
      {...rest}
    >
      {isLoading ? 'Loading…' : children}
    </button>
  );
});
