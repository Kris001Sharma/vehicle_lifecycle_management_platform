import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { LayoutDashboard, Search, Wrench, History, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 relative">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 flex items-center px-4 z-50">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-300 p-2 mr-2">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="text-white font-bold tracking-tight text-base truncate">
          {SERVICE_NAV.find(item => location?.pathname === item.path || (item.path !== '/service' && location?.pathname?.startsWith(item.path)))?.label || 'VLM Service'}
        </div>
      </div>

      {/* Sidebar - Desktop & Mobile Overlay */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 bg-slate-900 w-64 flex-shrink-0
        ${mobileMenuOpen ? 'translate-x-0 top-14 md:top-0 h-[calc(100vh-3.5rem)] md:h-screen' : '-translate-x-full'}
      `}>
        <Sidebar 
          role="service" 
          navItems={SERVICE_NAV} 
          currentPath="/service" 
          onItemClick={() => setMobileMenuOpen(false)} 
        />
      </div>

      <div className="flex-1 w-0 overflow-y-auto bg-slate-50 relative pt-14 md:pt-0" onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}>
        <PageWrapper title="Service Dashboard">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <Card title="Active Jobs" className="p-5 border-slate-200 shadow-sm">
              <Skeleton className="h-10 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
            <Card title="Pending Diagnostics" className="p-5 border-slate-200 shadow-sm">
              <Skeleton className="h-10 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
            <Card title="Completed Today" className="p-5 border-slate-200 shadow-sm">
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
    </div>
  );
}

