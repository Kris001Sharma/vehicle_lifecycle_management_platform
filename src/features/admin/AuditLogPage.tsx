import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { getAuditLogs, AuditLogFilter } from '@/lib/db/audit';
import { useAuthStore } from '@/features/auth/store/authStore';

export function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilter>({});
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const pageSize = 25;

  useEffect(() => {
    async function loadData() {
      if (!tenantId) return;
      setLoading(true);
      try {
        const { data, count } = await getAuditLogs(tenantId, filters, page, pageSize);
        setLogs(data || []);
        setTotalCount(count);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tenantId, filters, page]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-amber-100 text-amber-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'SELECT': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderDiff = (log: any) => {
    const oldVal = log.old_value || {};
    const newVal = log.new_value || {};
    
    if (log.action === 'SELECT') {
      return (
        <div className="p-4 bg-gray-50 border-t border-gray-100 overflow-auto text-xs font-mono">
          <pre className="text-gray-700">{JSON.stringify(newVal, null, 2)}</pre>
        </div>
      );
    }

    if (log.action === 'INSERT') {
      return (
        <div className="p-4 bg-gray-50 border-t border-gray-100 overflow-auto text-xs font-mono">
          <pre className="text-gray-700">{JSON.stringify(newVal, null, 2)}</pre>
        </div>
      );
    }

    if (log.action === 'DELETE') {
      return (
        <div className="p-4 bg-gray-50 border-t border-gray-100 overflow-auto text-xs font-mono">
          <pre className="text-gray-700">{JSON.stringify(oldVal, null, 2)}</pre>
        </div>
      );
    }

    // UPDATE diff
    const keys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);
    const differences: Record<string, { old: any, new: any }> = {};
    for (const key of keys) {
      if (JSON.stringify(oldVal[key]) !== JSON.stringify(newVal[key])) {
        differences[key] = { old: oldVal[key], new: newVal[key] };
      }
    }

    return (
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border-t border-gray-100 text-xs font-mono">
        <div className="overflow-auto bg-white p-2 border rounded">
          <div className="mb-2 font-bold text-gray-500">OLD VALUE</div>
          {Object.entries(differences).map(([key, vals]) => (
            <div key={key} className="mb-1">
              <strong>{key}:</strong> <span className="bg-amber-100">{JSON.stringify(vals.old)}</span>
            </div>
          ))}
          {Object.keys(differences).length === 0 && <span className="text-gray-400">No scalar differences detected.</span>}
        </div>
        <div className="overflow-auto bg-white p-2 border rounded">
          <div className="mb-2 font-bold text-gray-500">NEW VALUE</div>
          {Object.entries(differences).map(([key, vals]) => (
             <div key={key} className="mb-1">
               <strong>{key}:</strong> <span className="bg-green-100">{JSON.stringify(vals.new)}</span>
             </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <PageWrapper 
      title="Audit Log"
      backLink={{ label: 'Admin', path: '/admin' }}
    >
      <div className="mb-6 flex flex-wrap gap-4">
        <select 
          className="border rounded p-2 text-sm bg-white"
          value={filters.action || ''} 
          onChange={(e) => setFilters({ ...filters, action: e.target.value as any || undefined })}
        >
          <option value="">All Actions</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="SELECT">SELECT</option>
        </select>

        <input 
          type="text" 
          placeholder="Filter by Table Name" 
          className="border rounded p-2 text-sm max-w-xs"
          value={filters.tableName || ''}
          onChange={(e) => setFilters({ ...filters, tableName: e.target.value || undefined })}
        />

        <input 
          type="text" 
          placeholder="Filter by User Email" 
          className="border rounded p-2 text-sm max-w-xs"
          value={filters.userEmail || ''}
          onChange={(e) => setFilters({ ...filters, userEmail: e.target.value || undefined })}
        />
        
        <input 
          type="date"
          className="border rounded p-2 text-sm"
          value={filters.fromDate || ''}
          onChange={(e) => setFilters({ ...filters, fromDate: e.target.value || undefined })}
        />
        <input 
          type="date"
          className="border rounded p-2 text-sm"
          value={filters.toDate || ''}
          onChange={(e) => setFilters({ ...filters, toDate: e.target.value || undefined })}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm shadow-black/5 flex flex-col min-h-0">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-6 py-3 font-medium">Timestamp</th>
              <th className="px-6 py-3 font-medium">User</th>
              <th className="px-6 py-3 font-medium">Action</th>
              <th className="px-6 py-3 font-medium">Table</th>
              <th className="px-6 py-3 font-medium">Record ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading logs...</td ></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No logs found matching criteria.</td ></tr>
            ) : (
              logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr 
                    className={`nav-item hover:bg-gray-50 cursor-pointer transition-colors ${expandedId === log.id ? 'bg-gray-50' : ''}`}
                    onClick={() => toggleExpand(log.id)}
                  >
                    <td className="px-6 py-4 text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4">{log.user_profiles?.email || log.user_id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{log.table_name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400 truncate max-w-[120px]">{log.record_id}</td>
                  </tr>
                  {expandedId === log.id && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        {renderDiff(log)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
        
        {totalCount > pageSize && (
          <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-white sticky bottom-0">
            <span className="text-sm text-gray-500">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount}
            </span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button 
                disabled={page * pageSize >= totalCount}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
