import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useLogoutMutation } from '../../auth/auth-mutations';
import { Button } from '../../components/primitives/Button';
import { Avatar } from '../../components/primitives/Avatar';

export function Header() {
  const { user } = useAuth();
  const logout = useLogoutMutation();
  const navigate = useNavigate();

  return (
    <header className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-gray-900 tracking-tight">Polls</Link>
      <nav className="flex items-center gap-3">
        {user ? (
          <>
            <Link to="/dashboard" className="text-sm text-gray-700 hover:text-gray-900">Dashboard</Link>
            <Avatar name={user.name} size="sm" />
            <span className="text-sm text-gray-700">{user.name}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/') })}
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
