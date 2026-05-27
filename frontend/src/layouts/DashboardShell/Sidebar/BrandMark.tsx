export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 px-2 pt-1.5 pb-3.5">
      <svg viewBox="0 0 48 48" width={26} height={26} aria-hidden="true">
        <rect width="48" height="48" rx="11" fill="#4F46E5" />
        <circle cx="13" cy="16" r="3.25" fill="#fff" />
        <circle cx="13" cy="16" r="1.4" fill="#4F46E5" />
        <rect x="20" y="14" width="18" height="4" rx="2" fill="#fff" />
        <circle cx="13" cy="24" r="3.25" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.6" />
        <rect x="20" y="22" width="14" height="4" rx="2" fill="#fff" opacity="0.55" />
        <circle cx="13" cy="32" r="3.25" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.6" />
        <rect x="20" y="30" width="10" height="4" rx="2" fill="#fff" opacity="0.55" />
      </svg>
      <span className="text-base font-bold text-gray-900 tracking-tight">Polls</span>
    </div>
  );
}
