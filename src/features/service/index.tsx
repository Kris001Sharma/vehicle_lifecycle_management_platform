import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { LayoutDashboard, Wrench, History, Menu, X } from 'lucide-react';
import { ServiceDashboard } from './ServiceDashboard';
import { JobCardsPage } from './JobCardsPage';

import { JobCardFormPage, JobCardEditPage } from './JobCardPages';
import { HistoryPage } from './HistoryPage';

import { VehicleServicePage } from './VehicleServicePage';

const SERVICE_NAV = [
  { label: 'Dashboard', path: '/service', icon: LayoutDashboard },
  { label: 'Job Cards', path: '/service/job-cards', icon: Wrench },
  { label: 'History', path: '/service/history', icon: History },
];

export default function ServicePortal() {
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
        <Routes>
          <Route path="/" element={<ServiceDashboard />} />
          <Route path="/job-cards" element={<JobCardsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/vehicle/:vehicleId" element={<VehicleServicePage />} />
          <Route path="/vehicle/:vehicleId/job-card/new" element={<JobCardFormPage />} />
          <Route path="/job-card/:recordId/edit" element={<JobCardEditPage />} />
        </Routes>
      </div>
    </div>
  );
}

