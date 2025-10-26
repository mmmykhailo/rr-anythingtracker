import { useState, useEffect } from "react";

export const useStateWithDelayedReset = <T>(value: T, delay = 3000) => {
  const [transient, setTransient] = useState(value);

  useEffect(() => {
    if (value !== transient) {
      setTransient(value);
      const timer = setTimeout(() => setTransient(null as T), delay);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return transient;
};
