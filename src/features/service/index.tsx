import { Link } from 'react-router-dom';
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
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-md flex justify-between items-center">
          <p className="text-sm font-medium">You are logged in as service</p>
          <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-800 underline">Back to portal selection</Link>
        </div>
        
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
