import { SelectHTMLAttributes, forwardRef } from 'react';
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={`w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 ${className}`}
        {...rest}
      >
        {children}
      </select>
    );
  },
);
