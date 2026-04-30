import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Settings, ShoppingCart, Wrench } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';

export default function WelcomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const appName = import.meta.env.VITE_APP_NAME || 'VLM Platform';

  // Auto-redirect to the respective dashboard based on user role
  useEffect(() => {
    if (user) {
      navigate(`/${user.role}`, { replace: true });
    }
  }, [user, navigate]);

  const portals = [
    {
      id: 'admin',
      title: 'Admin Portal',
      description: 'System administration, catalog management, and user access control.',
      icon: Settings,
      color: 'indigo',
      path: '/admin',
      roles: ['admin']
    },
    {
      id: 'sales',
      title: 'Sales Portal',
      description: 'Vehicle sales, customer CRM, and fleet management operations.',
      icon: ShoppingCart,
      color: 'emerald',
      path: '/sales',
      roles: ['admin', 'sales']
    },
    {
      id: 'service',
      title: 'Service Portal',
      description: 'Vehicle servicing, job card management, and diagnostic logging.',
      icon: Wrench,
      color: 'amber',
      path: '/service',
      roles: ['admin', 'service']
    }
  ];

  const allowedPortals = portals.filter(p => !user || p.roles.includes(user.role));

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{appName}</h1>
        <p className="text-slate-600">
          Hello, {user?.fullName || 'User'}. Select a portal to continue.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
        {allowedPortals.map((portal) => {
          const Icon = portal.icon;
          return (
            <Card key={portal.id} className="hover:border-slate-300 transition-colors flex flex-col h-full bg-white">
              <div className="p-6 flex flex-col flex-1">
                <div className={`w-12 h-12 bg-${portal.color}-50 rounded-lg flex items-center justify-center text-${portal.color}-600 mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">{portal.title}</h2>
                <p className="text-sm text-slate-500 mb-8 flex-1">
                  {portal.description}
                </p>
                <Button onClick={() => navigate(portal.path)} className="w-full">
                  Continue to {portal.id.charAt(0).toUpperCase() + portal.id.slice(1)}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
