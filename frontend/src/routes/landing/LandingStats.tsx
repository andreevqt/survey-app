const STATS = [
  { value: '12,847', label: 'Polls launched this week' },
  { value: '2.1M',   label: 'Responses collected' },
  { value: '<200ms', label: 'Median response submit' },
  { value: '0',      label: 'Tracking cookies set' },
] as const;

export function LandingStats() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1180px] px-8 pb-16">
        <div
          className="grid gap-4 rounded-2xl bg-gray-900 px-6 py-8 text-white"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
        >
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="px-1 py-2 text-center"
              style={{
                borderRight:
                  i < STATS.length - 1 ? '1px solid var(--gray-700, #374151)' : 'none',
              }}
            >
              <div
                className="font-bold"
                style={{ fontSize: 36, letterSpacing: '-0.02em' }}
              >
                {s.value}
              </div>
              <div className="mt-1 text-[13px] text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
