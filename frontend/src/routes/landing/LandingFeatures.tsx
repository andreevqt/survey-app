type Feature = { title: string; body: string; iconPath: string };

const FEATURES: Feature[] = [
  {
    title: 'Three question types',
    body: 'Single-choice, multi-select, and free-text. Mix and match in one poll.',
    iconPath: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.4 48.4 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z',
  },
  {
    title: 'Anonymous by default',
    body: 'Respondents need no account. Cookie-based dedup prevents accidental re-submits.',
    iconPath: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z',
  },
  {
    title: 'Live analytics',
    body: 'Per-question breakdowns and a response timeline that updates as answers roll in.',
    iconPath: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  },
  {
    title: 'Public or private',
    body: 'Share a public link or generate a revocable access token. Regen it any time.',
    iconPath: 'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244',
  },
  {
    title: 'Export to CSV',
    body: "One click downloads a clean CSV of every response. Hook into your own pipeline.",
    iconPath: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5',
  },
  {
    title: 'Admin panel',
    body: 'Manage every user and every poll in the system. Bulk actions, filters, export.',
    iconPath: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  },
];

export function LandingFeatures() {
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
          {FEATURES.map((f) => (
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
