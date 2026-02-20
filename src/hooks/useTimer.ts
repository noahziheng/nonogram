import { useEffect, useRef } from 'react';

export function useTimer(
  started: boolean,
  stopped: boolean,
  onTick: () => void,
) {
  const tickRef = useRef(onTick);

  // Update the ref inside an effect to comply with the rules of refs.
  // This ensures the interval always calls the latest onTick without
  // needing to recreate the interval on every render.
  useEffect(() => {
    tickRef.current = onTick;
  });

  useEffect(() => {
    if (!started || stopped) return;
    const id = setInterval(() => tickRef.current(), 1000);
    return () => clearInterval(id);
  }, [started, stopped]);
}
