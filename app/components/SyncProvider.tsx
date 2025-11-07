import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRevalidator } from "react-router";
import {
  isSyncConfigured,
  isEncryptionEnabled,
  shouldAutoSync,
} from "~/lib/github-gist-sync";
import { performSync } from "~/lib/sync";
import {
  useDebouncedDataChangeListener,
  type DebouncedChangeEvent,
} from "~/lib/data-change-events";
import type { SyncState } from "~/lib/sync";

interface SyncContextValue {
  syncState: SyncState;
  isConfigured: boolean;
  encryptionEnabled: boolean;
  isRevalidating: boolean;
  handleSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

const AUTO_SYNC_INTERVAL = 3 * 60 * 1000; // 3 minutes

export function SyncProvider({ children }: { children: ReactNode }) {
  const revalidator = useRevalidator();
  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const encryptionEnabled = useMemo(
    () => isEncryptionEnabled(),
    [isConfigured]
  );
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialSyncRun = useRef(false);
  const isSyncing = useRef(false);

  // Helper to revalidate data after successful sync
  const revalidateData = useCallback(() => {
    setIsRevalidating(true);
    revalidator.revalidate();
    setTimeout(() => setIsRevalidating(false), 1000);
  }, [revalidator]);

  // Main sync handler - unified logic for all sync triggers
  const handleSync = useCallback(async () => {
    // Prevent concurrent syncs
    if (!isConfigured || isSyncing.current) {
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

      // Perform sync using new sync engine
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
  }, [isConfigured, revalidateData]);

  // Initialize sync on mount
  useEffect(() => {
    const configured = isSyncConfigured();
    setIsConfigured(configured);

    if (configured) {
      // Load last sync time from localStorage
      const lastSync = localStorage.getItem("last_sync_time");

      setSyncState((prev) => ({
        ...prev,
        lastSyncTime: lastSync ? new Date(lastSync) : undefined,
      }));

      // Only initiate first sync on initial load
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
      }, AUTO_SYNC_INTERVAL);
    }

    // Cleanup
    return () => {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }
    };
  }, [isConfigured, handleSync]);

  // Listen for debounced data changes and trigger sync
  useDebouncedDataChangeListener(
    useCallback(
      (event: DebouncedChangeEvent) => {
        if (!isConfigured) return;

        // Trigger sync after data changes (no WiFi check for data-change sync)
        if (!isSyncing.current) {
          handleSync();
        }
      },
      [isConfigured, handleSync]
    ),
    [isConfigured, handleSync]
  );

  const contextValue = useMemo(
    () => ({
      syncState,
      isConfigured,
      encryptionEnabled,
      isRevalidating,
      handleSync,
    }),
    [syncState, isConfigured, encryptionEnabled, isRevalidating, handleSync]
  );

  return (
    <SyncContext.Provider value={contextValue}>{children}</SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
}
