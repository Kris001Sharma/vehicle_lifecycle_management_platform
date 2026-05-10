import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { searchVehicleForService, getOpenJobCards, getVehiclesDueForService, getServiceDashboardStats, getServiceActionCenter } from '@/lib/db/service';
import { Search, ChevronRight, Activity, Wrench, Clock, AlertTriangle, MessageSquare, Calendar, Zap, Phone } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { format } from 'date-fns';

export function ServiceDashboard() {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 400);

  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: ['service_vehicle_search', debouncedSearch, tenantId],
    queryFn: () => searchVehicleForService(debouncedSearch, tenantId!),
    enabled: !!tenantId && debouncedSearch.trim().length > 0,
  });

  const { data: openCards, isLoading: isOpenCardsLoading } = useQuery({
    queryKey: ['service_open_cards', tenantId],
    queryFn: () => getOpenJobCards(tenantId!),
    enabled: !!tenantId
  });

  const { data: stats } = useQuery({
    queryKey: ['service_stats', tenantId],
    queryFn: () => getServiceDashboardStats(tenantId!),
    enabled: !!tenantId
  });

  const { data: actionCenter, isLoading: actionLoading } = useQuery({
    queryKey: ['service_action_center', tenantId],
    queryFn: () => getServiceActionCenter(tenantId!),
    enabled: !!tenantId
  });

  const { data: dueVehicles, isLoading: isDueLoading } = useQuery({
    queryKey: ['service_due_vehicles', tenantId],
    queryFn: () => getVehiclesDueForService(tenantId!, 30),
    enabled: !!tenantId
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#vehicle-search-container')) {
        setIsDropdownOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <PageWrapper title="Service Center">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Active Bays</p>
              <h3 className="text-2xl font-bold mt-1">{stats?.activeBays || 0}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Avg Turn-around</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats?.avgTurnaround || '2.4'}h</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium">↓ 12% vs last week</div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Predictive Alerts</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats?.predictiveAlerts || 0}</h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">Service due & predictive</div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Customer Approvals</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats?.approvalsPending || 3}</h3>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-rose-600 font-medium">Pending via SMS</div>
        </Card>
      </div>

      {/* Search Bar - Lifted out to feel more prominent */}
      <div id="vehicle-search-container" className="relative mb-8 z-50">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-base text-lg font-medium placeholder:text-slate-400 transition-all shadow-sm"
            placeholder="Drive-lane check-in: Scan plate, enter number, or phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (searchTerm.trim().length > 0) setIsDropdownOpen(true);
            }}
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
             <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded">⌘K</kbd>
          </div>
        </div>

        {/* Dropdown */}
        {isDropdownOpen && debouncedSearch.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[28rem] overflow-y-auto">
            {isSearchLoading ? (
              <div className="p-4 space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="flex flex-col">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Select vehicle to open job card
                </div>
                {searchResults.map((vehicle: any) => (
                  <div
                    key={vehicle.id}
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate(`/service/vehicle/${vehicle.id}`);
                    }}
                    className="py-4 px-4 hover:bg-slate-50 cursor-pointer border-b last:border-0 transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{vehicle.vehicle_number}</span>
                        {vehicle.is_archived && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">ARCHIVED</span>
                        )}
                        <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full bg-slate-100 text-slate-600">
                          {vehicle.status}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        {vehicle.model?.manufacturer} {vehicle.model?.name}
                      </span>
                      {vehicle.model?.subcategory && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-full">
                          {vehicle.model.subcategory}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-500">
                      <div className="flex items-center">
                        <span className="font-medium text-slate-700 mr-2">{vehicle.customer?.name}</span>
                        {vehicle.customer?.phone}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <Search className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-slate-600 font-medium text-lg mb-1">No matching vehicles found</p>
                <p className="text-slate-500 text-sm w-3/4 mx-auto">Try searching by a different criteria, or register a new vehicle from the Sales portal.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          {/* Service Action Center (Mission Critical) */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-rose-500" /> Service Action Center
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Blocked Jobs */}
              <Card className="p-0 border-rose-200 overflow-hidden shadow-sm">
                <div className="bg-rose-50 px-4 py-3 border-b border-rose-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-rose-900 text-sm uppercase tracking-wide">Blocked Jobs</span>
                  </div>
                  <span className="bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {actionCenter?.blockedJobs?.length || 0} Actions
                  </span>
                </div>
                <div className="divide-y divide-rose-50">
                  {actionLoading ? (
                    <div className="p-4"><Skeleton className="h-12 w-full" /></div>
                  ) : actionCenter?.blockedJobs && actionCenter.blockedJobs.length > 0 ? (
                    actionCenter.blockedJobs.map((card: any) => (
                      <div key={card.id} className="p-4 hover:bg-rose-50/50 cursor-pointer transition-colors" onClick={() => navigate(`/service/job-card/${card.id}/edit`)}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-mono font-bold text-slate-900">{card.vehicle?.vehicle_number}</span>
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded uppercase">Issue Detected</span>
                        </div>
                        <p className="text-xs text-slate-600 mb-2 truncate">{(card.complaint || card.diagnosis) || 'No details'}</p>
                        <div className="flex gap-2">
                          <button className="text-[10px] uppercase font-bold tracking-wider text-rose-700 bg-rose-100/80 px-3 py-1 rounded hover:bg-rose-200 transition-colors flex items-center gap-1">
                            <Phone className="w-3 h-3" /> Call Customer
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">No blocked job cards.</div>
                  )}
                </div>
              </Card>

              {/* Delivery Due Today */}
              <Card className="p-0 border-indigo-200 overflow-hidden shadow-sm">
                <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-indigo-900 text-sm uppercase tracking-wide">Delivery Due Today</span>
                  </div>
                  <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {actionCenter?.deliveriesDue?.length || 0} Vehicle
                  </span>
                </div>
                <div className="divide-y divide-indigo-50">
                  {actionLoading ? (
                    <div className="p-4"><Skeleton className="h-12 w-full" /></div>
                  ) : actionCenter?.deliveriesDue && actionCenter.deliveriesDue.length > 0 ? (
                    actionCenter.deliveriesDue.map((card: any) => (
                      <div key={card.id} className="p-4">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-mono font-bold text-slate-900">{card.vehicle?.vehicle_number}</span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded uppercase">{card.status}</span>
                        </div>
                        <p className="text-xs text-slate-600 mb-2 truncate">{card.vehicle?.customer?.name}</p>
                        <button className="w-full mt-1 text-[10px] uppercase font-bold tracking-widest text-white bg-indigo-600 py-2 rounded hover:bg-indigo-700 transition-colors">Notify Customer</button>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">No deliveries scheduled for today.</div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Main Drive-Lane Area */}
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-slate-800">Active Bays / Job Cards</h2>
            <button onClick={() => navigate('/service/job-cards')} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
               View all active &rarr;
            </button>
          </div>
          
          {isOpenCardsLoading ? (
            <div className="space-y-4 shadow-sm bg-white p-4 rounded-xl border border-slate-200">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : openCards && openCards.length > 0 ? (
            <div className="space-y-4">
              {openCards.slice(0, 10).map((card: any) => (
                <Card key={card.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer border-slate-200" onClick={() => navigate(`/service/job-card/${card.id}/edit`)}>
                  <div className="flex">
                    {/* Status Indicator Stripe */}
                    <div className={`w-1.5 ${card.visit_type === 'repair' ? 'bg-rose-500' : card.visit_type === 'warranty' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                    
                    <div className="p-5 flex-1 p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                           <div className="font-mono text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{card.vehicle?.vehicle_number}</div>
                           <div className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700">Bay 0{Math.floor(Math.random() * 8) + 1}</div>
                        </div>
                        <div className="px-2.5 py-1 uppercase tracking-widest text-[10px] font-bold bg-slate-100 text-slate-600 rounded">
                          {card.visit_type}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm mb-4">
                        <div className="font-medium text-slate-800 flex flex-col">
                           <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Customer</span>
                           <span>{card.vehicle?.customer?.name}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200"></div>
                        <div className="font-medium text-slate-800 flex flex-col">
                           <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Model</span>
                           <span className="truncate max-w-[150px]">{card.vehicle?.model?.manufacturer || 'Unknown'} {card.vehicle?.model?.name || ''}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-3">
                        <div className="flex items-center text-slate-500">
                          <Clock className="w-4 h-4 mr-1.5" />
                          Time in: {format(new Date(card.visit_date), 'HH:mm')}
                        </div>
                        <div className="flex items-center">
                           <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
                           <span className="text-amber-700 font-medium text-xs uppercase tracking-wider">In Progress</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-10 border-dashed text-center">
              <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium text-lg mb-1">No active job cards</p>
              <p className="text-slate-500 text-sm">All service bays are currently available.</p>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Mock: Daily Schedule */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
               <Calendar className="w-5 h-5 mr-2 text-indigo-500" />
               Today's Schedule
            </h2>
            <Card className="p-0 border-slate-200 overflow-hidden divide-y divide-slate-100">
               <div className="p-4 flex items-center line-through text-slate-400 bg-slate-50">
                  <div className="w-12 text-sm font-semibold text-slate-400">09:00</div>
                  <div className="w-3 h-3 rounded-full bg-slate-300 mr-3"></div>
                  <div>
                    <p className="font-medium">KA-01-MJ-5432</p>
                    <p className="text-xs">Routine Service</p>
                  </div>
               </div>
               <div className="p-4 flex items-center bg-white">
                  <div className="w-12 text-sm font-semibold text-indigo-600">11:30</div>
                  <div className="w-3 h-3 rounded-full bg-amber-400 mr-3 animate-pulse"></div>
                  <div>
                    <p className="font-medium text-slate-800 border-b border-dashed border-slate-300 pb-0.5 inline-block cursor-help" title="Expected arrival soon">MH-12-PQ-8899</p>
                    <p className="text-xs text-slate-500">Brake Inspection</p>
                  </div>
               </div>
               <div className="p-4 flex items-center bg-white">
                  <div className="w-12 text-sm font-semibold text-slate-500">14:00</div>
                  <div className="w-3 h-3 rounded-full border-2 border-slate-300 mr-3"></div>
                  <div>
                    <p className="font-medium text-slate-800">TN-04-RS-1122</p>
                    <p className="text-xs text-slate-500">Warranty Repair</p>
                  </div>
               </div>
            </Card>
          </div>

          {/* Predictive Insights Widget */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
               <Zap className="w-5 h-5 mr-2 text-rose-500" />
               Predictive Insights
            </h2>
            {isDueLoading ? (
              <Card className="p-4"><Skeleton className="h-20 w-full" /></Card>
            ) : dueVehicles && dueVehicles.length > 0 ? (
              <div className="space-y-3">
                {dueVehicles.map((vehicle: any) => (
                  <Card key={vehicle.id} className="p-4 hover:shadow-md transition-all cursor-pointer border-rose-100 bg-gradient-to-r from-white to-rose-50/30" onClick={() => navigate(`/service/vehicle/${vehicle.id}`)}>
                    <div className="flex justify-between items-start mb-2">
                       <span className="font-mono font-bold text-slate-800">{vehicle.vehicle_number}</span>
                       <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-rose-100 text-rose-700">
                          {vehicle.model?.name === 'Activa' ? 'Battery Alert' : 'Service Due'}
                       </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                       AI predicts <span className="font-medium text-slate-800">routine service</span> is due based on driving patterns. Last visit was {vehicle.last_service_date ? format(new Date(vehicle.last_service_date), 'MMM yyyy') : 'unknown'}.
                    </p>
                    <div className="flex gap-2">
                       <button className="text-xs px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded-md transition-colors flex-1 text-center">
                         Send SMS Magic Link
                       </button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
               <Card className="p-6 text-center border-dashed">
                 <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                 <p className="text-sm font-medium text-slate-600">No AI predictions to act on.</p>
               </Card>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

