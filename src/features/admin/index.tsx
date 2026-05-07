import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { LayoutDashboard, PackageSearch, Users, Settings, History, Menu, X } from 'lucide-react';
import { AuditLogPage } from './AuditLogPage';
import { UserListPage } from './UserListPage';
import { CatalogPage } from './catalog/CatalogPage';
import { VariantFormV2 } from './catalog/VariantFormV2';
import { ModelFormPage } from './catalog/ModelFormPage';
import { CatalogSettingsPage } from './settings/CatalogSettingsPage';
import { AchievementSettingsPage } from './settings/AchievementSettingsPage';

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
        { label: 'Achievement Settings', path: '/admin/settings/achievements' },
    ]
  },
];

function AdminDashboardContent() {
  return (
    <PageWrapper title="Admin Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <Card title="Total Users" className="p-5 border-slate-200 shadow-sm">
          <Skeleton className="h-10 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </Card>
        <Card title="Active Listings" className="p-5 border-slate-200 shadow-sm">
          <Skeleton className="h-10 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </Card>
        <Card title="System Alerts" className="p-5 border-slate-200 shadow-sm">
          <Skeleton className="h-10 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </Card>
      </div>
    </PageWrapper>
  );
}

export default function AdminDashboard() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 relative">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 flex items-center px-4 z-50">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-300 p-2 mr-2">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="text-white font-bold tracking-tight text-base truncate">
          {ADMIN_NAV.find(item => location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path)))?.label || 'VLM Admin'}
        </div>
      </div>

      {/* Sidebar - Desktop & Mobile Overlay */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 bg-slate-900 w-64 flex-shrink-0
        ${mobileMenuOpen ? 'translate-x-0 top-14 md:top-0 h-[calc(100vh-3.5rem)] md:h-screen' : '-translate-x-full'}
      `}>
        <Sidebar 
          role="admin" 
          navItems={ADMIN_NAV} 
          currentPath={location.pathname} 
          onItemClick={() => setMobileMenuOpen(false)} 
        />
      </div>

      <div className="flex-1 w-0 overflow-y-auto bg-slate-50 relative pt-14 md:pt-0" onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}>
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
          <Route path="/settings/achievements" element={<AchievementSettingsPage />} />
        </Routes>
      </div>
    </div>
  );
}


