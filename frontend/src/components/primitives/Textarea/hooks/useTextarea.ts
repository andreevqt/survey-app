interface UseTextareaInput {
  className?: string;
  rows?: number;
}

interface UseTextareaResult {
  className: string;
  rows: number;
}

export function useTextarea({ className = '', rows }: UseTextareaInput): UseTextareaResult {
  return {
    className: `w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 ${className}`,
    rows: rows ?? 4,
  };
}
