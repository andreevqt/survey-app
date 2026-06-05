import { Link } from 'react-router-dom';
import { Button } from '../../../components/primitives/Button';
import { LiveResultsCard } from '../../../components/marketing/LiveResultsCard';
import { TRUST_AVATARS } from './constants';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Indigo wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          top: -160,
          right: -80,
          width: 720,
          height: 720,
          background: 'radial-gradient(closest-side, rgb(99 102 241 / 0.13), transparent 70%)',
        }}
      />
      {/* Dotted grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgb(99 102 241 / 0.10) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(180deg, black, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(180deg, black, transparent 80%)',
        }}
      />

      <div className="relative mx-auto max-w-[1180px] px-8 pb-24 pt-[72px]">
        <div className="hero-grid grid items-center gap-16" style={{ gridTemplateColumns: 'minmax(0, 1fr) 420px' }}>
          <div>
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
              Anonymous · Cookie-deduped · Free
            </div>

            <h1
              className="mt-5 font-bold text-gray-900"
              style={{ fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.02, letterSpacing: '-0.035em' }}
            >
              Ask anyone.<br />
              See it{' '}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10 text-indigo-600">instantly</span>
                <svg
                  viewBox="0 0 240 20"
                  preserveAspectRatio="none"
                  className="absolute left-0 right-0 z-0 h-4 w-full"
                  style={{ bottom: -8 }}
                  fill="none"
                  stroke="var(--indigo-300, #a5b4fc)"
                  strokeWidth={3}
                  strokeLinecap="round"
                >
                  <path d="M4 14 Q 60 4, 120 12 T 236 8" />
                </svg>
              </span>.
            </h1>

            <p className="mt-6 max-w-[520px] text-lg leading-relaxed text-gray-600">
              Single-choice, multiple-choice, and free-text polls. Share a link.
              Watch responses stream in. Export to CSV when you're done.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg">
                  Create your first poll
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="secondary">Sign in</Button>
              </Link>
            </div>

            {/* Trust strip */}
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <div aria-hidden="true" className="flex items-center">
                {TRUST_AVATARS.map((a, i) => (
                  <div
                    key={a.initials}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold"
                    style={{
                      background: a.bg,
                      color: a.fg,
                      marginLeft: i === 0 ? 0 : -8,
                    }}
                  >
                    {a.initials}
                  </div>
                ))}
              </div>
              <div className="text-[13px] text-gray-600">
                <b className="text-gray-900">12,847</b> polls launched this week
              </div>
            </div>
          </div>

          {/* Right: stacked decorative cards */}
          <div className="hero-stack relative" style={{ height: 480 }}>
            <LiveResultsCard offset={{ x: 40, y: 40 }} rotate={4}  opacity={0.5}  zIndex={1} delay={200} />
            <LiveResultsCard offset={{ x: 20, y: 20 }} rotate={-3} opacity={0.75} zIndex={2} delay={100} />
            <LiveResultsCard offset={{ x: 0,  y: 0  }} rotate={0}  opacity={1}    zIndex={3} delay={0} />
          </div>
        </div>
      </div>
    </section>
  );
}
