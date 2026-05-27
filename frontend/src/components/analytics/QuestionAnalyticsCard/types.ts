import type { components } from '../../../api/schema';

export type QuestionAggregateQuestion = components['schemas']['QuestionAggregateDto'];

export interface QuestionAnalyticsCardProps {
  question: QuestionAggregateQuestion;
}
