import clsx from 'clsx';
import { useLiveResultsCard } from './hooks/useLiveResultsCard';
import { CARD_WIDTH, BAR_BASE_MS, BAR_STAGGER_MS } from './constants';
import type { LiveResultsCardProps } from './types';

export function LiveResultsCard({
  rotate = 0,
  opacity = 1,
  zIndex = 1,
  offset = { x: 0, y: 0 },
  delay = 0,
}: LiveResultsCardProps) {
  const { poll, max, fill, reduced, idx } = useLiveResultsCard(delay);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: offset.y,
        left: offset.x,
        width: CARD_WIDTH,
        transform: `rotate(${rotate}deg)`,
        opacity,
        zIndex,
        boxShadow:
          '0 20px 50px -12px rgb(31 41 55 / 0.18), 0 8px 16px -8px rgb(31 41 55 / 0.10)',
        transition: 'transform 400ms ease',
      }}
      className="rounded-2xl border border-gray-200 bg-white p-5"
    >
      <div className="mb-3 flex items-center gap-1.5">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600"
          style={{ animation: reduced ? undefined : 'lrc-pulse 2s infinite' }}
        />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Live · {poll.responses} responses
        </span>
      </div>
      <p className="mb-4 text-[15px] font-semibold leading-snug text-gray-900">
        {poll.q}
      </p>
      <div className="flex flex-col gap-[11px]">
        {poll.options.map((o, i) => {
          const leader = o.pct === max;
          return (
            <div key={`${idx}-${i}`}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className={clsx('text-gray-700', leader && 'font-semibold')}>
                  {o.t}
                </span>
                <span
                  className={clsx('font-mono text-[11px] font-medium', leader ? 'text-indigo-600' : 'text-gray-500')}
                >
                  {o.pct}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  style={{
                    width: fill ? `${o.pct}%` : '0%',
                    transition: reduced
                      ? 'none'
                      : `width ${BAR_BASE_MS + i * BAR_STAGGER_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  }}
                  className={clsx('h-full rounded-full', leader ? 'bg-indigo-600' : 'bg-indigo-300')}
                />
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes lrc-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgb(22 163 74 / 0.6); }
          50%      { box-shadow: 0 0 0 6px rgb(22 163 74 / 0); }
        }
      `}</style>
    </div>
  );
}
