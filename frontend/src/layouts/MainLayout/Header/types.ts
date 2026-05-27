import type { AuthUser } from '../../../auth/AuthProvider';

export type HeaderProps = Record<PropertyKey, never>;

export interface HeaderViewModel {
  user: AuthUser | null;
  handleSignOut: () => void;
}
