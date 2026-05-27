import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '../../components/primitives/Button';
import { TabStrip, type TabStripItem } from '../../components/primitives/TabStrip';
import { useAuth } from '../../auth/useAuth';

type TabMeta = { title: string; subtitle?: string; showCreateCta: boolean };

function tabMetaForPath(pathname: string, userName?: string): TabMeta {
  if (pathname.startsWith('/dashboard/users')) {
    return { title: 'Users', showCreateCta: false };
  }
  if (pathname.startsWith('/dashboard/analytics')) {
    return { title: 'Analytics', showCreateCta: false };
  }
  return {
    title: 'My polls',
    subtitle: userName ? `Welcome back, ${userName}.` : undefined,
    showCreateCta: true,
  };
}

export function DashboardScreen() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const meta = tabMetaForPath(pathname, user?.name);

  const tabs: TabStripItem[] =
    user?.role === 'ADMIN'
      ? [
          { to: '/dashboard', label: 'My polls', end: true },
          { to: '/dashboard/users', label: 'Users' },
          { to: '/dashboard/analytics', label: 'Analytics' },
        ]
      : [{ to: '/dashboard', label: 'My polls', end: true }];

  return (
    <section className="max-w-4xl mx-auto py-12 px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{meta.title}</h1>
          {meta.subtitle && <p className="mt-1 text-sm text-gray-600">{meta.subtitle}</p>}
        </div>
        {meta.showCreateCta && (
          <Link to="/polls/new"><Button>Create poll</Button></Link>
        )}
      </div>

      <div className="mt-6">
        <TabStrip tabs={tabs} />
      </div>

      <Outlet />
    </section>
  );
}
