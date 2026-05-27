import { Card } from '../../components/primitives/Card';
import { Spinner } from '../../components/primitives/Spinner';
import { useSystemAnalytics } from '../../api/queries/admin';

function Stat({ title, value, hint }: { title: string; value: number; hint?: string }) {
  return (
    <Card size="sm">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </Card>
  );
}

export function AnalyticsTab() {
  const q = useSystemAnalytics();
  return (
    <div className="mt-6">
      {q.isLoading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : q.isError || !q.data ? (
        <p className="text-sm text-red-600">Could not load system analytics.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Stat title="Total users" value={q.data.totalUsers} hint={`${q.data.totalAdmins} admin${q.data.totalAdmins === 1 ? '' : 's'}`} />
          <Stat title="Total polls" value={q.data.totalPolls} hint={`${q.data.activePolls} active`} />
          <Stat title="Total responses" value={q.data.totalResponses} />
        </div>
      )}
    </div>
  );
}
