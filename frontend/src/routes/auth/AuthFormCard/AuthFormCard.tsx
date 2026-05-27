import { useAuthFormCard } from './hooks/useAuthFormCard';
import type { AuthFormCardProps } from './types';

export function AuthFormCard({ children }: AuthFormCardProps) {
  const { style } = useAuthFormCard();

  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-9"
      style={style}
    >
      {children}
    </div>
  );
}
