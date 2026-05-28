import { Link } from 'react-router-dom';
import { Button } from '../../../components/primitives/Button';

export function LandingNav() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-gray-200"
      style={{
        background: 'rgb(255 255 255 / 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-8 py-3.5">
        <Link to="/" aria-label="Polls — home" className="flex items-center gap-2.5 rounded-md no-underline hover:no-underline hover:opacity-80 transition-opacity">
          <img src="/logo-mark.svg" width={28} height={28} alt="" />
          <span className="text-lg font-bold tracking-tight text-gray-900">Polls</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            to="/login"
            className="rounded-md px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Sign in
          </Link>
          <Link to="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
