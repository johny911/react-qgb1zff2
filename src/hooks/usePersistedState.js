// src/hooks/usePersistedState.js
import { useEffect, useRef, useState } from 'react';

export default function usePersistedState(key, initialValue) {
  const first = useRef(true);

  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {}
    }, 120); // small debounce
    return () => clearTimeout(id);
  }, [key, state]);

  return [state, setState];
}