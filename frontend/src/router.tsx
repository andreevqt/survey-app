import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout/MainLayout';
import { DashboardShell } from './layouts/DashboardShell';
import { LandingScreen } from './routes/landing/LandingScreen';
import { LoginScreen } from './routes/auth/LoginScreen';
import { RegisterScreen } from './routes/auth/RegisterScreen';
import { MyPollsTab } from './routes/dashboard/MyPollsTab';
import { UsersTab } from './routes/dashboard/UsersTab';
import { AllPollsTab } from './routes/dashboard/AllPollsTab';
import { RequireAuth } from './auth/RequireAuth';
import { RequireAdmin } from './auth/RequireAdmin';
import { PollScreen } from './routes/poll/PollScreen';

function RedirectWithId({ template }: { template: string }) {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={template.replace(':id', id ?? '')} replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <LandingScreen /> },
  { path: '/login', element: <LoginScreen /> },
  { path: '/register', element: <RegisterScreen /> },

  {
    element: <MainLayout />,
    children: [
      { path: '/p/:slug', element: <PollScreen /> },
    ],
  },

  {
    path: '/dashboard',
    element: <RequireAuth><DashboardShell /></RequireAuth>,
    children: [
      { index: true, element: <MyPollsTab /> },
      { path: 'all-users', element: <RequireAdmin><UsersTab /></RequireAdmin> },
      { path: 'all-users/new', element: <RequireAdmin><UsersTab /></RequireAdmin> },
      { path: 'all-users/:id/edit', element: <RequireAdmin><UsersTab /></RequireAdmin> },
      { path: 'all-polls', element: <RequireAdmin><AllPollsTab /></RequireAdmin> },
      { path: 'polls/new', element: <MyPollsTab /> },
      { path: 'polls/:id/edit', element: <MyPollsTab /> },
      { path: 'polls/:id/analytics', element: <MyPollsTab /> },
      { path: 'all-polls/:id/edit', element: <RequireAdmin><AllPollsTab /></RequireAdmin> },
      { path: 'all-polls/:id/analytics', element: <RequireAdmin><AllPollsTab /></RequireAdmin> },
      { path: 'settings', element: <MyPollsTab /> },
    ],
  },

  { path: '/polls/new', element: <Navigate to="/dashboard/polls/new" replace /> },
  { path: '/polls/:id/edit', element: <RedirectWithId template="/dashboard/polls/:id/edit" /> },
  { path: '/polls/:id/analytics', element: <RedirectWithId template="/dashboard/polls/:id/analytics" /> },
  { path: '/dashboard/users', element: <Navigate to="/dashboard/all-users" replace /> },
  { path: '/dashboard/analytics', element: <Navigate to="/dashboard" replace /> },
  { path: '/admin', element: <Navigate to="/dashboard" replace /> },
  { path: '/admin/users', element: <Navigate to="/dashboard/all-users" replace /> },
  { path: '/admin/analytics', element: <Navigate to="/dashboard" replace /> },

  { path: '*', element: <Navigate to="/" replace /> },
]);
