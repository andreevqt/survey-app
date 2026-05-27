import type { CardProps } from './types';
import { useCard } from './hooks/useCard';

export function Card({ size, className, ...rest }: CardProps) {
  const vm = useCard({ size, className });
  return <div className={vm.className} {...rest} />;
}
