import { Link } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { LayoutDashboard, Users, Car, PlusCircle } from 'lucide-react';

const SALES_NAV = [
  { label: 'Dashboard', path: '/sales', icon: LayoutDashboard },
  { label: 'Customers', path: '/sales/customers', icon: Users },
  { label: 'Vehicles', path: '/sales/vehicles', icon: Car },
  { label: 'New Sale', path: '/sales/new-sale', icon: PlusCircle },
];

export default function SalesDashboard() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="sales" navItems={SALES_NAV} currentPath="/sales" />
      <PageWrapper title="Sales Dashboard">
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-md flex justify-between items-center">
          <p className="text-sm font-medium">You are logged in as sales</p>
          <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-800 underline">Back to portal selection</Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Monthly Sales">
            <Skeleton className="h-10 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
          <Card title="Active Leads">
            <Skeleton className="h-10 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
          <Card title="Available Inventory">
            <Skeleton className="h-10 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
        </div>
      </PageWrapper>
    </div>
  );
}
