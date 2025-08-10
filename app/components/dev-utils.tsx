import { useState } from "react";
import { Button } from "~/components/ui/button";
import { clearAllData, seedInitialData } from "~/lib/db";
import {
  downloadDataAsJson,
  loadDataFromFile,
  importData,
  validateExportData,
} from "~/lib/data-export";

export function DevUtils() {
  const [isClearing, setIsClearing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleClearData = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all data? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      setIsClearing(true);
      await clearAllData();
      alert("All data cleared successfully. Please refresh the page.");
      window.location.reload();
    } catch (error) {
      console.error("Failed to clear data:", error);
      alert("Failed to clear data. Check console for details.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      await downloadDataAsJson();
    } catch (error) {
      console.error("Failed to export data:", error);
      alert("Failed to export data. Check console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async () => {
    if (!confirm("Import data? This will replace all existing data.")) {
      return;
    }

    try {
      setIsImporting(true);
      const data = await loadDataFromFile();

      if (!validateExportData(data)) {
        throw new Error("Invalid data format");
      }

      await importData(data, true);
      alert("Data imported successfully. Please refresh the page.");
      window.location.reload();
    } catch (error) {
      console.error("Failed to import data:", error);
      alert("Failed to import data. Check console for details.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setIsSeeding(true);
      await seedInitialData();
      alert("Sample data added successfully. Please refresh the page.");
      window.location.reload();
    } catch (error) {
      console.error("Failed to seed data:", error);
      alert("Failed to seed data. Check console for details.");
    } finally {
      setIsSeeding(false);
    }
  };

  // Only show in development mode
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg border border-gray-600 text-sm max-w-xs">
      <div className="font-medium mb-2 text-gray-300">Dev Utils</div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleClearData}
            disabled={isClearing}
          >
            {isClearing ? "Clearing..." : "Clear Data"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSeedData}
            disabled={isSeeding}
          >
            {isSeeding ? "Seeding..." : "Seed Data"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportData}
            disabled={isExporting}
          >
            {isExporting ? "Exporting..." : "Export"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleImportData}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import"}
          </Button>
        </div>
      </div>
    </div>
  );
}
