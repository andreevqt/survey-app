import { Link } from 'react-router-dom';

export function BrandMark() {
  return (
    <Link
      to="/dashboard"
      aria-label="Polls — dashboard home"
      className="flex items-center gap-2.5 px-2 pt-1.5 pb-3.5 rounded-md no-underline hover:no-underline hover:opacity-80 transition-opacity"
    >
      <svg viewBox="0 0 48 48" fill="none" width={26} height={26} aria-hidden="true" style={{ color: '#4F46E5' }}>
        <rect x="1" y="1" width="46" height="46" rx="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <g transform="translate(5, 5) scale(0.7916666666666666)">
          <path
            d="M6 11 a4 4 0 0 1 4 -4 h12 a4 4 0 0 1 4 4 v11 a4 4 0 0 1 -4 4 h-5 l-6 5 1 -5 h-2 a4 4 0 0 1 -4 -4 z"
            fill="currentColor"
          />
          <path
            d="M22 23 a4 4 0 0 1 4 -4 h12 a4 4 0 0 1 4 4 v11 a4 4 0 0 1 -4 4 h-2 l1 5 -6 -5 h-5 a4 4 0 0 1 -4 -4 z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="24" cy="24" r="4.4" fill="currentColor" />
          <circle cx="24" cy="24" r="2.4" fill="#fff" />
        </g>
      </svg>
      <span className="text-base font-bold text-gray-900 tracking-tight">Polls</span>
    </Link>
  );
}
