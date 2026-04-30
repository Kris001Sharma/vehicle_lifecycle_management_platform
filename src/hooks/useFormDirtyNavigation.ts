import { useFormDirtyBlocker } from './useFormDirtyBlocker';
import { useCallback } from 'react';

export function useFormDirtyNavigation(isDirty: boolean) {
  const { blocker, reset } = useFormDirtyBlocker(isDirty);

  const shouldShowDialog = blocker.state === 'blocked';

  const handleConfirmNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  const handleCancelNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  return {
    shouldShowDialog,
    handleConfirmNavigation,
    handleCancelNavigation,
    resetBlocker: reset,
  };
}
