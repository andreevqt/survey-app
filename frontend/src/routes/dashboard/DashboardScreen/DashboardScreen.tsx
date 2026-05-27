import { Link, Outlet } from 'react-router-dom';
import { Button } from '../../../components/primitives/Button';
import { TabStrip } from '../../../components/primitives/TabStrip';
import { useDashboardScreen } from './hooks/useDashboardScreen';

export function DashboardScreen() {
  const { meta, tabs } = useDashboardScreen();

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
