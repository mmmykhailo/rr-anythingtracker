import type { ExportData } from "../data-export";
import type { ConflictResolution } from "./types";

/**
 * Resolves sync conflicts using last-write-wins strategy based on lastChangeDate
 *
 * @param localData - Local export data
 * @param remoteData - Remote export data
 * @returns The action to take: 'upload', 'download', or 'no-change'
 */
export function resolveConflict(
  localData: ExportData,
  remoteData: ExportData
): ConflictResolution {
  // Get change dates with fallback to export date
  const localChangeDate = localData.lastChangeDate
    ? new Date(localData.lastChangeDate)
    : new Date(localData.exportDate);

  const remoteChangeDate = remoteData.lastChangeDate
    ? new Date(remoteData.lastChangeDate)
    : new Date(remoteData.exportDate);

  const localTime = localChangeDate.getTime();
  const remoteTime = remoteChangeDate.getTime();

  // No changes detected
  if (localTime === remoteTime) {
    return "no-change";
  }

  // Last-write-wins: newer timestamp takes precedence
  if (localTime > remoteTime) {
    return "upload";
  } else {
    return "download";
  }
}

/**
 * Checks if local data has no trackers (first-time sync scenario)
 *
 * @param localData - Local export data
 * @returns True if this appears to be first-time sync
 */
export function isFirstTimeSync(localData: ExportData): boolean {
  return localData.trackers.length === 0;
}

/**
 * Get a human-readable description of the conflict resolution
 *
 * @param resolution - The conflict resolution action
 * @returns Description string
 */
export function getResolutionDescription(resolution: ConflictResolution): string {
  switch (resolution) {
    case "upload":
      return "Local changes are newer, uploading to cloud";
    case "download":
      return "Remote changes are newer, downloading from cloud";
    case "no-change":
      return "No changes detected";
  }
}
