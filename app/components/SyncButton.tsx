import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, CloudCheck, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
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
}

const AUTO_SYNC_INTERVAL = 3 * 60 * 1000; // 3 minutes
const STATUS_RESET_DELAY = 3000; // 3 seconds

export function SyncButton() {
  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetStatus = useCallback(() => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    statusTimeoutRef.current = setTimeout(() => {
      setSyncState((prev) => ({
        ...prev,
        // Keep success status, only reset other statuses
        status: prev.status === "success" ? "success" : "idle",
        message: undefined,
      }));
    }, STATUS_RESET_DELAY);
  }, []);

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

      // Initiate first sync on page load
      handleSync(true);

      // Start auto-sync
      autoSyncIntervalRef.current = setInterval(() => {
        handleSync(true);
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
            message: isAutoSync ? "Auto-uploading..." : "Uploading...",
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

  // Don't render if sync is not configured
  if (!isConfigured) {
    return null;
  }

  const getIcon = () => {
    switch (syncState.status) {
      case "checking":
      case "uploading":
      case "downloading":
        return <RefreshCw className="h-4 w-4 animate-spin text-foreground" />;
      case "success":
        return (
          <CloudCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
        );
      case "error":
      case "conflict":
        return (
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        );
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getTooltipContent = () => {
    let content = "Sync with cloud";

    if (
      syncState.status === "checking" ||
      syncState.status === "uploading" ||
      syncState.status === "downloading"
    ) {
      content = "Syncing...";
    } else if (syncState.status === "success") {
      content = "Sync complete";
    } else if (syncState.status === "error") {
      content = `Sync failed: ${syncState.lastError || "Unknown error"}`;
    }

    if (syncState.lastSyncTime) {
      const now = new Date();
      const diff = now.getTime() - syncState.lastSyncTime.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      let timeAgo = "";
      if (days > 0) {
        timeAgo = `> ${days}d ago`;
      } else if (hours > 0) {
        timeAgo = `> ${hours}h ago`;
      } else if (minutes > 0) {
        timeAgo = `> ${minutes}m ago`;
      } else if (seconds > 30) {
        timeAgo = "> 30s ago";
      } else if (seconds > 15) {
        timeAgo = "> 15s ago";
      } else if (seconds > 5) {
        timeAgo = "> 5s ago";
      } else {
        timeAgo = "Just now";
      }
      content += `\nLast synced: ${timeAgo}`;
    }

    content += "\n\nClick to sync now";

    return content;
  };

  return (
    <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => handleSync(false)}
          disabled={["uploading", "downloading", "checking"].includes(
            syncState.status
          )}
          className={cn("h-8 w-8 transition-all relative")}
        >
          {getIcon()}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="whitespace-pre-line">{getTooltipContent()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
