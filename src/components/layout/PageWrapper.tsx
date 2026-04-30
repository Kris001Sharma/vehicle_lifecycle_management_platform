import React from 'react';
import { Header } from './Header';

interface PageWrapperProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageWrapper({ title, actions, children }: PageWrapperProps) {
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <Header title={title} actions={actions} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
