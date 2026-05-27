import { Card } from '../../primitives/Card';
import { QuestionAnalyticsCard } from '../QuestionAnalyticsCard';
import type { AnalyticsViewProps } from './types';

export function AnalyticsView({ analytics }: AnalyticsViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <p className="text-sm font-medium text-gray-500">Total responses</p>
        <p className="mt-1 text-4xl font-bold text-gray-900">{analytics.totalResponses}</p>
      </Card>
      <div className="flex flex-col gap-4">
        {analytics.questions.map((q) => (
          <QuestionAnalyticsCard key={q.questionId} question={q} />
        ))}
      </div>
    </div>
  );
}
