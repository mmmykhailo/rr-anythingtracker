import {
  clearAllData,
  saveTrackerWithId,
  getLastChangeDate,
  setLastChangeDate,
  getDB,
} from "../db";
import type { ExportData } from "./types";

/**
 * Import data from JSON
 *
 * @param exportData - The data to import
 * @param clearExisting - If true, clear all existing data first
 */
export async function importData(
  exportData: ExportData,
  clearExisting = false
): Promise<void> {
  if (clearExisting) {
    await clearAndReplace(exportData);
  } else {
    await mergeImportData(exportData);
  }
}

/**
 * Clear existing data and replace with imported data
 */
async function clearAndReplace(exportData: ExportData): Promise<void> {
  await clearAllData();

  if (exportData.lastChangeDate) {
    await setLastChangeDate(new Date(exportData.lastChangeDate));
  }

  for (const trackerData of exportData.trackers) {
    await saveTrackerWithId(
      {
        id: trackerData.id,
        title: trackerData.title,
        type: trackerData.type as any,
        isNumber: trackerData.isNumber,
        goal: trackerData.goal,
        parentId: trackerData.parentId,
        deletedAt: trackerData.deletedAt
          ? new Date(trackerData.deletedAt)
          : undefined,
        updatedAt: trackerData.updatedAt
          ? new Date(trackerData.updatedAt)
          : undefined,
      },
      true
    );

    for (const entry of trackerData.entries) {
      const db = await getDB();
      await db.put("entries", {
        id: entry.id,
        trackerId: trackerData.id,
        date: entry.date,
        value: entry.value,
        comment: entry.comment,
        createdAt: new Date(entry.createdAt),
        deletedAt: entry.deletedAt ? new Date(entry.deletedAt) : undefined,
      });
    }
  }

  // Import tags (if present in export data)
  if (exportData.tags) {
    const db = await getDB();
    for (const tag of exportData.tags) {
      await db.put("entry_tags", {
        id: tag.id,
        entryId: tag.entryId,
        trackerId: tag.trackerId,
        tagName: tag.tagName,
        tagNameWithOriginalCasing: tag.tagNameWithOriginalCasing || tag.tagName,
      });
    }
  }
}

/**
 * Merge imported data with existing data (entity-level conflict resolution)
 *
 * Strategy:
 * - For trackers: Keep newer metadata (title, goal), respect deletedAt from either side
 * - For entries: Keep entry with newer createdAt, respect deletedAt from either side
 * - For tags: Only import if entry exists, no duplicates
 */
async function mergeImportData(exportData: ExportData): Promise<void> {
  const db = await getDB();

  // Handle lastChangeDate: use imported if newer
  if (exportData.lastChangeDate) {
    const existingLastChangeDate = await getLastChangeDate();
    const importedDate = new Date(exportData.lastChangeDate);

    if (!existingLastChangeDate || importedDate > existingLastChangeDate) {
      await setLastChangeDate(importedDate);
    }
  }

  // Process trackers
  for (const trackerData of exportData.trackers) {
    const existingTracker = await db.get("trackers", trackerData.id);

    if (existingTracker) {
      // Merge tracker - use updatedAt for conflict resolution
      const existingUpdatedAt = existingTracker.updatedAt
        ? new Date(existingTracker.updatedAt)
        : undefined;
      const importedUpdatedAt = trackerData.updatedAt
        ? new Date(trackerData.updatedAt)
        : undefined;

      // Determine which metadata to keep based on updatedAt
      let shouldUpdateMetadata = false;
      if (!importedUpdatedAt) {
        // Imported doesn't have timestamp (old export format) - update for backward compatibility
        shouldUpdateMetadata = true;
      } else if (!existingUpdatedAt) {
        // Imported has timestamp but existing doesn't - use imported
        shouldUpdateMetadata = true;
      } else {
        // Both have timestamps - use newer one
        shouldUpdateMetadata = importedUpdatedAt > existingUpdatedAt;
      }

      const updatedTracker = {
        ...existingTracker,
        // Only update metadata if imported is newer
        title: shouldUpdateMetadata ? trackerData.title : existingTracker.title,
        goal: shouldUpdateMetadata ? trackerData.goal : existingTracker.goal,
        updatedAt: shouldUpdateMetadata
          ? importedUpdatedAt
          : existingUpdatedAt,
        // Always merge deletedAt (deletion should sync)
        deletedAt: trackerData.deletedAt
          ? new Date(trackerData.deletedAt)
          : existingTracker.deletedAt, // Keep existing deletedAt if present
      };
      await db.put("trackers", updatedTracker);
    } else {
      // Create new tracker if it doesn't exist
      await saveTrackerWithId(
        {
          id: trackerData.id,
          title: trackerData.title,
          type: trackerData.type as any,
          isNumber: trackerData.isNumber,
          goal: trackerData.goal,
          parentId: trackerData.parentId,
          deletedAt: trackerData.deletedAt
            ? new Date(trackerData.deletedAt)
            : undefined,
          updatedAt: trackerData.updatedAt
            ? new Date(trackerData.updatedAt)
            : undefined,
        },
        true
      );
    }

    // Process entries: keep the one with newer createdAt
    for (const entry of trackerData.entries) {
      const existingEntry = await db.get("entries", entry.id);

      if (existingEntry) {
        const existingCreatedAt = new Date(existingEntry.createdAt);
        const importedCreatedAt = new Date(entry.createdAt);

        // Keep the entry with newer createdAt
        if (importedCreatedAt > existingCreatedAt) {
          // Imported entry is newer - use it
          await db.put("entries", {
            id: entry.id,
            trackerId: trackerData.id,
            date: entry.date,
            value: entry.value,
            comment: entry.comment,
            createdAt: importedCreatedAt,
            deletedAt: entry.deletedAt ? new Date(entry.deletedAt) : undefined,
          });
        } else if (importedCreatedAt.getTime() === existingCreatedAt.getTime()) {
          // Same version - sync deletion if present in imported
          if (entry.deletedAt && !existingEntry.deletedAt) {
            existingEntry.deletedAt = new Date(entry.deletedAt);
            await db.put("entries", existingEntry);
          }
        }
        // Otherwise: Existing entry is newer (existingCreatedAt > importedCreatedAt)
        // This means the deletion is trying to delete an older version - ignore it
      } else {
        // Create new entry if it doesn't exist
        await db.put("entries", {
          id: entry.id,
          trackerId: trackerData.id,
          date: entry.date,
          value: entry.value,
          comment: entry.comment,
          createdAt: new Date(entry.createdAt),
          deletedAt: entry.deletedAt ? new Date(entry.deletedAt) : undefined,
        });
      }
    }
  }

  // Process tags: only import tags for entries that were imported
  if (exportData.tags) {
    for (const tag of exportData.tags) {
      const entry = await db.get("entries", tag.entryId);

      // Only import tag if the entry exists
      if (entry) {
        const existingTag = await db.get("entry_tags", tag.id);

        if (!existingTag) {
          // Only add tag if it doesn't already exist
          await db.put("entry_tags", {
            id: tag.id,
            entryId: tag.entryId,
            trackerId: tag.trackerId,
            tagName: tag.tagName,
            tagNameWithOriginalCasing:
              tag.tagNameWithOriginalCasing || tag.tagName,
          });
        }
      }
    }
  }
}
