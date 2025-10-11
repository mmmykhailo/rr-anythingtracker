import { ChevronLeft, Save, Github, Info, X, Shield } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router";
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
import {
  STORAGE_KEYS,
  isEncryptionEnabled,
  setEncryptionEnabled,
  downloadJsonFromGist,
} from "~/lib/github-gist-sync";
import { isCryptoSupported } from "~/lib/crypto";
import { EncryptionMigrationInfo } from "~/components/EncryptionMigrationInfo";

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
  const navigate = useNavigate();
  const location = useLocation();
  const [githubToken, setGithubToken] = useState(
    () => localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN) || ""
  );
  const [gistId, setGistId] = useState(
    () => localStorage.getItem(STORAGE_KEYS.GIST_ID) || ""
  );
  const savedEncryptionEnabled = isEncryptionEnabled(); // The actual saved state
  const [encryptionEnabled, setEncryptionEnabledState] = useState(
    () => savedEncryptionEnabled
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ token?: string; gist?: string }>({});
  const [showTokenInfo, setShowTokenInfo] = useState(false);
  const [showGistInfo, setShowGistInfo] = useState(false);
  const [showEncryptionInfo, setShowEncryptionInfo] = useState(false);
  const [hasExistingGistData, setHasExistingGistData] = useState(false);

  const isSyncEnabled = useMemo(() => {
    return (
      localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN) &&
      localStorage.getItem(STORAGE_KEYS.GIST_ID)
    );
  }, []);

  // Check if coming from onboarding
  const isFromOnboarding = location.state?.from === "onboarding";

  // Check if there's existing data in the Gist
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
          // Ignore errors, assume no data
          setHasExistingGistData(false);
        }
      }
    }
    checkExistingData();
  }, [githubToken, gistId]);

  const handleSave = async () => {
    setErrors({});

    // Validation
    if (!githubToken.trim() && !gistId.trim()) {
      setErrors({
        token: "Please provide both token and Gist ID to enable sync",
        gist: "Please provide both token and Gist ID to enable sync",
      });
      return;
    }

    if (!githubToken.trim()) {
      setErrors({ token: "GitHub Personal Access Token is required" });
      return;
    }

    if (!gistId.trim()) {
      setErrors({ gist: "Gist ID is required" });
      return;
    }

    try {
      setIsSaving(true);

      localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, githubToken.trim());
      localStorage.setItem(STORAGE_KEYS.GIST_ID, gistId.trim());
      setEncryptionEnabled(encryptionEnabled);

      navigate("/", { replace: true });
    } catch (error) {
      console.error("Failed to save GitHub sync settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOptOut = () => {
    if (
      !confirm(
        "Are you sure you want to opt-out of GitHub sync? You won't be able to backup your data to GitHub Gist or sync across devices."
      )
    ) {
      return;
    }

    try {
      // Clear any existing values and set opted out flag
      localStorage.removeItem(STORAGE_KEYS.GITHUB_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.GIST_ID);

      // Navigate back to home
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Failed to save opt-out preference:", error);
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
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
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
            placeholder="a1b2c3d4e5f6..."
            value={gistId}
            onChange={(e) => setGistId(e.target.value)}
            className={errors.gist ? "border-red-500" : ""}
          />
          {errors.gist && (
            <div className="text-red-600 text-sm">{errors.gist}</div>
          )}
        </div>

        <div className="grid items-center gap-3">
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
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4" />
            {isSaving
              ? "Saving..."
              : isSyncEnabled
              ? "Save"
              : "Save and Enable sync"}
          </Button>
          <Button
            variant="outline"
            onClick={handleOptOut}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4" />I don't want GitHub sync
          </Button>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Privacy Note:</strong> Your GitHub token is stored locally
            in your browser and never sent to any server except GitHub's API.
          </div>
        </div>
      </div>
    </div>
  );
}
