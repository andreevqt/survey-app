import { Link } from 'react-router-dom';

export function LandingCTA() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1180px] px-8 pb-24">
        <div className="relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[20px] bg-indigo-600 px-12 py-14 text-white">
          {/* Decorative dot grid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgb(255 255 255 / 0.16) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              maskImage:
                'linear-gradient(180deg, transparent, black 30%, black 70%, transparent)',
              WebkitMaskImage:
                'linear-gradient(180deg, transparent, black 30%, black 70%, transparent)',
            }}
          />
          <div className="relative">
            <h2
              className="font-bold text-white"
              style={{ fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.025em' }}
            >
              Ready to ask?
            </h2>
            <p className="mt-2.5 max-w-[460px] text-base" style={{ color: 'rgb(224 231 255 / 0.9)' }}>
              Create a poll in under a minute. No credit card. Cancel by not signing in again.
            </p>
          </div>
          <div className="relative flex gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-base font-semibold text-indigo-700 transition hover:bg-gray-100"
            >
              Get started free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
