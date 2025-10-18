import {
  ChevronLeft,
  Download,
  Upload,
  Settings as SettingsIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigation, useSubmit } from "react-router";
import type { ClientActionFunctionArgs } from "react-router";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
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
import { isSyncConfigured } from "~/lib/github-gist-sync";
import {
  getShowHiddenTrackers,
  setShowHiddenTrackers,
  getEncryptionEnabled,
} from "~/lib/user-settings";

export async function clientAction({ request }: ClientActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "export") {
      const result = await exportAllData();
      return { success: result.success, message: result.message };
    }

    if (intent === "import") {
      const result = await importAllDataWithConfirmation();
      if (result) {
        return {
          success: result.success,
          message: result.message,
          shouldReload: result.success
        };
      }
      return { success: false, message: "Import cancelled" };
    }

    if (intent === "toggleHiddenTrackers") {
      const showHidden = formData.get("showHidden") === "true";
      setShowHiddenTrackers(showHidden);
      window.dispatchEvent(new Event("storage"));
      return { success: true };
    }

    return { success: false, message: "Unknown intent" };
  } catch (error) {
    console.error("Settings action error:", error);
    return { success: false, message: "An error occurred" };
  }
}

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
  const navigation = useNavigation();
  const submit = useSubmit();
  const [showHiddenTrackers, setShowHiddenTrackersState] = useState(
    getShowHiddenTrackers()
  );

  const syncConfigured = isSyncConfigured();
  const encryptionEnabled = getEncryptionEnabled();

  const isExporting = navigation.state === "submitting" && navigation.formData?.get("intent") === "export";
  const isImporting = navigation.state === "submitting" && navigation.formData?.get("intent") === "import";

  const handleExport = async () => {
    const formData = new FormData();
    formData.append("intent", "export");
    submit(formData, { method: "post" });
  };

  const handleImport = async () => {
    const formData = new FormData();
    formData.append("intent", "import");
    submit(formData, { method: "post" });
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

  const handleToggleHiddenTrackers = (checked: boolean) => {
    setShowHiddenTrackersState(checked);

    const formData = new FormData();
    formData.append("intent", "toggleHiddenTrackers");
    formData.append("showHidden", checked.toString());
    submit(formData, { method: "post" });
  };

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

        {/* Hidden Trackers Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Hidden Trackers
            </CardTitle>
            <CardDescription>
              Control visibility of hidden trackers on the home page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="showHiddenTrackers"
                  checked={showHiddenTrackers}
                  onCheckedChange={(checked) =>
                    handleToggleHiddenTrackers(checked === true)
                  }
                />
                <Label
                  htmlFor="showHiddenTrackers"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Show hidden trackers
                </Label>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                <p className="mb-2">
                  Hidden trackers are useful for archiving trackers you no
                  longer actively use without deleting their data, or for
                  temporarily hiding trackers when taking screenshots.
                </p>
                <p>
                  You can mark any tracker as hidden from its edit page. Hidden
                  trackers will not appear on the home page unless this setting
                  is enabled.
                </p>
              </div>
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
