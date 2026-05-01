import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { logoutAction } from '../actions/logoutAction';

interface LogoutButtonProps {
  variant?: 'button' | 'icon';
}

export function LogoutButton({ variant = 'button' }: LogoutButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logoutAction();
    } finally {
      setIsLoading(false);
      setShowConfirm(false);
    }
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setShowConfirm(true)}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>

        <ConfirmDialog
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleLogout}
          title="Sign Out"
          message="Are you sure you want to sign out?"
          confirmLabel="Sign out"
          isLoading={isLoading}
        />
      </>
    );
  }

  return (
    <>
      <Button 
        variant="secondary" 
        size="sm" 
        onClick={() => setShowConfirm(true)}
      >
        Sign out
      </Button>
      
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleLogout}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        isLoading={isLoading}
      />
    </>
  );
}
