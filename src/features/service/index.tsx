import { PageWrapper } from '@/components/layout/PageWrapper';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { LayoutDashboard, Search, Wrench, History } from 'lucide-react';
import { ComponentErrorBoundary } from '@/components/errors/ComponentErrorBoundary';

const SERVICE_NAV = [
  { label: 'Dashboard', path: '/service', icon: LayoutDashboard },
  { label: 'Search Vehicle', path: '/service/search', icon: Search },
  { label: 'Job Cards', path: '/service/jobs', icon: Wrench },
  { label: 'History', path: '/service/history', icon: History },
];

// Placeholders for future components
const VehicleSearchPanel = () => <div className="p-4 border border-dashed text-gray-400">Vehicle search panel placeholder</div>;
const JobCardForm = () => <div className="p-4 border border-dashed text-gray-400">Job card form placeholder</div>;
const ArchiveRehydrationPanel = () => <div className="p-4 border border-dashed text-gray-400">Archive rehydration panel placeholder</div>;
const FileUploader = () => <div className="p-4 border border-dashed text-gray-400">File uploader placeholder</div>;

export default function ServiceDashboard() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="service" navItems={SERVICE_NAV} currentPath="/service" />
      <PageWrapper title="Service Dashboard">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ComponentErrorBoundary componentName="Vehicle search panel">
            <VehicleSearchPanel />
          </ComponentErrorBoundary>
          
          <ComponentErrorBoundary componentName="Job card form">
            <JobCardForm />
          </ComponentErrorBoundary>
          
          <ComponentErrorBoundary componentName="Archive rehydration panel">
            <ArchiveRehydrationPanel />
          </ComponentErrorBoundary>
          
          <ComponentErrorBoundary componentName="File uploader">
            <FileUploader />
          </ComponentErrorBoundary>
        </div>
      </PageWrapper>
    </div>
  );
}

