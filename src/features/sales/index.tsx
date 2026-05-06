import { Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { LayoutDashboard, Users, Car, PlusCircle, Package, BookOpen } from 'lucide-react';
import { SalesDashboard } from './SalesDashboard';
import { CustomersPage } from './customers/CustomersPage';
import { CustomerDetailPage } from './customers/CustomerDetailPage';
import { CustomerFormPage } from './customers/CustomerFormPage';
import { VehiclesPage } from './vehicles/VehiclesPage';
import { VehicleDetailPage } from './vehicles/VehicleDetailPage';
import { NewSalePage } from './vehicles/NewSalePage';
import { InventoryPage } from './inventory/InventoryPage';
import { PreBookingsPage } from './pre-bookings/PreBookingsPage';

const SALES_NAV = [
  { label: 'Dashboard', path: '/sales', icon: LayoutDashboard },
  { label: 'Customers', path: '/sales/customers', icon: Users },
  { label: 'Vehicles', path: '/sales/vehicles', icon: Car },
  { label: 'Inventory', path: '/sales/inventory', icon: Package },
  { label: 'Pre-bookings', path: '/sales/pre-bookings', icon: BookOpen },
  { label: 'New Sale', path: '/sales/vehicles/new', icon: PlusCircle, isPrimary: true },
];

export default function SalesPortal() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="sales" navItems={SALES_NAV} currentPath={location.pathname} />
      <div className="flex-1 w-0 overflow-y-auto bg-slate-50 relative">
        <Routes>
          <Route path="/" element={<SalesDashboard />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/new" element={<CustomerFormPage />} />
          <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
          <Route path="/customers/:customerId/edit" element={<CustomerFormPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/vehicles/new" element={<NewSalePage />} />
          <Route path="/vehicles/:vehicleId" element={<VehicleDetailPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/pre-bookings" element={<PreBookingsPage />} />
        </Routes>
      </div>
    </div>
  );
}
