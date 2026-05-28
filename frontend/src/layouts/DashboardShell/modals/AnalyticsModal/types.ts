export type AnalyticsModalContext = 'owner' | 'admin';

export interface AnalyticsModalProps {
  id: string;
  context?: AnalyticsModalContext;
}
