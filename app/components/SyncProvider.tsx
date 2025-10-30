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
  uploadJsonToGist,
  downloadJsonFromGist,
  isEncryptionEnabled,
  shouldAutoSync,
} from "~/lib/github-gist-sync";
import { exportData, importData, validateExportData } from "~/lib/data-export";
import {
  useDebouncedDataChangeListener,
  type DebouncedChangeEvent,
} from "~/lib/data-change-events";

type SyncStatus =
  | "idle"
  | "uploading"
  | "downloading"
  | "checking"
  | "success"
  | "error"
  | "conflict";

interface SyncState {
  status: SyncStatus;
  message?: string;
  lastSyncTime?: Date;
  lastError?: string;
  triggeredBy?: "manual" | "auto" | "data-change";
}

interface SyncContextValue {
  syncState: SyncState;
  isConfigured: boolean;
  encryptionEnabled: boolean;
  isRevalidating: boolean;
  handleSync: (
    isAutoSync?: boolean,
    triggeredBy?: "manual" | "auto" | "data-change"
  ) => Promise<void>;
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
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialSyncRun = useRef(false);

  const resetStatus = useCallback(() => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
  }, []);

  const handleSync = useCallback(
    async (
      isAutoSync = false,
      triggeredBy?: "manual" | "auto" | "data-change"
    ) => {
      if (
        !isConfigured ||
        ["uploading", "downloading", "checking"].includes(syncState.status)
      ) {
        return;
      }

      // Check if auto-sync should be blocked due to WiFi-only setting
      if (isAutoSync && !shouldAutoSync()) {
        console.log("Auto-sync skipped: WiFi-only mode enabled and not on WiFi");
        return;
      }

      try {
        setSyncState((prev) => ({
          ...prev,
          status: "checking",
          message: "Checking for changes...",
        }));

        // Get local data first
        const localData = await exportData();

        // First, try to download from Gist to check for remote changes
        const remoteData = await downloadJsonFromGist({
          filename: "anythingtracker-data.json",
        });

        let shouldUpload = true;
        let syncAction = "none";

        if (remoteData && validateExportData(remoteData)) {
          // Check if this is first-time sync (no trackers in local data)
          const isFirstSync = localData.trackers.length === 0;

          if (isFirstSync) {
            // First-time sync on new device - download remote data
            setSyncState((prev) => ({
              ...prev,
              status: "downloading",
              message: "First-time sync, downloading data...",
            }));

            await importData(remoteData, true);
            shouldUpload = false;
            syncAction = "downloaded";

            const now = new Date();
            localStorage.setItem("last_sync_time", now.toISOString());

            setSyncState((prev) => ({
              ...prev,
              status: "success",
              message: "Initial sync completed",
              lastSyncTime: now,
              lastError: undefined,
              triggeredBy: triggeredBy || "auto",
            }));

            // Revalidate data to refresh components
            setIsRevalidating(true);
            revalidator.revalidate();
            setTimeout(() => setIsRevalidating(false), 1000);
          } else {
            // Compare timestamps to determine which data is newer
            // Use lastChangeDate if available, otherwise fall back to exportDate
            const localChangeDate = localData.lastChangeDate
              ? new Date(localData.lastChangeDate)
              : new Date(localData.exportDate);
            const remoteChangeDate = remoteData.lastChangeDate
              ? new Date(remoteData.lastChangeDate)
              : new Date(remoteData.exportDate);

            // Check if there are any changes (either local or remote is newer)
            const hasChanges =
              localChangeDate.getTime() !== remoteChangeDate.getTime();

            if (!hasChanges) {
              setSyncState((prev) => ({
                ...prev,
                status: "success",
                message: "Auto-synced",
                lastSyncTime: new Date(),
                lastError: undefined,
              }));
              return;
            }

            if (remoteChangeDate > localChangeDate) {
              // Remote data is newer
              if (!isAutoSync) {
                // For manual sync, ask user what to do
                const confirmDownload = confirm(
                  "Remote data is newer than local data. Do you want to download and replace local data? (Cancel to upload local data instead)"
                );

                if (confirmDownload) {
                  setSyncState((prev) => ({
                    ...prev,
                    status: "downloading",
                    message: "Downloading...",
                  }));

                  // Import remote data
                  await importData(remoteData, true);
                  shouldUpload = false;
                  syncAction = "downloaded";

                  const now = new Date();
                  localStorage.setItem("last_sync_time", now.toISOString());

                  setSyncState((prev) => ({
                    ...prev,
                    status: "success",
                    message:
                      triggeredBy === "data-change"
                        ? "Changes synced"
                        : isAutoSync
                        ? "Auto-synced"
                        : "Synced",
                    lastSyncTime: now,
                    lastError: undefined,
                    triggeredBy:
                      triggeredBy || (isAutoSync ? "auto" : "manual"),
                  }));

                  // Revalidate data to refresh components
                  setIsRevalidating(true);
                  revalidator.revalidate();
                  setTimeout(() => setIsRevalidating(false), 1000);
                }
              } else {
                // For auto-sync, download silently
                setSyncState((prev) => ({
                  ...prev,
                  status: "downloading",
                  message: "Auto-downloading...",
                }));

                await importData(remoteData, true);
                shouldUpload = false;
                syncAction = "downloaded";

                const now = new Date();
                localStorage.setItem("last_sync_time", now.toISOString());

                setSyncState((prev) => ({
                  ...prev,
                  status: "success",
                  message: "Downloaded from cloud",
                  lastSyncTime: now,
                  lastError: undefined,
                  triggeredBy: "manual",
                }));

                // Revalidate data to refresh components
                setIsRevalidating(true);
                revalidator.revalidate();
                setTimeout(() => setIsRevalidating(false), 1000);
              }
            }
          }
        }

        if (shouldUpload) {
          // Check if local data has changed since last sync
          const lastSyncTime = localStorage.getItem("last_sync_time");
          const localChangeDate = localData.lastChangeDate
            ? new Date(localData.lastChangeDate)
            : new Date(localData.exportDate);

          // If last sync exists and local data hasn't changed since then, keep success status
          if (lastSyncTime && syncState.status === "success") {
            const lastSync = new Date(lastSyncTime);
            if (localChangeDate <= lastSync) {
              return; // No changes to upload, keep success status
            }
          }

          setSyncState((prev) => ({
            ...prev,
            status: "uploading",
            message:
              triggeredBy === "data-change"
                ? "Uploading changes..."
                : isAutoSync
                ? "Auto-uploading..."
                : "Uploading...",
            triggeredBy: triggeredBy || (isAutoSync ? "auto" : "manual"),
          }));

          // Upload to Gist
          const uploadSuccess = await uploadJsonToGist(localData, {
            filename: "anythingtracker-data.json",
            description: "AnythingTracker backup data",
          });

          if (uploadSuccess) {
            const now = new Date();
            localStorage.setItem("last_sync_time", now.toISOString());

            setSyncState((prev) => ({
              ...prev,
              status: "success",
              message:
                triggeredBy === "data-change"
                  ? "Changes uploaded"
                  : isAutoSync
                  ? "Auto-synced (uploaded)"
                  : "Uploaded to cloud",
              lastSyncTime: now,
              lastError: undefined,
              triggeredBy: triggeredBy || (isAutoSync ? "auto" : "manual"),
            }));
          } else {
            throw new Error("Failed to upload to GitHub Gist");
          }
        }

        resetStatus();
      } catch (error) {
        console.error("Sync failed:", error);
        let errorMessage =
          error instanceof Error
            ? error.message?.toLocaleLowerCase()
            : "Unknown error";

        // Provide more specific error messages for encryption-related failures
        if (errorMessage?.includes("encrypt")) {
          errorMessage = "Encryption failed. Check your GitHub token.";
        } else if (errorMessage?.includes("decrypt")) {
          errorMessage =
            "Decryption failed. The data may be encrypted with a different token.";
        } else if (errorMessage?.includes("invalid password")) {
          errorMessage =
            "Unable to decrypt data. GitHub token may have changed.";
        }

        setSyncState((prev) => ({
          ...prev,
          status: "error",
          message: isAutoSync ? "Auto-sync failed" : "Sync failed",
          lastError: errorMessage,
        }));

        resetStatus();
      }
    },
    [isConfigured, resetStatus, revalidator]
  );

  useEffect(() => {
    // Check if sync is configured
    const configured = isSyncConfigured();
    setIsConfigured(configured);

    if (configured) {
      // Load last sync time from localStorage
      const lastSync = localStorage.getItem("last_sync_time");

      setSyncState((prev) => ({
        ...prev,
        lastSyncTime: lastSync ? new Date(lastSync) : undefined,
      }));

      // Only initiate first sync on initial load (not on every route change)
      if (!hasInitialSyncRun.current) {
        hasInitialSyncRun.current = true;
        handleSync(true, "auto");
      }

      // Clear any existing interval
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }

      // Start auto-sync
      autoSyncIntervalRef.current = setInterval(() => {
        handleSync(true, "auto");
      }, AUTO_SYNC_INTERVAL);
    }

    // Cleanup
    return () => {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [isConfigured, handleSync]);

  // Listen for debounced data changes and trigger auto-sync
  useDebouncedDataChangeListener(
    useCallback(
      (event: DebouncedChangeEvent) => {
        if (!isConfigured) return;

        // Only trigger sync if we're not already syncing
        setSyncState((prev) => {
          if (!["uploading", "downloading", "checking"].includes(prev.status)) {
            // Trigger auto-sync after data changes
            handleSync(true, "data-change");
          }
          return prev;
        });
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
