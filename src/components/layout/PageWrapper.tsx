import React from 'react';
import { Header } from './Header';

interface PageWrapperProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  backLink?: { label: string; path: string };
}

export function PageWrapper({ title, actions, children, backLink }: PageWrapperProps) {
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <Header title={title} actions={actions} backLink={backLink} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
