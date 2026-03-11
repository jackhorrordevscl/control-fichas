import { useEffect, useRef, useCallback } from 'react';

const IDLE_TIMEOUT = 5 * 1000;  // 8 min → muestra aviso
const WARN_DURATION = 10 * 1000; // 2 min → logout

interface UseIdleTimeoutOptions {
  onWarn: () => void;
  onLogout: () => void;
}

export function useIdleTimeout({ onWarn, onLogout }: UseIdleTimeoutOptions) {
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();
    idleTimer.current = setTimeout(() => {
      onWarn();
      logoutTimer.current = setTimeout(() => {
        onLogout();
      }, WARN_DURATION);
    }, IDLE_TIMEOUT);
  }, [clearTimers, onWarn, onLogout]);

  // Resetear timers en cualquier actividad del usuario
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => startTimers();

    events.forEach((e) => window.addEventListener(e, handleActivity));
    startTimers(); // arrancar al montar

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      clearTimers();
    };
  }, [startTimers, clearTimers]);

  const extend = useCallback(() => {
    clearTimers();
    startTimers();
  }, [clearTimers, startTimers]);

  return { extend };
}