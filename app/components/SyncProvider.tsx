import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  isSyncConfigured,
  isEncryptionEnabled,
} from "~/lib/github-gist-sync";
import {
  useSyncState,
  useSyncScheduler,
  useDataChangeSync,
} from "./sync-hooks";
import type { SyncState } from "~/lib/sync";

interface SyncContextValue {
  syncState: SyncState;
  isConfigured: boolean;
  encryptionEnabled: boolean;
  isRevalidating: boolean;
  handleSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isConfigured, setIsConfigured] = useState(false);
  const encryptionEnabled = useMemo(
    () => isEncryptionEnabled(),
    [isConfigured]
  );

  // Use extracted hooks
  const { syncState, isRevalidating, handleSync, loadLastSyncTime } =
    useSyncState();

  // Initialize configuration
  useEffect(() => {
    const configured = isSyncConfigured();
    setIsConfigured(configured);

    if (configured) {
      loadLastSyncTime();
    }
  }, [loadLastSyncTime]);

  // Schedule periodic auto-sync
  useSyncScheduler(handleSync, isConfigured);

  // Sync on data changes
  useDataChangeSync(handleSync, isConfigured);

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
