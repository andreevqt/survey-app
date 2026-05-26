import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  return (
    <div className="min-h-screen flex">
      <AdminSidebar />
      <main className="flex-1 bg-gray-50"><Outlet /></main>
    </div>
  );
}
