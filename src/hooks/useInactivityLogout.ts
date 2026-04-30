import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutAction } from '@/features/auth/actions/logoutAction';
import { useAuthStore } from '@/features/auth/store/authStore';

const INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000; // 8 hours
const WARNING_BEFORE_MS = 30 * 60 * 1000; // 30 minute warning

export function useInactivityLogout() {
  const [showWarning, setShowWarning] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;
    
    clearTimers();
    setShowWarning(false);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS);

    timerRef.current = setTimeout(async () => {
      await logoutAction();
      setShowWarning(false);
      navigate('/login');
    }, INACTIVITY_LIMIT_MS);
  }, [isAuthenticated, clearTimers, navigate]);

  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const showWarningRef = useRef(showWarning);
  
  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    // Initial timer start
    resetTimer();

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    
    const throttleMs = 5 * 60 * 1000; // 5 minute throttle
    let lastReset = 0;

    const handleActivity = () => {
      const now = Date.now();
      // Only reset if 1 minute has passed since last reset AND warning is not showing
      if (!showWarningRef.current && now - lastReset > throttleMs) {
        resetTimer();
        lastReset = now;
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimers();
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, clearTimers, resetTimer]);

  return { showWarning, resetTimer, extendSession };
}
