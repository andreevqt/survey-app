import { useLandingStats } from './hooks/useLandingStats';

export function LandingStats() {
  const { stats } = useLandingStats();

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1180px] px-8 pb-16">
        <div
          className="grid gap-4 rounded-2xl bg-gray-900 px-6 py-8 text-white"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="px-1 py-2 text-center"
              style={{
                borderRight:
                  i < stats.length - 1 ? '1px solid var(--gray-700, #374151)' : 'none',
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
