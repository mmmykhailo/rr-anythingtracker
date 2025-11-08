import { useState, useCallback, useRef, useEffect } from "react";
import { useRevalidator } from "react-router";
import { performSync } from "~/lib/sync";
import { shouldAutoSync } from "~/lib/github-gist-sync";
import {
  useDebouncedDataChangeListener,
  type DebouncedChangeEvent,
} from "~/lib/data-change-events";
import type { SyncState } from "~/lib/sync";

/**
 * Hook to manage sync state and execute sync operations
 */
export function useSyncState() {
  const revalidator = useRevalidator();
  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
  });
  const [isRevalidating, setIsRevalidating] = useState(false);
  const isSyncing = useRef(false);

  // Helper to revalidate data after successful sync
  const revalidateData = useCallback(() => {
    setIsRevalidating(true);
    revalidator.revalidate();
    setTimeout(() => setIsRevalidating(false), 1000);
  }, [revalidator]);

  // Main sync handler
  const handleSync = useCallback(async () => {
    // Prevent concurrent syncs
    if (isSyncing.current) {
      return;
    }

    isSyncing.current = true;

    try {
      // Set syncing status
      setSyncState((prev) => ({
        ...prev,
        status: "syncing",
        message: "Syncing...",
      }));

      // Perform sync using sync engine
      const result = await performSync();

      // Update state based on result
      setSyncState({
        status: result.status,
        message: result.message,
        lastSyncTime: result.timestamp,
        lastError: result.error,
      });

      // Revalidate if data changed
      if (result.dataChanged) {
        revalidateData();
      }
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncState({
        status: "error",
        message: "Sync failed",
        lastError: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      isSyncing.current = false;
    }
  }, [revalidateData]);

  // Load last sync time from localStorage
  const loadLastSyncTime = useCallback(() => {
    const lastSync = localStorage.getItem("last_sync_time");
    if (lastSync) {
      setSyncState((prev) => ({
        ...prev,
        lastSyncTime: new Date(lastSync),
      }));
    }
  }, []);

  return {
    syncState,
    isRevalidating,
    handleSync,
    loadLastSyncTime,
  };
}

/**
 * Hook to schedule periodic auto-sync
 */
export function useSyncScheduler(
  handleSync: () => Promise<void>,
  isConfigured: boolean,
  intervalMs: number = 3 * 60 * 1000 // 3 minutes
) {
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialSyncRun = useRef(false);

  useEffect(() => {
    if (!isConfigured) {
      hasInitialSyncRun.current = false;
      return;
    }

    // Run initial sync once
    if (!hasInitialSyncRun.current) {
      hasInitialSyncRun.current = true;
      handleSync();
    }

    // Clear any existing interval
    if (autoSyncIntervalRef.current) {
      clearInterval(autoSyncIntervalRef.current);
    }

    // Start periodic auto-sync (respects WiFi-only setting)
    autoSyncIntervalRef.current = setInterval(() => {
      // Check WiFi-only setting before auto-sync
      if (shouldAutoSync()) {
        handleSync();
      }
    }, intervalMs);

    // Cleanup
    return () => {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }
    };
  }, [isConfigured, handleSync, intervalMs]);
}

/**
 * Hook to sync on data changes
 */
export function useDataChangeSync(
  handleSync: () => Promise<void>,
  isConfigured: boolean
) {
  useDebouncedDataChangeListener(
    useCallback(
      (event: DebouncedChangeEvent) => {
        if (!isConfigured) return;
        handleSync();
      },
      [isConfigured, handleSync]
    ),
    [isConfigured, handleSync]
  );
}
