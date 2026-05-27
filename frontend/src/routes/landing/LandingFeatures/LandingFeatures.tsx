import { useLandingFeatures } from './hooks/useLandingFeatures';

export function LandingFeatures() {
  const { features } = useLandingFeatures();

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1180px] px-8 pt-24 pb-8">
        <div className="mx-auto max-w-[640px] text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Everything you need
          </div>
          <h2
            className="mt-3 font-bold text-gray-900"
            style={{ fontSize: 40, lineHeight: 1.1, letterSpacing: '-0.025em' }}
          >
            Built for asking. Not&nbsp;a&nbsp;framework.
          </h2>
        </div>

        <div
          className="mt-12 grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              className="feature-card rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.iconPath} />
                </svg>
              </div>
              <h3 className="mb-1.5 mt-4 text-base font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
