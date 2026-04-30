import { useBlocker } from 'react-router-dom';
import { useCallback, useState } from 'react';

export function useFormDirtyBlocker(isDirty: boolean) {
  const [shouldBlock, setShouldBlock] = useState(true);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && shouldBlock && currentLocation.pathname !== nextLocation.pathname
  );

  const reset = useCallback(() => {
    setShouldBlock(false);
  }, []);

  return { blocker, reset };
}
