import { useState, useEffect, useRef, useCallback } from "react";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertCircle,
  CloudUpload,
  CloudDownload,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  isSyncConfigured,
  uploadJsonToGist,
  downloadJsonFromGist,
} from "~/lib/github-gist-sync";
import { exportData, importData, validateExportData } from "~/lib/data-export";
import { cn } from "~/lib/utils";

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
  autoSyncEnabled?: boolean;
}

const AUTO_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STATUS_RESET_DELAY = 3000; // 3 seconds

export function SyncButton() {
  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
    autoSyncEnabled: true,
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetStatus = useCallback(() => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    statusTimeoutRef.current = setTimeout(() => {
      setSyncState((prev) => ({
        ...prev,
        status: "idle",
        message: undefined,
      }));
    }, STATUS_RESET_DELAY);
  }, []);

  useEffect(() => {
    // Check if sync is configured
    const configured = isSyncConfigured();
    setIsConfigured(configured);

    if (configured) {
      // Load last sync time and auto-sync preference from localStorage
      const lastSync = localStorage.getItem("last_sync_time");
      const autoSyncPref = localStorage.getItem("auto_sync_enabled");

      setSyncState((prev) => ({
        ...prev,
        lastSyncTime: lastSync ? new Date(lastSync) : undefined,
        autoSyncEnabled: autoSyncPref !== "false", // Default to true
      }));

      // Start auto-sync if enabled
      if (autoSyncPref !== "false") {
        autoSyncIntervalRef.current = setInterval(() => {
          handleSync(true);
        }, AUTO_SYNC_INTERVAL);
      }
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
  }, [isConfigured]);

  const handleSync = useCallback(
    async (isAutoSync = false) => {
      if (
        !isConfigured ||
        ["uploading", "downloading", "checking"].includes(syncState.status)
      ) {
        return;
      }

      try {
        setSyncState((prev) => ({
          ...prev,
          status: "checking",
          message: "Checking for changes...",
        }));

        // First, try to download from Gist to check for remote changes
        const remoteData = await downloadJsonFromGist({
          filename: "anythingtracker-data.json",
        });

        let shouldUpload = true;
        let syncAction = "none";

        if (remoteData && validateExportData(remoteData)) {
          // Get local data to check if this is first-time sync
          const localData = await exportData();

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
            }));
          } else {
            // Compare timestamps to determine which data is newer
            // Use lastChangeDate if available, otherwise fall back to exportDate
            const localChangeDate = localData.lastChangeDate
              ? new Date(localData.lastChangeDate)
              : new Date(localData.exportDate);
            const remoteChangeDate = remoteData.lastChangeDate
              ? new Date(remoteData.lastChangeDate)
              : new Date(remoteData.exportDate);

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
                    message: "Downloaded from cloud",
                    lastSyncTime: now,
                    lastError: undefined,
                  }));
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
                  message: "Auto-synced (downloaded)",
                  lastSyncTime: now,
                  lastError: undefined,
                }));
              }
            }
          }
        }

        if (shouldUpload) {
          setSyncState((prev) => ({
            ...prev,
            status: "uploading",
            message: isAutoSync ? "Auto-uploading..." : "Uploading...",
          }));

          // Export local data and upload to Gist
          const localData = await exportData();
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
              message: isAutoSync
                ? "Auto-synced (uploaded)"
                : "Uploaded to cloud",
              lastSyncTime: now,
              lastError: undefined,
            }));
          } else {
            throw new Error("Failed to upload to GitHub Gist");
          }
        }

        resetStatus();
      } catch (error) {
        console.error("Sync failed:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        setSyncState((prev) => ({
          ...prev,
          status: "error",
          message: isAutoSync ? "Auto-sync failed" : "Sync failed",
          lastError: errorMessage,
        }));

        resetStatus();
      }
    },
    [isConfigured, syncState.status, resetStatus]
  );

  const toggleAutoSync = () => {
    const newValue = !syncState.autoSyncEnabled;
    localStorage.setItem("auto_sync_enabled", newValue.toString());
    setSyncState((prev) => ({ ...prev, autoSyncEnabled: newValue }));

    if (newValue) {
      // Start auto-sync
      autoSyncIntervalRef.current = setInterval(() => {
        handleSync(true);
      }, AUTO_SYNC_INTERVAL);
    } else {
      // Stop auto-sync
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
        autoSyncIntervalRef.current = null;
      }
    }
  };

  // Don't render if sync is not configured
  if (!isConfigured) {
    return null;
  }

  const getIcon = () => {
    switch (syncState.status) {
      case "checking":
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case "uploading":
        return <CloudUpload className="h-4 w-4 animate-pulse" />;
      case "downloading":
        return <CloudDownload className="h-4 w-4 animate-pulse" />;
      case "success":
        return <Check className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "conflict":
        return <CloudOff className="h-4 w-4" />;
      default:
        return <Cloud className="h-4 w-4" />;
    }
  };

  const getButtonText = () => {
    if (syncState.message && syncState.status !== "idle") {
      return syncState.message;
    }

    if (["checking", "uploading", "downloading"].includes(syncState.status)) {
      return "";
    }

    if (syncState.lastSyncTime) {
      const now = new Date();
      const diff = now.getTime() - syncState.lastSyncTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return `${days}d ago`;
      } else if (hours > 0) {
        return `${hours}h ago`;
      } else if (minutes > 0) {
        return `${minutes}m ago`;
      } else {
        return "Just now";
      }
    }

    return "Sync";
  };

  const getButtonVariant = () => {
    switch (syncState.status) {
      case "error":
        return "destructive";
      case "success":
        return "secondary";
      default:
        return "ghost";
    }
  };

  const getTooltipContent = () => {
    let content = "";

    if (syncState.lastSyncTime) {
      content += `Last synced: ${syncState.lastSyncTime.toLocaleString()}`;
    }

    if (syncState.lastError) {
      content += `\nLast error: ${syncState.lastError}`;
    }

    content += `\nAuto-sync: ${
      syncState.autoSyncEnabled ? "Enabled" : "Disabled"
    }`;
    content += "\n\nClick to sync now";
    content += "\nRight-click to toggle auto-sync";

    return content;
  };

  return (
    <Button
      size="sm"
      variant={getButtonVariant()}
      onClick={() => handleSync(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        toggleAutoSync();
      }}
      disabled={["uploading", "downloading", "checking"].includes(
        syncState.status
      )}
      className={cn(
        "gap-2 transition-all relative",
        syncState.status === "success" && "text-green-600 dark:text-green-400",
        syncState.status === "error" && "text-red-600 dark:text-red-400"
      )}
      title={getTooltipContent()}
    >
      {getIcon()}
      <span className="text-xs">{getButtonText()}</span>
      {syncState.autoSyncEnabled && (
        <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full" />
      )}
    </Button>
  );
}
