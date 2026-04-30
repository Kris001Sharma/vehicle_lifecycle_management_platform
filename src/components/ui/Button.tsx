import React from 'react';
import { cn } from '@/utils/cn';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent',
      secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300',
      destructive: 'bg-red-600 hover:bg-red-700 text-white border border-transparent',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border border-transparent',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
          variants[variant],
          sizes[size],
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {isLoading && <Spinner size="sm" className="mr-2 border-current border-t-transparent" />}
        <span className={cn(isLoading && 'opacity-0')}>{children}</span>
      </button>
    );
  }
);
Button.displayName = 'Button';
