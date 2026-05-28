import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { Card } from '../../primitives/Card';
import { useFreeTextAnalysis } from './hooks/useFreeTextAnalysis';
import { useQuestionAnalyticsCard } from './hooks/useQuestionAnalyticsCard';
import type { QuestionAnalyticsCardProps } from './types';

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <path d="M12 8a4 4 0 0 0 0 8 4 4 0 0 0 0-8z" />
    </svg>
  );
}

export function QuestionAnalyticsCard({ pollId, question }: QuestionAnalyticsCardProps) {
  const vm = useQuestionAnalyticsCard(question);
  const ai = useFreeTextAnalysis(pollId, question.questionId);

  if (!vm.isText) {
    return (
      <Card size="sm">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-gray-900">{question.text}</p>
          <p className="text-xs text-gray-500">
            {question.answerCount} answer{question.answerCount === 1 ? '' : 's'}
          </p>
        </div>
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
      </Card>
    );
  }

  const s = ai.analysis?.sentiment;

  return (
    <Card size="sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{question.text}</p>
          <p className="mt-1 text-xs text-gray-500">
            Free-text · {vm.textAnswerCount} response{vm.textAnswerCount === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          size="sm"
          variant={ai.analysis ? 'secondary' : 'primary'}
          onClick={() => { void ai.analyze(); }}
          isLoading={ai.loading}
          className="inline-flex items-center gap-1.5 shrink-0"
        >
          {!ai.loading && <SparkleIcon />}
          <span>{ai.analysis ? 'Re-analyze' : 'Analyze with AI'}</span>
        </Button>
      </div>

      {ai.analysis && s && (
        <div className="mt-4 rounded-lg border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-4">
          <div className="flex items-center gap-1.5">
            <span className="text-indigo-600"><SparkleIcon /></span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
              AI summary
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gray-800">{ai.analysis.summary}</p>

          <div className="mt-3">
            <p className="text-xs text-gray-500">Sentiment</p>
            <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-[#10B981]" style={{ width: `${s.positive}%` }} />
              <div className="h-full bg-[#9CA3AF]" style={{ width: `${s.neutral}%` }} />
              <div className="h-full bg-[#EF4444]" style={{ width: `${s.negative}%` }} />
            </div>
            <div className="mt-1.5 flex gap-3 text-xs text-gray-600">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#10B981]" />Positive {s.positive}%</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#9CA3AF]" />Neutral {s.neutral}%</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#EF4444]" />Negative {s.negative}%</span>
            </div>
          </div>

          {ai.analysis.themes.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500">Top themes</p>
              <ul className="mt-2 flex flex-col gap-2">
                {ai.analysis.themes.map((t) => (
                  <li key={t.label} className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">{t.label}</span>
                      <Badge variant="info">{t.count}</Badge>
                    </div>
                    {t.quote && (
                      <p className="mt-1.5 text-xs italic leading-relaxed text-gray-600">
                        “{t.quote}”
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {ai.error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {ai.error}
        </div>
      )}
    </Card>
  );
}
