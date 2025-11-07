import { exportData, importData, validateExportData } from "../data-export";
import {
  uploadJsonToGist,
  downloadJsonFromGist,
} from "../github-gist-sync";
import { resolveConflict, isFirstTimeSync } from "./conflict-resolver";
import type { SyncResult } from "./types";

const GIST_FILENAME = "anythingtracker-data.json";
const GIST_DESCRIPTION = "AnythingTracker backup data";

/**
 * Performs a complete sync operation
 *
 * This function:
 * 1. Exports local data
 * 2. Downloads remote data from Gist
 * 3. Resolves any conflicts using last-write-wins
 * 4. Either uploads local data or imports remote data
 * 5. Returns the result with status and messages
 *
 * @returns Promise<SyncResult> with status, message, and whether data changed
 */
export async function performSync(): Promise<SyncResult> {
  try {
    // Step 1: Export local data
    const localData = await exportData();

    // Step 2: Download remote data
    const remoteData = await downloadJsonFromGist({
      filename: GIST_FILENAME,
    });

    // Step 3: Handle different scenarios
    if (!remoteData) {
      // No remote data exists yet - upload local data
      const uploadSuccess = await uploadJsonToGist(localData, {
        filename: GIST_FILENAME,
        description: GIST_DESCRIPTION,
      });

      if (!uploadSuccess) {
        return {
          status: "error",
          message: "Sync failed",
          dataChanged: false,
          error: "Failed to upload to cloud",
        };
      }

      // Save sync time
      const now = new Date();
      localStorage.setItem("last_sync_time", now.toISOString());

      return {
        status: "success",
        message: "Synced",
        dataChanged: false,
        timestamp: now,
      };
    }

    // Validate remote data
    if (!validateExportData(remoteData)) {
      return {
        status: "error",
        message: "Sync failed",
        dataChanged: false,
        error: "Invalid remote data format",
      };
    }

    // Step 4: Check if this is first-time sync
    if (isFirstTimeSync(localData)) {
      // First-time sync - download remote data
      await importData(remoteData, false);

      const now = new Date();
      localStorage.setItem("last_sync_time", now.toISOString());

      return {
        status: "success",
        message: "Synced",
        dataChanged: true,
        timestamp: now,
      };
    }

    // Step 5: Resolve conflict using last-write-wins
    const resolution = resolveConflict(localData, remoteData);

    if (resolution === "no-change") {
      // No changes needed
      return {
        status: "success",
        message: "Synced",
        dataChanged: false,
        timestamp: new Date(),
      };
    }

    if (resolution === "download") {
      // Remote is newer - download and merge
      await importData(remoteData, false);

      const now = new Date();
      localStorage.setItem("last_sync_time", now.toISOString());

      return {
        status: "success",
        message: "Synced",
        dataChanged: true,
        timestamp: now,
      };
    }

    // resolution === "upload"
    // Local is newer - upload to cloud
    const uploadSuccess = await uploadJsonToGist(localData, {
      filename: GIST_FILENAME,
      description: GIST_DESCRIPTION,
    });

    if (!uploadSuccess) {
      return {
        status: "error",
        message: "Sync failed",
        dataChanged: false,
        error: "Failed to upload to cloud",
      };
    }

    const now = new Date();
    localStorage.setItem("last_sync_time", now.toISOString());

    return {
      status: "success",
      message: "Synced",
      dataChanged: false,
      timestamp: now,
    };
  } catch (error) {
    console.error("Sync failed:", error);

    let errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Provide more specific error messages for encryption-related failures
    const lowerMessage = errorMessage.toLowerCase();
    if (lowerMessage.includes("encrypt")) {
      errorMessage = "Encryption failed. Check your GitHub token.";
    } else if (lowerMessage.includes("decrypt")) {
      errorMessage =
        "Decryption failed. The data may be encrypted with a different token.";
    } else if (lowerMessage.includes("invalid password")) {
      errorMessage = "Unable to decrypt data. GitHub token may have changed.";
    }

    return {
      status: "error",
      message: "Sync failed",
      dataChanged: false,
      error: errorMessage,
    };
  }
}
