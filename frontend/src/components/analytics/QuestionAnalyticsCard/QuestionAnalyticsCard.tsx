import { Card } from '../../primitives/Card';
import { useQuestionAnalyticsCard } from './hooks/useQuestionAnalyticsCard';
import type { QuestionAnalyticsCardProps } from './types';

export function QuestionAnalyticsCard({ question }: QuestionAnalyticsCardProps) {
  const vm = useQuestionAnalyticsCard(question);

  return (
    <Card size="sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{question.text}</p>
        <p className="text-xs text-gray-500">
          {question.answerCount} answer{question.answerCount === 1 ? '' : 's'}
        </p>
      </div>
      {vm.isText ? (
        <p className="mt-3 text-sm text-gray-500">
          {vm.textAnswerCount} text response{vm.textAnswerCount === 1 ? '' : 's'} recorded.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {vm.rows.map((row) => (
            <li key={row.optionId}>
              <div className="flex items-baseline justify-between text-xs text-gray-600">
                <span>{row.text}</span>
                <span>{row.count} ({row.pct}%)</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-2 bg-indigo-600" style={{ width: `${row.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
