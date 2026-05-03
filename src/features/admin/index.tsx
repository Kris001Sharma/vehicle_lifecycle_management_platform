import { Routes, Route, useLocation } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { LayoutDashboard, PackageSearch, Users, Settings, History } from 'lucide-react';
import { AuditLogPage } from './AuditLogPage';
import { UserListPage } from './UserListPage';
import { CatalogPage } from './catalog/CatalogPage';
import { VariantFormV2 } from './catalog/VariantFormV2';
import { ModelFormPage } from './catalog/ModelFormPage';
import { CatalogSettingsPage } from './settings/CatalogSettingsPage';

const ADMIN_NAV = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { 
    label: 'Catalog', 
    path: '/admin/catalog', 
    icon: PackageSearch,
    children: [
        { label: 'Models & Variants', path: '/admin/catalog' },
    ]
  },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Audit Log', path: '/admin/audit-logs', icon: History },
  { 
    label: 'Settings', 
    path: '/admin/settings/catalog', 
    icon: Settings,
    children: [
        { label: 'Catalog Settings', path: '/admin/settings/catalog' },
    ]
  },
];

function AdminDashboardContent() {
  return (
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
  );
}

export default function AdminDashboard() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="admin" navItems={ADMIN_NAV} currentPath={location.pathname} />
      <div className="flex-1 w-0 overflow-y-auto bg-slate-50 relative">
        <Routes>
          <Route path="/" element={<AdminDashboardContent />} />
          <Route path="/audit-logs" element={<AuditLogPage />} />
          <Route path="/users" element={<UserListPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/catalog/models/new" element={<ModelFormPage />} />
          <Route path="/catalog/models/:modelId/edit" element={<ModelFormPage />} />
          <Route path="/catalog/variants/new" element={<VariantFormV2 />} />
          <Route path="/catalog/variants/:variantId/edit" element={<VariantFormV2 />} />
          <Route path="/settings/catalog" element={<CatalogSettingsPage />} />
        </Routes>
      </div>
    </div>
  );
}


