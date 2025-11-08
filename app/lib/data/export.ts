import { getLastChangeDate, getDB } from "../db";
import { APP_VERSION } from "../version";
import type { ExportData } from "./types";

/**
 * Export all data to JSON (including deleted items for sync)
 */
export async function exportData(): Promise<ExportData> {
  const lastChangeDate = await getLastChangeDate();
  const db = await getDB();

  // Get ALL trackers (including deleted ones)
  const allTrackers = await db.getAll("trackers");

  // Get all tags
  const allTags = await db.getAll("entry_tags");

  const exportData: ExportData = {
    version: APP_VERSION,
    exportDate: new Date().toISOString(),
    lastChangeDate: lastChangeDate?.toISOString(),
    trackers: await Promise.all(
      allTrackers.map(async (tracker) => {
        // Get ALL entries for this tracker (including deleted ones)
        const allEntries = await db.getAllFromIndex(
          "entries",
          "by-tracker",
          tracker.id
        );

        return {
          id: tracker.id,
          title: tracker.title,
          type: tracker.type,
          isNumber: tracker.isNumber,
          goal: tracker.goal,
          parentId: tracker.parentId,
          deletedAt: tracker.deletedAt?.toISOString(),
          updatedAt: tracker.updatedAt?.toISOString(),
          entries: allEntries.map((entry) => ({
            id: entry.id,
            date: entry.date,
            value: entry.value,
            comment: entry.comment,
            createdAt: entry.createdAt.toISOString(),
            deletedAt: entry.deletedAt?.toISOString(),
          })),
        };
      })
    ),
    tags: allTags.map((tag) => ({
      id: tag.id,
      entryId: tag.entryId,
      trackerId: tag.trackerId,
      tagName: tag.tagName,
      tagNameWithOriginalCasing: tag.tagNameWithOriginalCasing,
    })),
  };

  return exportData;
}
