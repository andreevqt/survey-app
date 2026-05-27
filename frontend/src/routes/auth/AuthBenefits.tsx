const ITEMS = [
  'Single, multiple-choice, and free-text questions',
  'Real-time results with per-question breakdowns',
  'Anonymous responses · cookie-deduped',
  'Public links or revocable private tokens',
] as const;

export function AuthBenefits() {
  return (
    <ul className="mt-8 flex flex-col gap-3">
      {ITEMS.map((it) => (
        <li key={it} className="flex items-start gap-3 text-[15px] leading-snug text-gray-700">
          <span className="mt-0.5 inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          {it}
        </li>
      ))}
    </ul>
  );
}
