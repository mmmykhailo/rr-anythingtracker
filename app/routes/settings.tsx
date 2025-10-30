import {
  ChevronLeft,
  Download,
  Upload,
  Settings as SettingsIcon,
  CheckCircle2,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import {
  Link,
  useNavigation,
  useSubmit,
  useActionData,
  Form,
} from "react-router";
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
import { exportAllData } from "~/lib/data-operations";
import { importData, validateExportData } from "~/lib/data-export";
import { debouncedDataChange } from "~/lib/data-change-events";
import { isSyncConfigured } from "~/lib/github-gist-sync";
import {
  getShowHiddenTrackers,
  setShowHiddenTrackers,
  getEncryptionEnabled,
} from "~/lib/user-settings";
import { useStateWithDelayedReset } from "~/lib/hooks";
import { APP_VERSION, CHANGELOG } from "~/lib/version";
import clsx from "clsx";

export async function clientAction({ request }: ClientActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "export") {
      const result = await exportAllData();
      return {
        success: result.success,
        message: result.message,
        intent: "export",
      };
    }

    if (intent === "import") {
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return {
          success: false,
          message: "No file selected",
          intent: "import",
        };
      }

      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
      });

      const data = JSON.parse(text);

      if (!validateExportData(data)) {
        return {
          success: false,
          message: "Invalid data format",
          intent: "import",
        };
      }

      await importData(data);
      debouncedDataChange.dispatch("data_imported");

      return {
        success: true,
        message: "Data imported successfully",
        shouldReload: true,
        intent: "import",
      };
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
    return {
      success: false,
      message: error instanceof Error ? error.message : "An error occurred",
    };
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
  const actionData = useActionData<typeof clientAction>();
  const transientActionData = useStateWithDelayedReset(actionData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFormRef = useRef<HTMLFormElement>(null);
  const [showHiddenTrackers, setShowHiddenTrackersState] = useState(
    getShowHiddenTrackers()
  );

  const syncConfigured = isSyncConfigured();
  const encryptionEnabled = getEncryptionEnabled();

  const isExporting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "export";
  const isImporting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "import";

  const exportSuccess =
    transientActionData?.success &&
    "intent" in transientActionData &&
    transientActionData.intent === "export";
  const importSuccess =
    transientActionData?.success &&
    "intent" in transientActionData &&
    transientActionData.intent === "import";

  const handleExport = async () => {
    const formData = new FormData();
    formData.append("intent", "export");
    submit(formData, { method: "post" });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm("Import data? This will replace all existing data.")) {
      event.target.value = "";
      return;
    }

    if (importFormRef.current) {
      submit(importFormRef.current, { method: "post" });
    }

    event.target.value = "";
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
                {exportSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                    Exported
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? "Downloading..." : "Download my data"}
                  </>
                )}
              </Button>
              <Form
                ref={importFormRef}
                className="hidden"
                encType="multipart/form-data"
              >
                <input type="hidden" name="intent" value="import" />
                <input
                  ref={fileInputRef}
                  type="file"
                  name="file"
                  accept=".json"
                  onChange={handleFileChange}
                />
              </Form>
              <Button
                variant="outline"
                onClick={handleImportClick}
                disabled={isImporting}
                className="w-full justify-start"
              >
                {importSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                    Imported
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {isImporting ? "Importing..." : "Import data"}
                  </>
                )}
              </Button>
              <div className="text-xs text-muted-foreground mt-2">
                Download creates a JSON file with all your trackers and history.
                Import might break existing data. Please backup your data before
                importing.
                <br />
                It is recommended to import data exported from the same version
                of AnythingTracker.
              </div>
            </div>
          </CardContent>
        </Card>

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
                <span
                  className={clsx("text-sm font-medium", gitHubStatus.color)}
                >
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

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>AnythingTracker</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                A privacy-first habit tracker that stores all data locally in
                your browser—no servers, no tracking, complete ownership of your
                data—with optional sync across devices via a private, end-to-end
                encrypted GitHub Gist.
              </p>
              <div className="pt-2 border-t mt-3">
                <span className="text-xs font-medium">
                  Version {APP_VERSION}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changelog</CardTitle>
            <CardDescription>Recent updates and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {CHANGELOG.length > 0 ? (
                CHANGELOG.slice(0, 5).map((entry) => (
                  <div key={entry.version}>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-semibold text-sm">
                        v{entry.version}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {entry.date}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-line">
                      {entry.changes}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No changelog available.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
