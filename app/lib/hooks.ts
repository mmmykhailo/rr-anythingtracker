import { useState, useEffect, useCallback } from "react";
import type { Tracker } from "./trackers";
import {
  saveTracker,
  deleteTracker,
  saveEntry,
  deleteEntry,
  getEntryHistory,
  deleteEntryById,
  createEntry,
  getTotalValueForDate,
  getDB,
  initDB,
} from "./db";
import { formatDateString } from "./dates";

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

// Hook for tracker mutations
export function useTrackerMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTracker = useCallback(
    async (tracker: Omit<Tracker, "id" | "values">) => {
      try {
        setLoading(true);
        setError(null);
        const newTracker = await saveTracker(tracker);
        return newTracker;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create tracker"
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const removeTracker = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteTracker(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tracker");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createTracker,
    removeTracker,
  };
}

// Hook to manage entries for a tracker
export function useTrackerEntries(trackerId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addEntry = useCallback(
    async (date: string, value: number) => {
      try {
        setLoading(true);
        setError(null);
        await saveEntry(trackerId, date, value);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save entry");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [trackerId]
  );

  const addToCurrentEntry = useCallback(
    async (valueToAdd: number, date?: string) => {
      const entryDate = date || formatDateString(new Date());
      try {
        setLoading(true);
        setError(null);
        await createEntry(trackerId, entryDate, valueToAdd);
        const newValue = await getTotalValueForDate(trackerId, entryDate);
        return newValue;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add to entry");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [trackerId]
  );

  const getCurrentEntry = useCallback(
    async (date?: string) => {
      const entryDate = date || formatDateString(new Date());
      try {
        return await getTotalValueForDate(trackerId, entryDate);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get entry");
        return 0;
      }
    },
    [trackerId]
  );

  const setEntry = useCallback(
    async (value: number, date?: string) => {
      const entryDate = date || formatDateString(new Date());
      try {
        setLoading(true);
        setError(null);
        // For checkbox entries, we want to replace all entries for the date
        // First delete existing entries for this date
        const db = await getDB();
        const entries = await db.getAllFromIndex(
          "entries",
          "by-tracker",
          trackerId
        );
        const dateEntries = entries.filter((entry) => entry.date === entryDate);
        for (const entry of dateEntries) {
          await deleteEntryById(entry.id);
        }
        // Then create new entry if value > 0
        if (value > 0) {
          await createEntry(trackerId, entryDate, value);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set entry");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [trackerId]
  );

  const removeEntry = useCallback(
    async (date?: string) => {
      const entryDate = date || formatDateString(new Date());
      try {
        setLoading(true);
        setError(null);
        await deleteEntry(trackerId, entryDate);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete entry");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [trackerId]
  );

  const getHistory = useCallback(
    async (limit?: number) => {
      try {
        setError(null);
        return await getEntryHistory(trackerId, limit);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to get entry history"
        );
        return [];
      }
    },
    [trackerId]
  );

  const removeEntryById = useCallback(async (entryId: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteEntryById(entryId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    addEntry,
    addToCurrentEntry,
    getCurrentEntry,
    setEntry,
    removeEntry,
    getHistory,
    removeEntryById,
  };
}

// Hook for form state management
export function useFormState<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setState((prev) => ({ ...prev, [field]: value }));
      // Clear error when field is updated
      if (errors[field as string]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as string];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [field as string]: error }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    setErrors({});
  }, [initialState]);

  return {
    state,
    errors,
    updateField,
    setFieldError,
    clearErrors,
    reset,
    setState,
  };
}
