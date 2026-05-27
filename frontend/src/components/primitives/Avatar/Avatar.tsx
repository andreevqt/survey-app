import type { AvatarProps } from './types';
import { useAvatar } from './hooks/useAvatar';

export function Avatar(props: AvatarProps) {
  const { initials, className } = useAvatar(props);
  return <span className={className}>{initials}</span>;
}
