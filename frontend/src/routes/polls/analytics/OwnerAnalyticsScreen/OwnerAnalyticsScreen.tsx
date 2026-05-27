import { Link } from 'react-router-dom';
import { Card } from '../../../../components/primitives/Card';
import { Spinner } from '../../../../components/primitives/Spinner';
import { Button } from '../../../../components/primitives/Button';
import { AnalyticsView } from '../../../../components/analytics/AnalyticsView';
import { useOwnerAnalyticsScreen } from './hooks/useOwnerAnalyticsScreen';

export function OwnerAnalyticsScreen() {
  const vm = useOwnerAnalyticsScreen();

  if (vm.status === 'loading') return <div className="flex justify-center py-16"><Spinner size={28} /></div>;
  if (vm.status === 'error') {
    return (
      <Card className="max-w-md mx-auto mt-16 text-center">
        <p className="text-sm text-red-600">Could not load analytics.</p>
        <Link to="/dashboard" className="mt-3 inline-block"><Button variant="secondary" size="sm">Back to dashboard</Button></Link>
      </Card>
    );
  }

  return (
    <section className="max-w-3xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500">Analytics</p>
          <h1 className="text-2xl font-bold text-gray-900">{vm.data!.title}</h1>
        </div>
        <Link to="/dashboard"><Button variant="secondary" size="sm">Back</Button></Link>
      </div>
      <AnalyticsView analytics={vm.data!} />
    </section>
  );
}
