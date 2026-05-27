import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SidebarSearchProvider } from './SidebarSearchContext';

export function DashboardShell() {
  return (
    <SidebarSearchProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 px-8 py-7 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarSearchProvider>
  );
}
