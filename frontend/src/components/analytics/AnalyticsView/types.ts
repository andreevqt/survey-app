import type { components } from '../../../api/schema';

export type OwnerAnalyticsDto = components['schemas']['OwnerAnalyticsDto'];

export interface AnalyticsViewProps {
  analytics: OwnerAnalyticsDto;
}
