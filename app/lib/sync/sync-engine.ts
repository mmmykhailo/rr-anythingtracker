import { exportData, importData, validateExportData } from "../data";
import {
  uploadJsonToGist,
  downloadJsonFromGist,
} from "../github-gist-sync";
import type { SyncResult } from "./types";

const GIST_FILENAME = "anythingtracker-data.json";
const GIST_DESCRIPTION = "AnythingTracker backup data";

/**
 * Performs a complete bidirectional sync operation
 *
 * Strategy: ALWAYS merge at entity level, never choose one database over another
 * 
 * Flow:
 * 1. Export local data
 * 2. Download remote data from Gist
 * 3. Merge remote into local (entity-level merge handles conflicts)
 * 4. Upload merged result back to cloud
 * 5. Both devices end up with identical merged data
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

    // Step 3: Handle first-time sync (no remote data)
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

    // Step 4: Check if local is empty (first sync on this device)
    const isFirstTimeSync = localData.trackers.length === 0;

    // Step 5: ALWAYS merge remote into local (bidirectional merge)
    // importData with merge mode handles entity-level conflict resolution
    await importData(remoteData, false);

    // Step 6: Get the merged result
    const mergedData = await exportData();

    // Step 7: Upload merged result back to cloud
    // This ensures both devices eventually converge to the same state
    const uploadSuccess = await uploadJsonToGist(mergedData, {
      filename: GIST_FILENAME,
      description: GIST_DESCRIPTION,
    });

    if (!uploadSuccess) {
      return {
        status: "error",
        message: "Sync failed",
        dataChanged: isFirstTimeSync, // Data still changed locally even if upload failed
        error: "Failed to upload merged data to cloud",
      };
    }

    const now = new Date();
    localStorage.setItem("last_sync_time", now.toISOString());

    return {
      status: "success",
      message: "Synced",
      dataChanged: isFirstTimeSync, // Only UI refresh needed on first sync
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
