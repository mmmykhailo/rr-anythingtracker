import { exportData } from "./export";
import type { ExportData } from "./types";

/**
 * Download data as JSON file
 */
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

/**
 * Load data from JSON file
 */
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
