import { Link } from 'react-router-dom';
import { Button } from '../../../components/primitives/Button';
import { Avatar } from '../../../components/primitives/Avatar';
import { useHeader } from './hooks/useHeader';

export function Header() {
  const vm = useHeader();
  return (
    <header className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-gray-900 tracking-tight">Polls</Link>
      <nav className="flex items-center gap-3">
        {vm.user ? (
          <>
            <Link to="/dashboard" className="text-sm text-gray-700 hover:text-gray-900">Dashboard</Link>
            <Avatar name={vm.user.name} size="sm" />
            <span className="text-sm text-gray-700">{vm.user.name}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={vm.handleSignOut}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Link to="/login"><Button variant="secondary" size="sm">Sign in</Button></Link>
            <Link to="/register"><Button size="sm">Sign up</Button></Link>
          </>
        )}
      </nav>
    </header>
  );
}
