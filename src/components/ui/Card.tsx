import React from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Card({ title, description, actions, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-white rounded-lg border border-slate-200 overflow-hidden', className)}
      {...props}
    >
      {(title || description || actions) && (
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-start">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          {actions && <div className="ml-4 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
