import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getVehicleWithFullDetails } from '@/lib/db/vehicles';
import { getServiceHistory, closeServiceRecord } from '@/lib/db/service';
import { SpecDisplay } from '@/components/catalog/SpecDisplay';
import { Phone, ArrowLeft, PlusCircle, Wrench, ChevronDown, ChevronUp, FileText, ChevronLeft, ChevronRight, Edit2, History as HistoryIcon, Activity, Zap, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function VehicleServicePage() {
  const { vehicleId } = useParams();
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [specsOpen, setSpecsOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [closeRecordId, setCloseRecordId] = useState<string | null>(null);

  const { data: result, isLoading: vehicleLoading } = useQuery({
    queryKey: ['service_vehicle', vehicleId, tenantId],
    queryFn: () => getVehicleWithFullDetails(vehicleId!, tenantId!),
    enabled: !!vehicleId && !!tenantId,
  });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['service_history', vehicleId, tenantId, page],
    queryFn: () => getServiceHistory(vehicleId!, tenantId!, page, 10),
    enabled: !!vehicleId && !!tenantId && (!result?.data?.is_archived),
  });

  if (vehicleLoading) {
    return (
      <PageWrapper title="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  const vehicle = result?.data;

  if (!vehicle || result.error) {
    return (
      <PageWrapper title="Vehicle not found">
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-slate-200">
          <Wrench className="w-12 h-12 text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Vehicle not found</h2>
          <p className="text-slate-500 mb-6 text-center max-w-sm">This vehicle may have been deleted or you don't have access to it.</p>
          <Link to="/service" className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to search
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const categorySlug = vehicle.variant?.model?.category?.slug || '';
  const subcategorySlug = vehicle.variant?.model?.subcategory || '';
  const powertrainSlug = vehicle.variant?.powertrain?.slug || '';
  const hasSpecs = vehicle.variant?.specs && Object.keys(vehicle.variant.specs).length > 0;
  
  const standardFeatures = vehicle.features?.filter((f: any) => f.is_standard && f.feature) || [];

  const handleCloseConfirm = async () => {
    if (!closeRecordId) return;
    try {
      const res = await closeServiceRecord(closeRecordId, tenantId!, user!.id);
      if (res.error) {
        if (res.error === 'WORK_DONE_REQUIRED') {
          showToast('Please edit the job card and fill the work performed section before closing.', 'error');
          navigate(`/service/job-card/${closeRecordId}/edit`);
        } else if (res.error === 'ALREADY_CLOSED') {
          showToast('This job card is already closed.', 'error');
        } else {
          showToast('Failed to close job card', 'error');
        }
      } else {
        showToast('The job card has been successfully closed.', 'success');
        refetchHistory();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setCloseRecordId(null);
    }
  };

  return (
    <PageWrapper
      title={vehicle.vehicle_number}
      actions={
        <Link to="/service" className="text-slate-500 hover:text-slate-700 font-medium flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" /> Search
        </Link>
      }
    >
      {vehicle.is_archived && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 relative">
          <p className="text-sm text-amber-800 font-medium">
            This vehicle's service history has been archived.
            Archived history loading is not yet available in this version. 
            Contact your administrator to access full history.
          </p>
        </div>
      )}

      {/* 1. Vehicle Identity Card */}
      <Card className="p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-mono relative font-bold tracking-tight text-slate-800">
                {vehicle.vehicle_number}
              </h2>
              {vehicle.is_archived ? (
                 <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded">ARCHIVED</span>
              ) : (
                <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded uppercase">
                  {vehicle.status}
                </span>
              )}
            </div>
            
            <div className="text-slate-600 font-medium mb-1">
               {vehicle.registration_plate && <span className="mr-3">Plate: {vehicle.registration_plate}</span>}
               {vehicle.chassis_number && <span>Chassis: {vehicle.chassis_number}</span>}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Link to={`/sales/vehicles/${vehicle.id}`} className="text-sm font-semibold text-indigo-600 hover:underline">
                {vehicle.variant?.model?.manufacturer} {vehicle.variant?.model?.name}
              </Link>
              <span className="mx-1 text-slate-300">&bull;</span>
              {vehicle.variant?.model?.subcategory && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 rounded-full">
                  {vehicle.variant?.model?.subcategory}
                </span>
              )}
              {vehicle.variant?.powertrain && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded-full">
                  {vehicle.variant?.powertrain?.display_label}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-4">
             <Button 
               disabled={vehicle.is_archived}
               onClick={() => navigate(`/service/vehicle/${vehicle.id}/job-card/new`)}
               title={vehicle.is_archived ? 'Archived vehicles cannot be serviced' : 'Create new job card'}
             >
               <PlusCircle className="h-4 w-4 mr-2" />
               New job card
             </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
           {vehicle.customer ? (
             <>
               <Link to={`/sales/customers/${vehicle.customer.id}`} className="text-sm font-medium text-slate-800 hover:text-indigo-600">
                 {vehicle.customer.name}
               </Link>
               <span className="mx-1 text-slate-300">&bull;</span>
               <a href={`tel:${vehicle.customer.phone}`} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center">
                 <Phone className="w-3 h-3 mr-1" />
                 {vehicle.customer.phone}
               </a>
             </>
           ) : (
             <span className="text-sm text-slate-500 italic">No customer assigned</span>
           )}
        </div>
      </Card>

      {/* 2. Predictive Insights / ML Mockup */}
      {!vehicle.is_archived && (
        <Card className="mb-6 border-rose-100 bg-gradient-to-r from-rose-50/50 to-white overflow-hidden p-0 relative">
          <div className="absolute top-0 right-0 p-6 opacity-10">
             <Activity className="w-24 h-24 text-rose-500" />
          </div>
          <div className="p-6 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <div className="flex items-center gap-2 mb-2">
                 <Zap className="h-5 w-5 text-rose-500" />
                 <h3 className="font-bold text-slate-800 text-lg">Predictive Maintenance Alert</h3>
               </div>
               <p className="text-slate-600 max-w-2xl text-sm leading-relaxed">
                 Based on the variant's wear profile and current mileage ({vehicle.total_service_count ? 'estimated 45,000 km' : 'unknown'}), the <span className="font-bold text-slate-800">Timing Belt</span> and <span className="font-bold text-slate-800">Brake Pads</span> are predicted to require replacement within the next 30 days.
               </p>
            </div>
            <div className="flex gap-3">
               <Button variant="secondary" className="bg-white border-slate-200">Dismiss</Button>
               <Button className="bg-rose-600 hover:bg-rose-700">Add to Estimate</Button>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Modern Tabbed Layout (Vehicle Specs) */}
      {hasSpecs && (
        <Card className="mb-6 overflow-hidden">
          <button 
            className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none hover:bg-slate-50 transition-colors"
            onClick={() => setSpecsOpen(!specsOpen)}
          >
            <span className="font-semibold text-slate-800">Specifications</span>
            <div className="flex items-center text-slate-400 text-sm">
              {specsOpen ? (
                <>Hide specifications <ChevronUp className="w-4 h-4 ml-1" /></>
              ) : (
                <>Show specifications <ChevronDown className="w-4 h-4 ml-1" /></>
              )}
            </div>
          </button>
          
          {specsOpen && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100">
              <SpecDisplay 
                categorySlug={categorySlug}
                subcategorySlug={subcategorySlug}
                powertrainSlug={powertrainSlug}
                specs={vehicle.variant.specs}
              />
            </div>
          )}
        </Card>
      )}

      {/* 3. Standard Features */}
      {standardFeatures.length > 0 && (
         <Card className="mb-8 overflow-hidden">
           <button 
             className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none hover:bg-slate-50 transition-colors"
             onClick={() => setFeaturesOpen(!featuresOpen)}
           >
             <span className="font-semibold text-slate-800">Standard Features</span>
             <div className="flex items-center text-slate-400 text-sm">
               {featuresOpen ? (
                 <>Hide features <ChevronUp className="w-4 h-4 ml-1" /></>
               ) : (
                 <>Show features <ChevronDown className="w-4 h-4 ml-1" /></>
               )}
             </div>
           </button>
           
           {featuresOpen && (
             <div className="px-6 pb-6 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap gap-2">
                  {standardFeatures.map((f: any) => (
                    <span key={f.feature.id} className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                      {f.feature.name}
                    </span>
                  ))}
                </div>
             </div>
           )}
         </Card>
      )}

      {/* 4. Service History */}
      {!vehicle.is_archived && (
        <div className="mb-12 relative">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-800">
                Service history ({historyData?.totalCount || vehicle.total_service_count || 0})
              </h3>
              {vehicle.last_service_date && (
                <p className="text-sm text-slate-500 mt-1">Last serviced: {format(new Date(vehicle.last_service_date), 'dd MMM yyyy')}</p>
              )}
            </div>
            
            <Button 
               variant="secondary"
               size="sm"
               onClick={() => {
                 window.scrollTo({ top: 0, behavior: 'smooth' });
                 navigate(`/service/vehicle/${vehicle.id}/job-card/new`);
               }}
            >
               <PlusCircle className="h-4 w-4 mr-2" />
               New job card
            </Button>
          </div>

          {historyLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : historyData?.records && historyData.records.length > 0 ? (
            <div className="space-y-6">
               {historyData.records.map((record: any) => (
                  <Card key={record.id} className="overflow-hidden border-slate-200">
                    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                       <div className="flex items-center gap-3">
                         <span className="font-semibold text-slate-800">{format(new Date(record.visit_date), 'dd MMM yyyy')}</span>
                         <span className="px-2 py-0.5 uppercase tracking-wider text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-full">
                           {record.visit_type}
                         </span>
                       </div>
                       
                       <div className="flex items-center gap-3">
                         <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                           record.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                         }`}>
                           {record.status}
                         </span>
                         
                         {record.status === 'open' && (
                            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                               <button 
                                 onClick={() => navigate(`/service/job-card/${record.id}/edit`)}
                                 className="text-slate-400 hover:text-indigo-600 transition-colors tooltip-trigger" 
                                 title="Edit job card"
                               >
                                  <Edit2 className="w-4 h-4" />
                               </button>
                               <Button 
                                 size="sm" 
                                 variant="destructive"
                                 className="h-7 text-xs px-2.5 focus:ring-0"
                                 onClick={() => setCloseRecordId(record.id)}
                               >
                                 Close
                               </Button>
                            </div>
                         )}
                         {record.status === 'completed' && (
                            <div className="flex items-center ml-2 pl-2 border-l border-slate-200">
                               <button 
                                 onClick={() => navigate(`/service/job-card/${record.id}/edit`)}
                                 className="text-indigo-600 text-xs font-medium hover:underline flex items-center" 
                               >
                                 View <ArrowRight className="w-3 h-3 ml-1" />
                               </button>
                            </div>
                         )}
                       </div>
                    </div>
                    
                    <div className="px-5 py-4">
                       {record.complaint && (
                         <div className="mb-4">
                           <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Complaint</h4>
                           <p className="text-sm text-slate-800 whitespace-pre-wrap">{record.complaint}</p>
                         </div>
                       )}
                       
                       {record.diagnosis && (
                         <div className="mb-4">
                           <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Diagnosis</h4>
                           <p className="text-sm text-slate-800 whitespace-pre-wrap">{record.diagnosis}</p>
                         </div>
                       )}
                       
                       {record.work_done && (
                         <div className="mb-4">
                           <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Work Performed</h4>
                           <p className="text-sm text-slate-800 whitespace-pre-wrap">{record.work_done}</p>
                         </div>
                       )}
                       
                       {record.technician_name && (
                         <p className="text-sm text-slate-500 italic mb-4">Technician: {record.technician_name}</p>
                       )}
                       
                       {record.parts && record.parts.length > 0 && (
                          <div className="mt-5">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Parts & Materials</h4>
                            <div className="border border-slate-100 rounded-lg overflow-hidden">
                              <table className="min-w-full divide-y divide-slate-100">
                                {record.parts.length > 1 && (
                                  <thead className="bg-slate-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Part</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Action</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Qty</th>
                                    </tr>
                                  </thead>
                                )}
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {record.parts.map((p: any) => (
                                    <tr key={p.id}>
                                      <td className="px-4 py-2 text-sm text-slate-800">
                                        {p.part_name} <span className="text-xs text-slate-400">({p.part_category})</span>
                                        {p.notes && <div className="text-xs text-slate-500 mt-0.5">{p.notes}</div>}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-slate-600 capitalize">{p.action}</td>
                                      <td className="px-4 py-2 text-sm text-slate-800 text-right">{p.quantity}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                       )}
                       
                       {/* Attachments inline grid placeholder */}
                       {record.attachments && record.attachments.length > 0 && (
                          <div className="mt-5">
                             <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Attachments</h4>
                             <div className="flex flex-wrap gap-2">
                               {record.attachments.map((a: any) => (
                                 <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-sm text-indigo-600 font-medium">
                                   <FileText className="w-4 h-4 mr-2 text-indigo-400" />
                                   {a.file_name}
                                 </a>
                               ))}
                             </div>
                          </div>
                       )}
                    </div>
                    
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                       <div>{record.mileage_at_visit ? `@ ${record.mileage_at_visit} km` : ''}</div>
                       <div>
                         {record.next_service_km || record.next_service_date ? 'Next: ' : ''}
                         {record.next_service_date && format(new Date(record.next_service_date), 'dd MMM yyyy')}
                         {record.next_service_date && record.next_service_km && ' or '}
                         {record.next_service_km && `${record.next_service_km} km`}
                       </div>
                    </div>
                  </Card>
               ))}
               
               {/* Pagination */}
               {historyData.totalPages > 1 && (
                 <div className="flex justify-between items-center mt-6">
                   <div className="text-sm text-slate-500">
                     Page {page} of {historyData.totalPages}
                   </div>
                   <div className="flex gap-2">
                     <Button variant="ghost" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                       <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                     </Button>
                     <Button variant="ghost" size="sm" onClick={() => setPage(Math.min(historyData.totalPages, page + 1))} disabled={page === historyData.totalPages}>
                       Next <ChevronRight className="w-4 h-4 ml-1" />
                     </Button>
                   </div>
                 </div>
               )}
            </div>
          ) : (
            <Card className="p-12 text-center">
               <HistoryIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
               <p className="text-slate-500 font-medium">No service history recorded for this vehicle.</p>
            </Card>
          )}
        </div>
      )}

      {/* 5. Communication Hub (Mockup) */}
      {!vehicle.is_archived && (
         <Card className="mb-12 overflow-hidden border-slate-200 shadow-sm mt-8">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
               <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Omnichannel Communication Hub
               </h3>
               <p className="text-xs text-slate-500 mt-1">Unified view of all SMS, Email, and WhatsApp interactions with the customer.</p>
            </div>
            <div className="p-0">
               <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                 <div className="p-4 px-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full shrink-0">
                       <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-800">Job Card Opened</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Delivered (SMS)</span>
                       </div>
                       <p className="text-sm text-slate-600">"Dear {vehicle.customer?.name || 'Customer'}, your vehicle {vehicle.vehicle_number} has been checked in. Track status here: link/123"</p>
                       <span className="text-xs text-slate-400 mt-1 block">Today at 10:15 AM</span>
                    </div>
                 </div>
                 
                 <div className="p-4 px-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-full shrink-0">
                       <Activity className="w-4 h-4" />
                    </div>
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-800">Estimate Approval Request</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Pending (WhatsApp)</span>
                       </div>
                       <p className="text-sm text-slate-600">"We found that the Brake Pads need replacement ($450). Reply YES to approve or click link to view detailed estimate."</p>
                       <span className="text-xs text-slate-400 mt-1 block">Today at 11:30 AM</span>
                    </div>
                 </div>
               </div>
               
               <div className="bg-slate-50 p-4 border-t border-slate-200">
                  <div className="flex gap-2 relative">
                     <input type="text" placeholder="Type a message to the customer..." className="flex-1 border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm h-10" />
                     <Button className="shrink-0 h-10">Send Notification</Button>
                  </div>
               </div>
            </div>
         </Card>
      )}

      {/* Confirm Close Dialog */}
      <ConfirmDialog
        isOpen={!!closeRecordId}
        onClose={() => setCloseRecordId(null)}
        onConfirm={handleCloseConfirm}
        title="Close this job card?"
        message="Once closed, this job card cannot be edited or reopened. Make sure all work performed has been recorded in the 'Work performed' section."
      />
    </PageWrapper>
  );
}

const ArrowRight = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
)
