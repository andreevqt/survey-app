import { ReactNode } from 'react';
import { Card } from '../../components/primitives/Card';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex justify-center py-16 px-6">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </Card>
    </div>
  );
}
