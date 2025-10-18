import { ChevronLeft, Save, Github, Info, X, Shield } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link, redirect, useLocation, Form, useNavigation, useActionData, useLoaderData } from "react-router";
import type { ClientActionFunctionArgs, ClientLoaderFunctionArgs } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { downloadJsonFromGist } from "~/lib/github-gist-sync";
import { isCryptoSupported } from "~/lib/crypto";
import { EncryptionMigrationInfo } from "~/components/EncryptionMigrationInfo";
import {
  getGithubToken,
  setGithubToken,
  removeGithubToken,
  getGistId,
  setGistId,
  removeGistId,
  getEncryptionEnabled,
  setEncryptionEnabled,
} from "~/lib/user-settings";

type GithubSyncSettingsPageErrors = {
  token?: string;
  gist?: string;
  general?: string;
};

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  return {
    githubToken: getGithubToken() || "",
    gistId: getGistId() || "",
    encryptionEnabled: getEncryptionEnabled(),
    isSyncEnabled: !!(getGithubToken() && getGistId()),
  };
}

export async function clientAction({ request }: ClientActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "save") {
      const githubToken = formData.get("githubToken") as string;
      const gistId = formData.get("gistId") as string;
      const encryptionEnabled = formData.get("encryptionEnabled") === "true";

      if (!githubToken.trim() && !gistId.trim()) {
        return {
          error: {
            token: "Please provide both token and Gist ID to enable sync",
            gist: "Please provide both token and Gist ID to enable sync",
          },
        };
      }

      if (!githubToken.trim()) {
        return { error: { token: "GitHub Personal Access Token is required" } };
      }

      if (!gistId.trim()) {
        return { error: { gist: "Gist ID is required" } };
      }

      setGithubToken(githubToken.trim());
      setGistId(gistId.trim());
      setEncryptionEnabled(encryptionEnabled);

      return redirect("/");
    }

    if (intent === "optOut") {
      removeGithubToken();
      removeGistId();
      return redirect("/");
    }

    return { success: false };
  } catch (error) {
    console.error("Failed to save GitHub sync settings:", error);
    return { error: { general: "Failed to save settings" } };
  }
}

