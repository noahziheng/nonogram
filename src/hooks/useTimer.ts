import { useEffect, useRef } from 'react';

export function useTimer(
  started: boolean,
  stopped: boolean,
  onTick: () => void,
) {
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  useEffect(() => {
    if (!started || stopped) return;
    const id = setInterval(() => tickRef.current(), 1000);
    return () => clearInterval(id);
  }, [started, stopped]);
}
