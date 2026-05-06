import React from 'react';

import { Link } from 'react-router-dom';

interface HeaderProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  backLink?: { label: string; path: string };
}

export function Header({ title, actions, backLink }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-10 shrink-0">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {backLink && (
          <Link 
            to={backLink.path} 
            className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-white/60 backdrop-blur-md border border-slate-200/50 hover:bg-white/80 px-4 py-2 rounded-lg shadow-sm transition-all whitespace-nowrap flex items-center"
          >
            {backLink.label.startsWith('←') ? backLink.label : `← ${backLink.label}`}
          </Link>
        )}
      </div>
    </header>
  );
}
