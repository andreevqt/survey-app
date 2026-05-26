import { Card } from '../../components/primitives/Card';
import { useAuth } from '../../auth/useAuth';

export function DashboardScreen() {
  const { user } = useAuth();
  return (
    <section className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">Welcome back, {user?.name}.</p>
      <Card className="mt-8 text-center">
        <p className="text-3xl">📋</p>
        <p className="mt-3 text-base font-semibold text-gray-900">No polls yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Poll creation lands in Plan 2 — for now you've successfully signed in.
        </p>
      </Card>
    </section>
  );
}
