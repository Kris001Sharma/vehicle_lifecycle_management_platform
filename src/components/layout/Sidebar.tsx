import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface SidebarProps {
  role: 'admin' | 'sales' | 'service';
  navItems: NavItem[];
  currentPath: string;
}

export function Sidebar({ role, navItems, currentPath }: SidebarProps) {
  const appName = import.meta.env.VITE_APP_NAME || 'VLM Platform';

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen flex-shrink-0">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white tracking-tight">{appName}</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive 
                  ? "bg-indigo-600 text-white" 
                  : "hover:bg-slate-800 text-slate-300 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 mt-auto">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">User Session</span>
          <span className="text-sm text-slate-300 truncate">user@example.com</span>
          <div className="mt-2 inline-flex">
            <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded uppercase tracking-wide font-medium">
              Role: {role}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
