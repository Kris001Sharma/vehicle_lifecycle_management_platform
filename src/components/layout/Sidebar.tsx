import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/features/auth/store/authStore';
import { LogoutButton } from '@/features/auth/components/LogoutButton';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  children?: { label: string; path: string }[];
}

interface SidebarProps {
  role: 'admin' | 'sales' | 'service';
  navItems: NavItem[];
  currentPath: string;
}

export function Sidebar({ role, navItems, currentPath }: SidebarProps) {
  const appName = import.meta.env.VITE_APP_NAME || 'VLM Platform';
  const user = useAuthStore((state) => state.user);

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen flex-shrink-0">
      <div className="p-6">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <h1 className="text-xl font-bold text-white tracking-tight">{appName}</h1>
        </Link>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const normalizedCurrentPath = currentPath.endsWith('/') && currentPath !== '/' 
            ? currentPath.slice(0, -1) 
            : currentPath;
            
          const isActive = item.path === '/admin' 
            ? normalizedCurrentPath === '/admin' 
            : normalizedCurrentPath === item.path || normalizedCurrentPath.startsWith(`${item.path}/`);
          const Icon = item.icon;
          
          return (
            <div key={item.path} className="space-y-1">
              <Link
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
              
              {item.children && isActive && (
                <div className="ml-9 space-y-1 mt-1 mb-4">
                  {item.children.map(child => (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={cn(
                        "block px-3 py-2 text-[13px] font-medium rounded-md transition-colors",
                        currentPath === child.path
                          ? "text-white bg-slate-800 shadow-sm"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 mt-auto bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-sm font-bold text-white truncate leading-tight" title={user?.fullName}>
              {user?.fullName || 'User'}
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mt-0.5">
              {role}
            </p>
          </div>
          <div className="flex-shrink-0">
            <LogoutButton variant="icon" />
          </div>
        </div>
        
        <div className="mt-5 pt-4 border-t border-slate-800/20 flex items-center justify-between">
          <div className="flex flex-col space-y-0.5">
            {user?.lastLoginAt && (
              <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter">
                Last login: {new Date(user.lastLoginAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(user.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <span className="text-[9px] font-black text-slate-600 tracking-widest">0.1.0</span>
        </div>
      </div>
    </div>
  );
}
