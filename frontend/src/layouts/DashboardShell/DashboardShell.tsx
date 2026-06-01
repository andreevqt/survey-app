import { Outlet, useMatch } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SidebarSearchProvider } from './SidebarSearchContext';
import { SearchModalProvider } from './SearchModalContext';
import { PollFormModal } from './modals/PollFormModal';
import { AnalyticsModal } from './modals/AnalyticsModal';
import { SettingsModal } from './modals/SettingsModal';
import { SearchModal } from './modals/SearchModal';
import { UserFormModal } from './modals/UserFormModal';

export function DashboardShell() {
  const newMatch = useMatch('/dashboard/polls/new');
  const editMatch = useMatch('/dashboard/polls/:id/edit');
  const analyticsMatch = useMatch('/dashboard/polls/:id/analytics');
  const adminEditMatch = useMatch('/dashboard/all-polls/:id/edit');
  const adminAnalyticsMatch = useMatch('/dashboard/all-polls/:id/analytics');
  const settingsMatch = useMatch('/dashboard/settings');
  const newUserMatch = useMatch('/dashboard/all-users/new');
  const editUserMatch = useMatch('/dashboard/all-users/:id/edit');

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
      {newMatch && <PollFormModal mode="create" />}
      {editMatch && <PollFormModal mode="edit" id={editMatch.params.id!} />}
      {analyticsMatch && <AnalyticsModal id={analyticsMatch.params.id!} />}
      {adminEditMatch && <PollFormModal mode="edit" context="admin" id={adminEditMatch.params.id!} />}
      {adminAnalyticsMatch && <AnalyticsModal id={adminAnalyticsMatch.params.id!} context="admin" />}
      {settingsMatch && <SettingsModal />}
      {newUserMatch && <UserFormModal mode="create" />}
      {editUserMatch && <UserFormModal mode="edit" id={editUserMatch.params.id!} />}
      <SearchModal />
      </SearchModalProvider>
    </SidebarSearchProvider>
  );
}
