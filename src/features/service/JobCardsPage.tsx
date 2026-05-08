import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getOpenJobCards } from '@/lib/db/service';
import { format } from 'date-fns';

export function JobCardsPage() {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;
  const navigate = useNavigate();

  const { data: openCards, isLoading } = useQuery({
    queryKey: ['service_open_cards', tenantId],
    queryFn: () => getOpenJobCards(tenantId!),
    enabled: !!tenantId
  });

  return (
    <PageWrapper title="Open job cards">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : openCards && openCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {openCards.map((card: any) => (
            <Card key={card.id} className="p-5 flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="font-mono font-semibold text-lg text-slate-800">{card.vehicle?.vehicle_number}</div>
                <div className="px-2.5 py-1 uppercase tracking-wider text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-full">
                  {card.visit_type}
                </div>
              </div>
              <div className="mb-4 flex-1">
                <div className="text-sm font-medium text-slate-900">{card.vehicle?.customer?.name || 'Unknown Customer'}</div>
                <div className="text-sm text-slate-500">{card.vehicle?.customer?.phone || 'No phone'}</div>
              </div>
              <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-500">{format(new Date(card.visit_date), 'dd MMM yyyy')}</div>
                <button
                  onClick={() => navigate(`/service/job-card/${card.id}/edit`)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  View job card &rarr;
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="text-slate-500">No open job cards. All caught up.</div>
        </Card>
      )}
    </PageWrapper>
  );
}
