import type { PollFormViewModel } from './hooks/usePollForm';

export type PollFormContext = 'owner' | 'admin';

export interface PollFormProps {
  vm: PollFormViewModel;
  formId: string;
}
