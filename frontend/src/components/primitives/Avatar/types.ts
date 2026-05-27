export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarVariant = 'light' | 'dark';

export interface AvatarProps {
  name?: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
}
