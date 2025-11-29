import {useEffect} from 'react';

const isDev = import.meta.env.MODE === 'development';

export function usePerfMark(name: string) {
  useEffect(() => {
    if (!isDev || typeof performance === 'undefined' || !performance.mark) return;
    const start = `${name}-start`;
    const end = `${name}-end`;
    performance.mark(start);
    return () => {
      performance.mark(end);
      try {
        performance.measure(`${name}-measure`, start, end);
      } catch {
        // ignore measure errors
      }
    };
  }, [name]);
}
