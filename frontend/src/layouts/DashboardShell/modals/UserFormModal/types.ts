export type UserFormModalMode = 'create' | 'edit';

export interface UserFormModalProps {
  mode: UserFormModalMode;
  id?: string;
}
