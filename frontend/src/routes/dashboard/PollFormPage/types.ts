export type PollFormPageMode = 'create' | 'edit';
export type PollFormPageContext = 'owner' | 'admin';

export interface PollFormPageProps {
  mode: PollFormPageMode;
  context?: PollFormPageContext;
  id?: string;
}
