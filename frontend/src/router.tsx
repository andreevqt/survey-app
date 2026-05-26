import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout/MainLayout';
import { LandingScreen } from './routes/landing/LandingScreen';
import { LoginScreen } from './routes/auth/LoginScreen';
import { RegisterScreen } from './routes/auth/RegisterScreen';
import { DashboardScreen } from './routes/dashboard/DashboardScreen';
import { RequireAuth } from './auth/RequireAuth';
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
      { path: '/dashboard', element: <RequireAuth><DashboardScreen /></RequireAuth> },
      { path: '/polls/new', element: <RequireAuth><PollFormScreen /></RequireAuth> },
      { path: '/polls/:id/edit', element: <RequireAuth><PollFormScreen /></RequireAuth> },
      { path: '/polls/:id/analytics', element: <RequireAuth><OwnerAnalyticsScreen /></RequireAuth> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
