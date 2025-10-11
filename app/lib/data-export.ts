import { formatDateString } from "./dates";
import {
  clearAllData,
  getAllTrackers,
  getTrackerById,
  saveTracker,
  updateTracker,
  getEntryHistory,
  createEntry,
  getLastChangeDate,
  setLastChangeDate,
} from "./db";

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
    entries: Array<{
      id: string;
      date: string;
      value: number;
      createdAt: string;
    }>;
  }>;
}

// Export all data to JSON
export async function exportData(): Promise<ExportData> {
  const trackers = await getAllTrackers();
  const lastChangeDate = await getLastChangeDate();

  const exportData: ExportData = {
    version: "1.0.0",
    exportDate: formatDateString(new Date()),
    lastChangeDate: lastChangeDate?.toISOString(),
    trackers: await Promise.all(
      trackers.map(async (tracker) => {
        const entries = await getEntryHistory(tracker.id);
        return {
          id: tracker.id,
          title: tracker.title,
          type: tracker.type,
          isNumber: tracker.isNumber,
          goal: tracker.goal,
          parentId: tracker.parentId,
          entries: entries.map((entry) => ({
            id: entry.id,
            date: entry.date,
            value: entry.value,
            createdAt: entry.createdAt.toISOString(),
          })),
        };
      })
    ),
  };

  return exportData;
}

// Import data from JSON
export async function importData(
  exportData: ExportData,
  clearExisting = false
): Promise<void> {
  if (clearExisting) {
    await clearAllData();
  }

  // Set the last change date from imported data
  if (exportData.lastChangeDate) {
    await setLastChangeDate(new Date(exportData.lastChangeDate));
  }

  // Create a mapping from old IDs to new IDs
  const idMapping: Record<string, string> = {};

  // First pass: Create all trackers without parentId and build ID mapping
  for (const trackerData of exportData.trackers) {
    const tracker = await saveTracker({
      title: trackerData.title,
      type: trackerData.type as any,
      isNumber: trackerData.isNumber,
      goal: trackerData.goal,
      // Don't set parentId yet
    });

    // Map old ID to new ID
    idMapping[trackerData.id] = tracker.id;
  }

  // Second pass: Update parent-child relationships and add entries
  for (const trackerData of exportData.trackers) {
    const newTrackerId = idMapping[trackerData.id];

    // Update parentId if it exists
    if (trackerData.parentId) {
      const newParentId = idMapping[trackerData.parentId];
      if (newParentId) {
        const tracker = await getTrackerById(newTrackerId);
        if (tracker) {
          tracker.parentId = newParentId;
          await updateTracker(tracker);
        }
      }
    }

    // Import entries as individual entries to preserve history
    for (const entry of trackerData.entries) {
      await createEntry(newTrackerId, entry.date, entry.value, true);
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
  a.download = `anythingtracker-backup-${data.exportDate}.json`;
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
            typeof entry.createdAt === "string"
        )
    )
  );
}
