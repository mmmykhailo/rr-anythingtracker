import {
  clearAllData,
  getAllTrackers,
  saveTrackerWithId,
  getEntryHistory,
  createEntryWithId,
  getLastChangeDate,
  setLastChangeDate,
  getDB,
} from "./db";
import { APP_VERSION } from "./version";

export interface ExportData {
  version: string;
  exportDate: string;
  lastChangeDate?: string;
  trackers: Array<{
    id: string;
    title: string;
    type: string;
    isNumber: boolean;
    goal?: number;
    parentId?: string;
    deletedAt?: string;
    entries: Array<{
      id: string;
      date: string;
      value: number;
      comment?: string;
      createdAt: string;
      deletedAt?: string;
    }>;
  }>;
  tags: Array<{
    id: string;
    entryId: string;
    trackerId: string;
    tagName: string;
    tagNameWithOriginalCasing?: string;
  }>;
}

// Export all data to JSON (including deleted items for sync)
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
        const allEntries = await db.getAllFromIndex("entries", "by-tracker", tracker.id);

        return {
          id: tracker.id,
          title: tracker.title,
          type: tracker.type,
          isNumber: tracker.isNumber,
          goal: tracker.goal,
          parentId: tracker.parentId,
          deletedAt: tracker.deletedAt?.toISOString(),
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

// Import data from JSON
export async function importData(
  exportData: ExportData,
  clearExisting = false
): Promise<void> {
  if (clearExisting) {
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
          deletedAt: trackerData.deletedAt ? new Date(trackerData.deletedAt) : undefined,
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
  } else {
    // Merge mode: combine imported data with existing data
    await mergeImportData(exportData);
  }
}

// Merge imported data with existing data
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
          deletedAt: trackerData.deletedAt ? new Date(trackerData.deletedAt) : undefined,
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

// Download data as JSON file
export async function downloadDataAsJson(): Promise<void> {
  const data = await exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // Format the datetime for filename: YYYY-MM-DD_HH-MM-SS
  const dateForFilename = data.exportDate
    .replace(/:/g, "-")
    .replace("T", "_")
    .replace(/\.\d{3}Z$/, "");
  a.download = `anythingtracker-backup-${dateForFilename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Load data from JSON file
export function loadDataFromFile(): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          resolve(data);
        } catch (error) {
          reject(new Error("Invalid JSON file"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    };

    input.click();
  });
}

// Validate export data format
export function validateExportData(data: any): data is ExportData {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.version === "string" &&
    typeof data.exportDate === "string" &&
    (typeof data.lastChangeDate === "string" ||
      data.lastChangeDate === undefined) &&
    Array.isArray(data.trackers) &&
    data.trackers.every(
      (tracker: any) =>
        typeof tracker.id === "string" &&
        typeof tracker.title === "string" &&
        typeof tracker.type === "string" &&
        typeof tracker.isNumber === "boolean" &&
        Array.isArray(tracker.entries) &&
        tracker.entries.every(
          (entry: any) =>
            typeof entry.id === "string" &&
            typeof entry.date === "string" &&
            typeof entry.value === "number" &&
            typeof entry.createdAt === "string" &&
            (entry.comment === undefined || typeof entry.comment === "string")
        )
    ) &&
    (data.tags === undefined ||
      (Array.isArray(data.tags) &&
        data.tags.every(
          (tag: any) =>
            typeof tag.id === "string" &&
            typeof tag.entryId === "string" &&
            typeof tag.trackerId === "string" &&
            typeof tag.tagName === "string" &&
            (tag.tagNameWithOriginalCasing === undefined ||
              typeof tag.tagNameWithOriginalCasing === "string")
        )))
  );
}
