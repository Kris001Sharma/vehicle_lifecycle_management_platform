import { PageWrapper } from '@/components/layout/PageWrapper';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { LayoutDashboard, Search, Wrench, History } from 'lucide-react';

const SERVICE_NAV = [
  { label: 'Dashboard', path: '/service', icon: LayoutDashboard },
  { label: 'Search Vehicle', path: '/service/search', icon: Search },
  { label: 'Job Cards', path: '/service/jobs', icon: Wrench },
  { label: 'History', path: '/service/history', icon: History },
];

export default function ServiceDashboard() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="service" navItems={SERVICE_NAV} currentPath="/service" />
      <PageWrapper title="Service Dashboard">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Active Jobs">
            <Skeleton className="h-10 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
          <Card title="Pending Diagnostics">
            <Skeleton className="h-10 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
          <Card title="Completed Today">
            <Skeleton className="h-10 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
        </div>
      </PageWrapper>
    </div>
  );
}
