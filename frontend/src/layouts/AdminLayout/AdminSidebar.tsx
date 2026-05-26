import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useLogoutMutation } from '../../auth/auth-mutations';
import { Avatar } from '../../components/primitives/Avatar';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard' },
  { key: 'users',     label: 'Users',     to: '/admin/users' },
  { key: 'analytics', label: 'Analytics', to: '/admin/analytics' },
] as const;

export function AdminSidebar() {
  const { user } = useAuth();
  const logout = useLogoutMutation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-gray-300 flex flex-col">
      <div className="h-16 px-6 flex items-center gap-2 border-b border-gray-800">
        <img src="/logo-mark.svg" width={24} height={24} alt="" className="hidden sm:inline" />
        <span className="text-lg font-bold text-white tracking-tight">Polls</span>
        <span className="ml-1 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white tracking-wider">
          ADMIN
        </span>
      </div>
      <nav className="flex-1 p-3">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <li key={item.key}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${
                    active ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name} size="sm" variant="dark" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/') })}
          className="mt-3 w-full text-left rounded-md px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
