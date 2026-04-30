import { Link } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { LayoutDashboard, PackageSearch, Users, Settings } from 'lucide-react';

const ADMIN_NAV = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Catalog', path: '/admin/catalog', icon: PackageSearch },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

export default function AdminDashboard() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="admin" navItems={ADMIN_NAV} currentPath="/admin" />
      <PageWrapper title="Admin Dashboard">
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-md flex justify-between items-center">
          <p className="text-sm font-medium">You are logged in as admin</p>
          <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-800 underline">Back to portal selection</Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Total Users">
            <Skeleton className="h-10 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
          <Card title="Active Listings">
            <Skeleton className="h-10 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
          <Card title="System Alerts">
            <Skeleton className="h-10 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
        </div>
      </PageWrapper>
    </div>
  );
}
