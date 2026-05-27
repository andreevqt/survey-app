import { Link } from 'react-router-dom';
import { Button } from '../../../components/primitives/Button';
import { AvatarMenu } from './AvatarMenu';

interface TopBarActionsProps {
  showNewPollButton: boolean;
}

export function TopBarActions({ showNewPollButton }: TopBarActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {showNewPollButton && (
        <Link to="/dashboard/polls/new">
          <Button size="sm">+ New poll</Button>
        </Link>
      )}
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => { /* placeholder */ }}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Help"
        onClick={() => { /* placeholder */ }}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>
      <AvatarMenu />
    </div>
  );
}
