export type PollFormModalMode = 'create' | 'edit';

export interface PollFormModalProps {
  mode: PollFormModalMode;
  id?: string;
}
