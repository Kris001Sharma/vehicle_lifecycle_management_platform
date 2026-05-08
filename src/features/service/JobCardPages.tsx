import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { JobCardForm } from './components/JobCardForm';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getServiceRecord } from '@/lib/db/service';

export function JobCardFormPage() {
  const { vehicleId } = useParams();
  
  return (
    <PageWrapper title="New job card">
      <div className="max-w-4xl mx-auto">
        <JobCardForm vehicleId={vehicleId!} />
      </div>
    </PageWrapper>
  );
}

export function JobCardEditPage() {
  const { recordId } = useParams();
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;
  
  const { data: initialData, isLoading } = useQuery({
    queryKey: ['service_record', recordId, tenantId],
    queryFn: () => getServiceRecord(recordId!, tenantId!),
    enabled: !!recordId && !!tenantId,
  });

  if (isLoading) {
    return (
      <PageWrapper title="Edit job card">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (!initialData) {
    return (
      <PageWrapper title="Edit job card">
        <div className="p-8 text-center text-slate-500">Record not found.</div>
      </PageWrapper>
    );
  }
  
  return (
    <PageWrapper title="Edit job card">
      <div className="max-w-4xl mx-auto">
        <JobCardForm recordId={recordId!} vehicleId={initialData.vehicle_id} initialData={initialData} />
      </div>
    </PageWrapper>
  );
}
