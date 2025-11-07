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
  console.log("Clearing existing data...");
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
        tagNameWithOriginalCasing:
          tag.tagNameWithOriginalCasing || tag.tagName,
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
      // Update tracker - handle deletedAt logic
      // If remote has deletedAt, set it locally (deletion should sync)
      // If local already has deletedAt, keep it (don't resurrect)
      const updatedTracker = {
        ...existingTracker,
        title: trackerData.title,
        goal: trackerData.goal,
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

        // Keep the newer entry, and handle deletedAt
        if (importedCreatedAt > existingCreatedAt) {
          await db.put("entries", {
            id: entry.id,
            trackerId: trackerData.id,
            date: entry.date,
            value: entry.value,
            comment: entry.comment,
            createdAt: importedCreatedAt,
            deletedAt: entry.deletedAt ? new Date(entry.deletedAt) : undefined,
          });
        } else {
          // Existing is newer, but still check if we need to sync deletedAt
          if (entry.deletedAt && !existingEntry.deletedAt) {
            // Remote has deletion, apply it locally
            existingEntry.deletedAt = new Date(entry.deletedAt);
            await db.put("entries", existingEntry);
          }
        }
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
