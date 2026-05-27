import { useState } from 'react';
import { useReducedMotion } from '../../lib/use-reduced-motion';

const OPTIONS = [
  { t: 'Tabs', pct: 64 },
  { t: 'Spaces', pct: 31 },
  { t: 'Either', pct: 5 },
] as const;

export function LandingTryIt() {
  const [picked, setPicked] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const max = Math.max(...OPTIONS.map((o) => o.pct));

  return (
    <section className="border-y border-gray-200 bg-gray-50">
      <div
        className="try-grid mx-auto grid max-w-[1180px] items-center gap-16 px-8 py-[72px]"
        style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}
      >
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
            Try it
          </div>
          <h2
            className="mt-3 font-bold text-gray-900"
            style={{ fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.025em' }}
          >
            One click. Instant&nbsp;results.
          </h2>
          <p className="mt-4 max-w-[440px] text-[17px] leading-relaxed text-gray-600">
            No login. No friction. Pick an option and watch the bars fill —
            that's the same experience your respondents get.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600"
              style={{ animation: reduced ? undefined : 'lrc-pulse 2s infinite' }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Live · 3,127 responses
            </span>
          </div>
          <p className="mb-[18px] text-lg font-semibold text-gray-900">Tabs or spaces?</p>

          {picked === null ? (
            <div className="flex flex-col gap-2">
              {OPTIONS.map((o) => (
                <button
                  key={o.t}
                  onClick={() => setPicked(o.t)}
                  className="rounded-md border border-gray-200 bg-white px-3.5 py-3 text-left text-sm text-gray-700 transition hover:border-indigo-500 hover:bg-indigo-50"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300" />
                    {o.t}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {OPTIONS.map((o, i) => {
                const isPicked = o.t === picked;
                const leader = o.pct === max;
                return (
                  <div key={o.t}>
                    <div className="mb-1 flex items-baseline justify-between text-[13px]">
                      <span
                        className={`inline-flex items-center gap-2 ${
                          isPicked ? 'font-semibold text-indigo-700' : 'text-gray-700'
                        }`}
                      >
                        {o.t}
                        {isPicked && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`font-mono text-xs font-medium ${
                          leader ? 'text-indigo-600' : 'text-gray-500'
                        }`}
                      >
                        {o.pct}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        style={{
                          width: `${o.pct}%`,
                          transition: reduced
                            ? 'none'
                            : `width ${800 + i * 150}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                        }}
                        className={`h-full rounded-full ${leader ? 'bg-indigo-600' : 'bg-indigo-300'}`}
                      />
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => setPicked(null)}
                className="mt-1 self-start text-[13px] text-indigo-600 hover:underline"
              >
                ← Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
