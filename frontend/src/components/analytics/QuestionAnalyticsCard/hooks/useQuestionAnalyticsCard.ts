import type { QuestionAggregateQuestion } from '../types';

export interface QuestionAnalyticsCardViewModel {
  total: number;
  isText: boolean;
  rows: Array<{ optionId: string; text: string; count: number; pct: number }>;
  textAnswerCount: number;
}

export function useQuestionAnalyticsCard(question: QuestionAggregateQuestion): QuestionAnalyticsCardViewModel {
  const total = question.options.reduce((s, o) => s + o.count, 0);
  const isText = question.type === 'TEXT';
  const rows = isText
    ? []
    : question.options.map((o) => ({
        optionId: o.optionId,
        text: o.text,
        count: o.count,
        pct: total === 0 ? 0 : Math.round((o.count / total) * 100),
      }));
  const textAnswerCount = question.textAnswerCount ?? 0;

  return { total, isText, rows, textAnswerCount };
}
