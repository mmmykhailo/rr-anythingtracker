import { formatDateString } from "./dates";
import {
  clearAllData,
  getAllTrackers,
  saveTrackerWithId,
  getEntryHistory,
  createEntryWithId,
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
      comment?: string;
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
    exportDate: new Date().toISOString(),
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
            comment: entry.comment,
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
  clearExisting = true
): Promise<void> {
  if (clearExisting) {
    await clearAllData();
  }

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
      },
      true
    );

    for (const entry of trackerData.entries) {
      await createEntryWithId(
        entry.id,
        trackerData.id,
        entry.date,
        entry.value,
        new Date(entry.createdAt),
        true,
        entry.comment
      );
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
    )
  );
}
