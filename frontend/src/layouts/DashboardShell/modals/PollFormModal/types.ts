export type PollFormModalMode = 'create' | 'edit';
export type PollFormModalContext = 'owner' | 'admin';

export interface PollFormModalProps {
  mode: PollFormModalMode;
  context?: PollFormModalContext;
  id?: string;
}
