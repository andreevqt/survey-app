import { ReactNode } from 'react';

export function AuthFormCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-9"
      style={{
        boxShadow:
          '0 20px 50px -12px rgb(31 41 55 / 0.12), 0 8px 16px -8px rgb(31 41 55 / 0.08)',
      }}
    >
      {children}
    </div>
  );
}
