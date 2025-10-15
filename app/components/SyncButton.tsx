import { useState } from "react";
import { RefreshCw, CloudCheck, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { useSync } from "./SyncProvider";

export function SyncButton() {
  const {
    syncState,
    isConfigured,
    encryptionEnabled,
    isRevalidating,
    handleSync,
  } = useSync();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  // Don't render if sync is not configured
  if (!isConfigured) {
    return null;
  }

  const getIcon = () => {
    // Show spinning icon when revalidating data
    if (isRevalidating) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
    }

    switch (syncState.status) {
      case "checking":
      case "uploading":
      case "downloading":
        return <RefreshCw className="h-4 w-4 animate-spin text-foreground" />;
      case "success":
      case "idle":
        // Show success icon if we have a recent sync
        if (syncState.lastSyncTime) {
          return (
            <CloudCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
          );
        }
        return <RefreshCw className="h-4 w-4" />;
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
    let content = "";

    // Check for revalidating state first
    if (isRevalidating) {
      content = "Refreshing data...";
    } else if (
      syncState.status === "checking" ||
      syncState.status === "uploading" ||
      syncState.status === "downloading"
    ) {
      content = "Syncing...";
    } else if (syncState.status === "success") {
      content = "Sync complete";
    } else if (syncState.status === "error") {
      content = `Sync failed: ${syncState.lastError || "Unknown error"}`;
    } else {
      content = "Sync with cloud";
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

    if (encryptionEnabled) {
      content += "\n🔒 Encryption enabled";
    }

    // Don't show click hint when actively syncing or revalidating
    if (
      !isRevalidating &&
      !["checking", "uploading", "downloading"].includes(syncState.status)
    ) {
      content += "\n\nClick to sync now";
    }

    return content;
  };

  return (
    <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => handleSync(false)}
          disabled={
            isRevalidating ||
            ["uploading", "downloading", "checking"].includes(syncState.status)
          }
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
