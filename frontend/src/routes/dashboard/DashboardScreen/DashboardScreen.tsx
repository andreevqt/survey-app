import { Link, Outlet } from 'react-router-dom';
import { Button } from '../../../components/primitives/Button';
import { TabStrip } from '../../../components/primitives/TabStrip';
import { useDashboardScreen } from './hooks/useDashboardScreen';

export function DashboardScreen() {
  const { userName, tabs } = useDashboardScreen();

  return (
    <section className="max-w-4xl mx-auto py-12 px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {userName && (
            <p className="mt-1 text-sm text-gray-600">Welcome back, {userName}</p>
          )}
        </div>
        <Link to="/polls/new"><Button>Create Poll</Button></Link>
      </div>

      <div className="mt-6">
        <TabStrip tabs={tabs} />
      </div>

      <Outlet />
    </section>
  );
}
