import {
  downloadDataAsJson,
  loadDataFromFile,
  importData,
  validateExportData,
} from "./data-export";

export interface DataOperationResult {
  success: boolean;
  message: string;
}

/**
 * Export all tracker data to a JSON file
 * @returns Promise with operation result
 */
export async function exportAllData(): Promise<DataOperationResult> {
  try {
    await downloadDataAsJson();
    return {
      success: true,
      message: "Data exported successfully",
    };
  } catch (error) {
    console.error("Failed to export data:", error);
    return {
      success: false,
      message: "Failed to export data. Check console for details.",
    };
  }
}

/**
 * Import data from a JSON file, replacing all existing data
 * @returns Promise with operation result
 */
export async function importAllData(): Promise<DataOperationResult> {
  try {
    const data = await loadDataFromFile();

    if (!validateExportData(data)) {
      throw new Error("Invalid data format");
    }

    await importData(data, true);
    return {
      success: true,
      message: "Data imported successfully. Please refresh the page.",
    };
  } catch (error) {
    console.error("Failed to import data:", error);
    return {
      success: false,
      message: "Failed to import data. Check console for details.",
    };
  }
}

/**
 * Import data from a JSON file with confirmation
 * @returns Promise with operation result or null if cancelled
 */
export async function importAllDataWithConfirmation(): Promise<DataOperationResult | null> {
  if (!confirm("Import data? This will replace all existing data.")) {
    return null;
  }

  return importAllData();
}
