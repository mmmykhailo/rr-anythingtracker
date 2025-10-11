import {
  ChevronLeft,
  Download,
  Upload,
  Settings as SettingsIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  exportAllData,
  importAllDataWithConfirmation,
} from "~/lib/data-operations";
import { isSyncConfigured, isEncryptionEnabled } from "~/lib/github-gist-sync";

export function meta() {
  return [
    { title: "Settings - AnythingTracker" },
    {
      name: "description",
      content:
        "Manage your AnythingTracker settings, data export/import, and sync options",
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
}

export default function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const syncConfigured = isSyncConfigured();
  const encryptionEnabled = isEncryptionEnabled();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const result = await exportAllData();
      if (!result.success) {
        alert(result.message);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      setIsImporting(true);
      const result = await importAllDataWithConfirmation();
      if (result) {
        if (result.success) {
          alert(result.message);
          window.location.reload();
        } else {
          alert(result.message);
        }
      }
    } finally {
      setIsImporting(false);
    }
  };

  const getGitHubSyncStatus = () => {
    if (syncConfigured) {
      return {
        text: "Configured",
        color: "text-green-600 dark:text-green-400",
      };
    }
    return { text: "Not configured", color: "text-gray-500" };
  };

  const gitHubStatus = getGitHubSyncStatus();

  return (
    <div>
      <div className="w-full h-16 flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" prefetch="viewport">
              <ChevronLeft />
            </Link>
          </Button>
          <span className="font-medium">Settings</span>
        </div>
      </div>

      <div className="flex flex-col py-6 gap-4">
        {/* Data Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Data Management
            </CardTitle>
            <CardDescription>
              Export your data for backup or import from a previous backup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={isExporting}
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Downloading..." : "Download my data"}
              </Button>
              <Button
                variant="outline"
                onClick={handleImport}
                disabled={isImporting}
                className="w-full justify-start"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? "Importing..." : "Import data"}
              </Button>
              <div className="text-xs text-muted-foreground mt-2">
                Download creates a JSON file with all your trackers and history.
                Import REPLACES all existing data.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GitHub Sync Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              GitHub Sync
            </CardTitle>
            <CardDescription>
              Backup to GitHub Gist and sync across devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Status</span>
                <span className={`text-sm font-medium ${gitHubStatus.color}`}>
                  {gitHubStatus.text}
                </span>
              </div>
              {syncConfigured && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Encryption</span>
                  <span
                    className={`text-sm font-medium ${
                      encryptionEnabled
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-500"
                    }`}
                  >
                    {encryptionEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              )}
              <Separator />
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
              >
                <Link to="/github-sync-settings" prefetch="viewport">
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Configure GitHub Sync
                </Link>
              </Button>
              {syncConfigured && (
                <div className="text-xs text-muted-foreground mt-2">
                  Your data is automatically backed up to GitHub Gist. Use the
                  Dev Utils panel to manually sync.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>AnythingTracker</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                A privacy-first habit tracker that stores all data locally in
                your browser. No servers, no tracking, complete ownership of
                your data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
