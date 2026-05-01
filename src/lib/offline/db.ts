import Dexie, { type Table } from 'dexie';

/**
 * Dexie database for offline capability
 * Used for queuing writes and caching critical lookups
 */
export class AppStore extends Dexie {
  // We will define tables for vehicles, job cards, and customers in subsequent prompts
  // For now, initializing the meta table for sync tracking
  syncQueue!: Table<{
    id?: number;
    entity: string;
    action: 'create' | 'update' | 'delete';
    data: any;
    timestamp: string;
  }>;

  constructor() {
    super('vlm_platform_db');
    this.version(1).stores({
      syncQueue: '++id, entity, action, timestamp'
    });
  }
}

export const offlineDb = new AppStore();
