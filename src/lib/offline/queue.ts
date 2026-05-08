import { offlineDb } from './db';
import { ServiceRecordInput } from '../validations/service';

export async function enqueueServiceRecord(
  data: ServiceRecordInput,
  vehicleId: string,
  userId: string,
  tenantId: string
) {
  await offlineDb.syncQueue.add({
    entity: 'service_record',
    action: 'create',
    data: { data, vehicleId, userId, tenantId },
    timestamp: new Date().toISOString()
  });
}