export function meta() {
  return [
    { title: "GitHub Sync Settings - AnythingTracker" },
    {
      name: "description",
      content:
        "Configure GitHub Gist sync for backup and cross-device synchronization",
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
}

export default function GitHubSyncSettingsPage() {
  const location = useLocation();
  const navigation = useNavigation();
  const actionData = useActionData<typeof clientAction>();
  const loaderData = useLoaderData<typeof clientLoader>();

  const [githubToken, setGithubTokenState] = useState(loaderData.githubToken);
  const [gistId, setGistIdState] = useState(loaderData.gistId);
  const savedEncryptionEnabled = loaderData.encryptionEnabled;
  const [encryptionEnabled, setEncryptionEnabledState] = useState(savedEncryptionEnabled);
  const [showTokenInfo, setShowTokenInfo] = useState(false);
  const [showGistInfo, setShowGistInfo] = useState(false);
  const [showEncryptionInfo, setShowEncryptionInfo] = useState(false);
  const [hasExistingGistData, setHasExistingGistData] = useState(false);

  const isSaving = navigation.state === "submitting" && navigation.formData?.get("intent") === "save";
  const isSyncEnabled = loaderData.isSyncEnabled;

  const errors = useMemo((): GithubSyncSettingsPageErrors => {
    if (actionData && "error" in actionData && actionData.error) {
      return actionData.error;
    }
    return {};
  }, [actionData]);

  const isFromOnboarding = location.state?.from === "onboarding";
  useEffect(() => {
    async function checkExistingData() {
      if (githubToken && gistId) {
        try {
          const data = await downloadJsonFromGist({
            token: githubToken,
            gistId: gistId,
            filename: "anythingtracker-data.json",
          });
          setHasExistingGistData(!!data);
        } catch (error) {
          setHasExistingGistData(false);
        }
      }
    }
    checkExistingData();
  }, [githubToken, gistId]);

  const handleOptOut = (e: React.FormEvent) => {
    if (
      !confirm(
        "Are you sure you want to opt-out of GitHub sync? You won't be able to backup your data to GitHub Gist or sync across devices."
      )
    ) {
      e.preventDefault();
    }
  };

  return (
    <div>
      <div className="w-full h-16 flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <Button asChild variant="ghost" size="icon">
            <Link
              to={isFromOnboarding ? "/onboarding" : "/settings"}
              prefetch="viewport"
            >
              <ChevronLeft />
            </Link>
          </Button>
          <span className="font-medium">GitHub Sync Settings</span>
        </div>
        {isFromOnboarding && (
          <Button asChild variant="ghost">
            <Link replace to="/" prefetch="viewport">
              Skip for now
            </Link>
          </Button>
        )}
      </div>

      <Form method="post">
        <input type="hidden" name="intent" value="save" />
        <div className="flex flex-col py-6 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                GitHub Gist Sync
              </CardTitle>
              <CardDescription>
                Backup your data to GitHub Gist and sync across devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>To enable GitHub sync, you'll need:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>A GitHub Personal Access Token with 'gist' scope</li>
                  <li>A Gist ID (create one or use existing)</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <div className="grid items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="githubToken">GitHub Personal Access Token</Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0"
                onClick={() => setShowTokenInfo(!showTokenInfo)}
              >
                <Info className="h-3 w-3" />
              </Button>
            </div>
            {showTokenInfo && (
              <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                Create a token at github.com → Settings → Developer settings →
                Personal access tokens → Fine-grained tokens. Select 'Gists'
                permission with read/write access.
              </div>
            )}
            <Input
              type="password"
              id="githubToken"
              name="githubToken"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={githubToken}
              onChange={(e) => setGithubTokenState(e.target.value)}
              className={errors.token ? "border-red-500" : ""}
            />
            {errors.token && (
              <div className="text-red-600 text-sm">{errors.token}</div>
            )}
          </div>

          <div className="grid items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="gistId">Gist ID</Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0"
                onClick={() => setShowGistInfo(!showGistInfo)}
              >
                <Info className="h-3 w-3" />
              </Button>
            </div>
            {showGistInfo && (
              <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                Create a new Gist at gist.github.com with any content (it will be
                replaced). Copy the ID from the URL:
                gist.github.com/username/[THIS_IS_THE_ID]
              </div>
            )}
            <Input
              type="text"
              id="gistId"
              name="gistId"
              placeholder="a1b2c3d4e5f6..."
              value={gistId}
              onChange={(e) => setGistIdState(e.target.value)}
              className={errors.gist ? "border-red-500" : ""}
            />
            {errors.gist && (
              <div className="text-red-600 text-sm">{errors.gist}</div>
            )}
          </div>

          <div className="grid items-center gap-3">
            <input type="hidden" name="encryptionEnabled" value={encryptionEnabled.toString()} />
            <div className="flex items-center gap-2">
              <Checkbox
                id="encryptionEnabled"
                checked={encryptionEnabled}
                onCheckedChange={(checked) => {
                  setEncryptionEnabledState(checked as boolean);
                }}
                disabled={!isCryptoSupported()}
              />
              <Label
                htmlFor="encryptionEnabled"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Shield className="h-4 w-4" />
                Encrypt data before upload
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setShowEncryptionInfo(!showEncryptionInfo)}
              >
                <Info className="h-3 w-3" />
              </Button>
            </div>
            {showEncryptionInfo && (
              <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                When enabled, your data will be encrypted using AES-256-GCM before
                uploading to GitHub. The encryption key is derived from your
                GitHub token, so only you can decrypt the data. This adds an extra
                layer of security to your backups.
              </div>
            )}
            {!isCryptoSupported() && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                Encryption is not supported in your browser. Please use a modern
                browser with Web Crypto API support.
              </div>
            )}
          </div>

          {hasExistingGistData &&
            encryptionEnabled !== savedEncryptionEnabled && (
              <EncryptionMigrationInfo
                hasExistingData={true}
                isEncryptionEnabled={encryptionEnabled}
              />
            )}

          <div className="flex flex-col gap-3 mt-4">
            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving
                ? "Saving..."
                : isSyncEnabled
                ? "Save"
                : "Save and Enable sync"}
            </Button>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Privacy Note:</strong> Your GitHub token is stored locally
              in your browser and never sent to any server except GitHub's API.
            </div>
          </div>
        </div>
      </Form>

      <Form method="post" onSubmit={handleOptOut} className="mt-2">
        <input type="hidden" name="intent" value="optOut" />
        <Button
          type="submit"
          variant="outline"
          className="text-muted-foreground w-full"
        >
          <X className="h-4 w-4" />I don't want GitHub sync
        </Button>
      </Form>
    </div>
  );
}
