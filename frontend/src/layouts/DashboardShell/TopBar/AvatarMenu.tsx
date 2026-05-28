import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../../../components/primitives/Avatar';
import { useAuth } from '../../../auth/useAuth';
import { useLogoutMutation } from '../../../auth/auth-mutations';

export function AvatarMenu() {
  const { user } = useAuth();
  const logout = useLogoutMutation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignOut = () => {
    setOpen(false);
    logout.mutate(undefined, { onSuccess: () => navigate('/') });
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Account';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 ml-1 pl-1 pr-2.5 py-1 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <Avatar name={user?.name ?? '?'} size="sm" />
        <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">{firstName}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" className="text-gray-400" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-md bg-white border border-gray-200 shadow-lg py-1 z-20"
        >
          <li role="menuitem">
            <Link
              to="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Your profile
            </Link>
          </li>
          <li role="menuitem">
            <Link
              to="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Settings
            </Link>
          </li>
          <li role="separator" aria-hidden="true" className="my-1 border-t border-gray-100" />
          <li role="menuitem">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Sign out
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
