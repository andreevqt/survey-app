import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout/MainLayout';
import { LandingScreen } from './routes/landing/LandingScreen';
import { LoginScreen } from './routes/auth/LoginScreen';
import { RegisterScreen } from './routes/auth/RegisterScreen';
import { DashboardScreen } from './routes/dashboard/DashboardScreen';
import { MyPollsTab } from './routes/dashboard/MyPollsTab';
import { UsersTab } from './routes/dashboard/UsersTab';
import { AnalyticsTab } from './routes/dashboard/AnalyticsTab';
import { RequireAuth } from './auth/RequireAuth';
import { RequireAdmin } from './auth/RequireAdmin';
import { PollFormScreen } from './routes/polls/PollFormScreen';
import { PollScreen } from './routes/poll/PollScreen';
import { OwnerAnalyticsScreen } from './routes/polls/analytics/OwnerAnalyticsScreen';

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <LandingScreen /> },
      { path: '/login', element: <LoginScreen /> },
      { path: '/register', element: <RegisterScreen /> },
      { path: '/p/:slug', element: <PollScreen /> },

      {
        path: '/dashboard',
        element: <RequireAuth><DashboardScreen /></RequireAuth>,
        children: [
          { index: true, element: <MyPollsTab /> },
          { path: 'users', element: <RequireAdmin><UsersTab /></RequireAdmin> },
          { path: 'analytics', element: <RequireAdmin><AnalyticsTab /></RequireAdmin> },
        ],
      },

      { path: '/polls/new', element: <RequireAuth><PollFormScreen /></RequireAuth> },
      { path: '/polls/:id/edit', element: <RequireAuth><PollFormScreen /></RequireAuth> },
      { path: '/polls/:id/analytics', element: <RequireAuth><OwnerAnalyticsScreen /></RequireAuth> },

      { path: '/admin', element: <Navigate to="/dashboard" replace /> },
      { path: '/admin/users', element: <Navigate to="/dashboard/users" replace /> },
      { path: '/admin/analytics', element: <Navigate to="/dashboard/analytics" replace /> },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
