import { useState, useCallback } from "react";
import type { Tracker } from "../trackers";
import { saveTracker, updateTracker, deleteTracker } from "../db";
import { debouncedDataChange } from "../data-change-events";

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
        debouncedDataChange.dispatch("tracker_created", {
          trackerId: newTracker.id,
        });
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

  const modifyTracker = useCallback(async (tracker: Tracker) => {
    try {
      setLoading(true);
      setError(null);
      await updateTracker(tracker);
      debouncedDataChange.dispatch("tracker_updated", {
        trackerId: tracker.id,
      });
      return tracker;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tracker");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeTracker = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteTracker(id);
      debouncedDataChange.dispatch("tracker_deleted", {
        trackerId: id,
      });
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
    modifyTracker,
    removeTracker,
  };
}
