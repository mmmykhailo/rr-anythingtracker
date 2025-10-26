import { useState, useCallback } from "react";
import {
  saveEntry,
  deleteEntry,
  getEntryHistory,
  deleteEntryById,
  createEntry,
  getTotalValueForDate,
  getDB,
} from "../db";
import { formatDateString } from "../dates";
import { debouncedDataChange } from "../data-change-events";

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
    async (valueToAdd: number, date?: string, comment?: string) => {
      const entryDate = date || formatDateString(new Date());
      try {
        setLoading(true);
        setError(null);
        await createEntry(
          trackerId,
          entryDate,
          valueToAdd,
          false,
          false,
          comment
        );
        const newValue = await getTotalValueForDate(trackerId, entryDate);
        debouncedDataChange.dispatch("entry_added", {
          trackerId,
          date: entryDate,
          value: valueToAdd,
        });
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
    async (value: number, date?: string, comment?: string) => {
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
          await createEntry(trackerId, entryDate, value, false, false, comment);
        }
        debouncedDataChange.dispatch("entry_updated", {
          trackerId,
          date: entryDate,
          value,
        });
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
        debouncedDataChange.dispatch("entry_deleted", {
          trackerId,
          date: entryDate,
        });
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
      debouncedDataChange.dispatch("entry_deleted", {
        trackerId,
      });
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
