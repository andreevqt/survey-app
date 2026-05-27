import { Link } from 'react-router-dom';
import { LiveResultsCard } from '../../../components/marketing/LiveResultsCard';
import { useAuthSplit } from './hooks/useAuthSplit';
import type { AuthSplitProps } from './types';

export function AuthSplit({ side, children }: AuthSplitProps) {
  useAuthSplit();

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <style>{`
        @media (max-width: 920px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-left { padding: 32px 24px !important; }
          .auth-floater { display: none !important; }
        }
      `}</style>

      {/* Indigo wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          top: -180,
          right: -160,
          width: 720,
          height: 720,
          background: 'radial-gradient(closest-side, rgb(99 102 241 / 0.14), transparent 70%)',
        }}
      />
      {/* Dotted grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgb(99 102 241 / 0.10) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(135deg, black, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(135deg, black, transparent 70%)',
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <img src="/logo-mark.svg" width={28} height={28} alt="" />
          <span className="text-lg font-bold tracking-tight text-gray-900">Polls</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:underline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>
      </header>

      <div
        className="auth-grid relative z-[1] mx-auto grid items-center gap-16 px-8 pb-16 pt-5"
        style={{
          maxWidth: 1120,
          gridTemplateColumns: 'minmax(0, 1fr) 460px',
          minHeight: 'calc(100vh - 84px)',
        }}
      >
        {/* Left: branding side */}
        <div className="auth-left relative">
          {side}

          {/* Decorative floating card */}
          <div
            className="auth-floater pointer-events-none absolute"
            style={{ bottom: -40, left: -40, width: 300, transform: 'rotate(-3deg)', opacity: 0.85 }}
          >
            <div className="relative">
              <LiveResultsCard offset={{ x: 0, y: 0 }} rotate={0} opacity={1} zIndex={1} />
            </div>
          </div>
        </div>

        {/* Right: form column */}
        <div className="relative z-[5]">{children}</div>
      </div>
    </div>
  );
}
