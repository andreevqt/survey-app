import { InputHTMLAttributes, forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 ${className}`}
        {...rest}
      />
    );
  },
);
