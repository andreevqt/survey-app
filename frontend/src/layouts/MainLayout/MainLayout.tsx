import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function MainLayout() {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
    </div>
  );
}
