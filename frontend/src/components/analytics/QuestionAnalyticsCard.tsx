import { Card } from '../primitives/Card';
import type { components } from '../../api/schema';

type Question = components['schemas']['QuestionAggregateDto'];

export function QuestionAnalyticsCard({ question }: { question: Question }) {
  const total = question.options.reduce((s, o) => s + o.count, 0);

  return (
    <Card size="sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{question.text}</p>
        <p className="text-xs text-gray-500">
          {question.answerCount} answer{question.answerCount === 1 ? '' : 's'}
        </p>
      </div>
      {question.type === 'TEXT' ? (
        <p className="mt-3 text-sm text-gray-500">
          {question.textAnswerCount ?? 0} text response{(question.textAnswerCount ?? 0) === 1 ? '' : 's'} recorded.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {question.options.map((o) => {
            const pct = total === 0 ? 0 : Math.round((o.count / total) * 100);
            return (
              <li key={o.optionId}>
                <div className="flex items-baseline justify-between text-xs text-gray-600">
                  <span>{o.text}</span>
                  <span>{o.count} ({pct}%)</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-2 bg-indigo-600" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
