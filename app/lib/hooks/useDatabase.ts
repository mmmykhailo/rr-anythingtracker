import { useState, useEffect } from "react";
import { initDB } from "../db";

// Hook to initialize the database
export function useDatabase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await initDB();
        setIsInitialized(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize database"
        );
      }
    }

    init();
  }, []);

  return { isInitialized, error };
}
