import { useState, useEffect, useCallback } from 'react';
import type { Tracker } from './trackers';
import {
  getAllTrackers,
  getTrackerById,
  saveTracker,
  deleteTracker,
  saveEntry,
  getEntry,
  addToEntry,
  deleteEntry,
  initDB,
  seedInitialData,
} from './db';
import { formatDateString } from './dates';

// Hook to initialize the database
export function useDatabase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await initDB();
        await seedInitialData();
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
      }
    }

    init();
  }, []);

  return { isInitialized, error };
}

// Hook to manage trackers
export function useTrackers() {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrackers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllTrackers();
      setTrackers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trackers');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTracker = useCallback(async (tracker: Omit<Tracker, 'id' | 'values'>) => {
    try {
      setError(null);
      const newTracker = await saveTracker(tracker);
      setTrackers(prev => [...prev, newTracker]);
      return newTracker;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tracker');
      throw err;
    }
  }, []);

  const removeTracker = useCallback(async (id: string) => {
    try {
      setError(null);
      await deleteTracker(id);
      setTrackers(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tracker');
      throw err;
    }
  }, []);

  useEffect(() => {
    loadTrackers();
  }, [loadTrackers]);

  return {
    trackers,
    loading,
    error,
    loadTrackers,
    createTracker,
    removeTracker,
  };
}

// Hook to manage a single tracker
export function useTracker(id: string) {
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTracker = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrackerById(id);
      setTracker(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tracker');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadTracker();
    }
  }, [id, loadTracker]);

  return {
    tracker,
    loading,
    error,
    loadTracker,
  };
}

// Hook to manage entries for a tracker
export function useTrackerEntries(trackerId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addEntry = useCallback(async (date: string, value: number) => {
    try {
      setLoading(true);
      setError(null);
      await saveEntry(trackerId, date, value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [trackerId]);

  const addToCurrentEntry = useCallback(async (valueToAdd: number, date?: string) => {
    const entryDate = date || formatDateString(new Date());
    try {
      setLoading(true);
      setError(null);
      const newValue = await addToEntry(trackerId, entryDate, valueToAdd);
      return newValue;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to entry');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [trackerId]);

  const getCurrentEntry = useCallback(async (date?: string) => {
    const entryDate = date || formatDateString(new Date());
    try {
      return await getEntry(trackerId, entryDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get entry');
      return 0;
    }
  }, [trackerId]);

  const setEntry = useCallback(async (value: number, date?: string) => {
    const entryDate = date || formatDateString(new Date());
    try {
      setLoading(true);
      setError(null);
      await saveEntry(trackerId, entryDate, value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set entry');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [trackerId]);

  const removeEntry = useCallback(async (date?: string) => {
    const entryDate = date || formatDateString(new Date());
    try {
      setLoading(true);
      setError(null);
      await deleteEntry(trackerId, entryDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [trackerId]);

  return {
    loading,
    error,
    addEntry,
    addToCurrentEntry,
    getCurrentEntry,
    setEntry,
    removeEntry,
  };
}

// Hook for form state management
export function useFormState<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback((field: keyof T, value: T[keyof T]) => {
    setState(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  }, [errors]);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field as string]: error }));
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
