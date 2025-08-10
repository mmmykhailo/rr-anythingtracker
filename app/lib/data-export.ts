import { getAllTrackers, saveTracker, saveEntry, clearAllData } from "./db";
import { formatDateString } from "./dates";

export interface ExportData {
  version: string;
  exportDate: string;
  trackers: Array<{
    id: string;
    title: string;
    type: string;
    isNumber: boolean;
    goal?: number;
    entries: Array<{
      date: string;
      value: number;
    }>;
  }>;
}

// Export all data to JSON
export async function exportData(): Promise<ExportData> {
  const trackers = await getAllTrackers();

  const exportData: ExportData = {
    version: "1.0.0",
    exportDate: formatDateString(new Date()),
    trackers: trackers.map((tracker) => ({
      id: tracker.id,
      title: tracker.title,
      type: tracker.type,
      isNumber: tracker.isNumber,
      goal: tracker.goal,
      entries: Object.entries(tracker.values).map(([date, value]) => ({
        date,
        value,
      })),
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
    await clearAllData();
  }

  for (const trackerData of exportData.trackers) {
    // Create tracker
    const tracker = await saveTracker({
      title: trackerData.title,
      type: trackerData.type as any,
      isNumber: trackerData.isNumber,
      goal: trackerData.goal,
    });

    // Add entries
    for (const entry of trackerData.entries) {
      await saveEntry(tracker.id, entry.date, entry.value);
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
            typeof entry.date === "string" && typeof entry.value === "number"
        )
    )
  );
}
