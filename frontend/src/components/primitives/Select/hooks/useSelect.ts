interface UseSelectInput {
  className?: string;
}

interface UseSelectResult {
  className: string;
}

export function useSelect({ className = '' }: UseSelectInput): UseSelectResult {
  return {
    className: `w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 ${className}`,
  };
}
