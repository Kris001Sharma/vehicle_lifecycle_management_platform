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
