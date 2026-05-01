import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import WelcomePage from '@/features/welcome';
import LoginPage from '@/features/auth';
import AdminDashboard from '@/features/admin';
import SalesDashboard from '@/features/sales';
import ServiceDashboard from '@/features/service';
import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';
import { AuthGuard } from '@/components/layout/AuthGuard';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/',
        element: (
          <AuthGuard>
            <WelcomePage />
          </AuthGuard>
        ),
      },
      {
        path: '/admin/*',
        element: (
          <RouteErrorBoundary portalName="Admin Portal">
            <AuthGuard allowedRoles={['admin']}>
              <AdminDashboard />
            </AuthGuard>
          </RouteErrorBoundary>
        ),
      },
      {
        path: '/sales/*',
        element: (
          <RouteErrorBoundary portalName="Sales Portal">
            <AuthGuard allowedRoles={['sales']}>
              <SalesDashboard />
            </AuthGuard>
          </RouteErrorBoundary>
        ),
      },
      {
        path: '/service/*',
        element: (
          <RouteErrorBoundary portalName="Service Portal">
            <AuthGuard allowedRoles={['service']}>
              <ServiceDashboard />
            </AuthGuard>
          </RouteErrorBoundary>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
