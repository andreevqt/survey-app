import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SidebarSearchProvider } from './SidebarSearchContext';
import { SearchModalProvider } from './SearchModalContext';
import { SearchModal } from './modals/SearchModal';

export function DashboardShell() {
  return (
    <SidebarSearchProvider>
      <SearchModalProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 py-7 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
      <SearchModal />
      </SearchModalProvider>
    </SidebarSearchProvider>
  );
}
