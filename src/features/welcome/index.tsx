import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Settings, ShoppingCart, Wrench } from 'lucide-react';

export default function WelcomePage() {
  const navigate = useNavigate();
  const appName = import.meta.env.VITE_APP_NAME || 'VLM Platform';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{appName}</h1>
        <p className="text-slate-600">Select your portal to continue</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {/* Admin Card */}
        <Card className="hover:border-slate-300 transition-colors flex flex-col h-full">
          <div className="p-6 flex flex-col flex-1">
            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-4">
              <Settings className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Admin Portal</h2>
            <p className="text-sm text-slate-500 mb-8 flex-1">
              System administration, catalog management, and user access control.
            </p>
            <Button onClick={() => navigate('/admin')} className="w-full">
              Continue as Admin
            </Button>
          </div>
        </Card>

        {/* Sales Card */}
        <Card className="hover:border-slate-300 transition-colors flex flex-col h-full">
          <div className="p-6 flex flex-col flex-1">
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 mb-4">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Sales Portal</h2>
            <p className="text-sm text-slate-500 mb-8 flex-1">
              Vehicle sales, customer CRM, and fleet management operations.
            </p>
            <Button onClick={() => navigate('/sales')} className="w-full">
              Continue as Sales
            </Button>
          </div>
        </Card>

        {/* Service Card */}
        <Card className="hover:border-slate-300 transition-colors flex flex-col h-full">
          <div className="p-6 flex flex-col flex-1">
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 mb-4">
              <Wrench className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Service Portal</h2>
            <p className="text-sm text-slate-500 mb-8 flex-1">
              Vehicle servicing, job card management, and diagnostic logging.
            </p>
            <Button onClick={() => navigate('/service')} className="w-full">
              Continue as Service
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
