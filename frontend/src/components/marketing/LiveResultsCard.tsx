import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../lib/use-reduced-motion';

const ROTATING_POLLS = [
  {
    q: 'How would you rate your overall workload?',
    responses: 247,
    options: [
      { t: 'Light', pct: 12 },
      { t: 'Just right', pct: 51 },
      { t: 'Heavy', pct: 28 },
      { t: 'Overwhelming', pct: 9 },
    ],
  },
  {
    q: 'Which framework do you reach for first?',
    responses: 1842,
    options: [
      { t: 'React', pct: 58 },
      { t: 'Vue', pct: 18 },
      { t: 'Svelte', pct: 14 },
      { t: 'Solid', pct: 10 },
    ],
  },
  {
    q: 'Where should we hold the offsite?',
    responses: 38,
    options: [
      { t: 'Lisbon', pct: 42 },
      { t: 'Berlin', pct: 26 },
      { t: 'Mexico City', pct: 22 },
      { t: 'Stay remote', pct: 10 },
    ],
  },
] as const;

type Props = {
  rotate?: number;
  opacity?: number;
  zIndex?: number;
  offset?: { x: number; y: number };
  delay?: number;
};

export function LiveResultsCard({
  rotate = 0,
  opacity = 1,
  zIndex = 1,
  offset = { x: 0, y: 0 },
  delay = 0,
}: Props) {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [fill, setFill] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const start = setTimeout(() => setFill(true), 200 + delay);
    return () => clearTimeout(start);
  }, [idx, delay, reduced]);

  useEffect(() => {
    if (reduced) return;
    const interval = setInterval(() => {
      setFill(false);
      setTimeout(() => setIdx((p) => (p + 1) % ROTATING_POLLS.length), 350);
    }, 4500);
    return () => clearInterval(interval);
  }, [reduced]);

  const poll = ROTATING_POLLS[idx];
  const max = Math.max(...poll.options.map((o) => o.pct));

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: offset.y,
        left: offset.x,
        width: 340,
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
                <span className={leader ? 'font-semibold text-gray-700' : 'text-gray-700'}>
                  {o.t}
                </span>
                <span
                  className={`font-mono text-[11px] font-medium ${
                    leader ? 'text-indigo-600' : 'text-gray-500'
                  }`}
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
                      : `width ${900 + i * 120}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  }}
                  className={`h-full rounded-full ${
                    leader ? 'bg-indigo-600' : 'bg-indigo-300'
                  }`}
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
