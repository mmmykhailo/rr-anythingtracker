import { useState } from "react";
import { Button } from "~/components/ui/button";
import { clearAllData, seedInitialData } from "~/lib/db";
import {
  downloadDataAsJson,
  loadDataFromFile,
  importData,
  validateExportData,
  exportData,
} from "~/lib/data-export";
import {
  uploadJsonToGist,
  downloadJsonFromGist,
  isSyncConfigured,
  getGitHubCredentials,
} from "~/lib/github-gist-sync";
import { Link } from "react-router";
import { Settings } from "lucide-react";

export function DevUtils() {
  const [isClearing, setIsClearing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUploadingToGist, setIsUploadingToGist] = useState(false);
  const [isDownloadingFromGist, setIsDownloadingFromGist] = useState(false);

  const syncConfigured = isSyncConfigured();
  const { isOptedOut } = getGitHubCredentials();

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

  const handleUploadToGist = async () => {
    if (!syncConfigured) {
      if (
        confirm(
          "GitHub sync is not configured. Would you like to set it up now?"
        )
      ) {
        window.location.href = "/github-sync-settings";
      }
      return;
    }

    try {
      setIsUploadingToGist(true);
      const data = await exportData();
      const success = await uploadJsonToGist(data, {
        filename: "anythingtracker-backup.json",
        description: "AnythingTracker data backup",
      });
      if (success) {
        alert("Data uploaded to GitHub Gist successfully!");
      } else {
        alert(
          "Failed to upload data to GitHub Gist. Check console for details."
        );
      }
    } catch (error) {
      console.error("Failed to upload to Gist:", error);
      alert("Failed to upload to Gist. Check console for details.");
    } finally {
      setIsUploadingToGist(false);
    }
  };

  const handleDownloadFromGist = async () => {
    if (!syncConfigured) {
      if (
        confirm(
          "GitHub sync is not configured. Would you like to set it up now?"
        )
      ) {
        window.location.href = "/github-sync-settings";
      }
      return;
    }

    if (
      !confirm("Download data from Gist? This will replace all existing data.")
    ) {
      return;
    }

    try {
      setIsDownloadingFromGist(true);
      const data = await downloadJsonFromGist({
        filename: "anythingtracker-backup.json",
      });

      if (!data) {
        throw new Error("No data received from Gist");
      }

      if (!validateExportData(data)) {
        throw new Error("Invalid data format from Gist");
      }

      await importData(data, true);
      alert("Data downloaded from Gist successfully. Please refresh the page.");
      window.location.reload();
    } catch (error) {
      console.error("Failed to download from Gist:", error);
      alert("Failed to download from Gist. Check console for details.");
    } finally {
      setIsDownloadingFromGist(false);
    }
  };

  // Only show in development mode
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg border border-gray-600 text-sm max-w-xs">
      <div className="font-medium mb-2 text-gray-300 flex items-center justify-between">
        <span>Dev Utils</span>
        <Button size="sm" variant="ghost" asChild className="h-6 px-2">
          <Link to="/github-sync-settings">
            <Settings className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      {/* Sync Status Indicator */}
      <div className="mb-2 text-xs">
        {isOptedOut ? (
          <span className="text-yellow-400">⚠️ Sync opted out</span>
        ) : syncConfigured ? (
          <span className="text-green-400">✓ Sync configured</span>
        ) : (
          <span className="text-red-400">✗ Sync not configured</span>
        )}
      </div>

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
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUploadToGist}
            disabled={isUploadingToGist || isOptedOut}
            className="flex-1"
            title={
              isOptedOut
                ? "Sync opted out"
                : !syncConfigured
                ? "Sync not configured"
                : "Upload to GitHub Gist"
            }
          >
            {isUploadingToGist ? "Uploading..." : "↑ Gist"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadFromGist}
            disabled={isDownloadingFromGist || isOptedOut}
            className="flex-1"
            title={
              isOptedOut
                ? "Sync opted out"
                : !syncConfigured
                ? "Sync not configured"
                : "Download from GitHub Gist"
            }
          >
            {isDownloadingFromGist ? "Downloading..." : "↓ Gist"}
          </Button>
        </div>
      </div>
    </div>
  );
}
