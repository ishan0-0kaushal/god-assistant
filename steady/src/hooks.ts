import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { waitLeft } from './limits';

/** Re-renders every `ms`; returns the current time. */
export function useNow(ms = 250): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/**
 * Seconds left on a wall-clock wait. Leaving the app restarts it: the point of the wait is to sit
 * with the urge, not to run it down in another app.
 */
export function useWait(seconds: number): number {
  const [start, setStart] = useState(Date.now);
  const away = useRef(false);
  const now = useNow();
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') away.current = true;
      else if (s === 'active' && away.current) {
        away.current = false;
        setStart(Date.now());
      }
    });
    return () => sub.remove();
  }, []);
  return waitLeft(start, seconds, now);
}
