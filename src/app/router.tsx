import { createBrowserRouter } from 'react-router-dom';
import WelcomePage from '@/features/welcome';
import LoginPage from '@/features/auth';
import AdminDashboard from '@/features/admin';
import SalesDashboard from '@/features/sales';
import ServiceDashboard from '@/features/service';
import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <WelcomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/admin',
    element: <AdminDashboard />,
    errorElement: <RouteErrorBoundary title="Admin Portal Error" />,
  },
  {
    path: '/sales',
    element: <SalesDashboard />,
    errorElement: <RouteErrorBoundary title="Sales Portal Error" />,
  },
  {
    path: '/service',
    element: <ServiceDashboard />,
    errorElement: <RouteErrorBoundary title="Service Portal Error" />,
  },
]);
