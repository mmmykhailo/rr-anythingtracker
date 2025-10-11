import { ChevronLeft, Save, X, Github, Info } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

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

const STORAGE_KEYS = {
  GITHUB_TOKEN: "github_token",
  GIST_ID: "gist_id",
  GITHUB_SYNC_OPTED_OUT: "github_sync_opted_out",
} as const;

export default function GitHubSyncSettingsPage() {
  const navigate = useNavigate();
  const [githubToken, setGithubToken] = useState(
    () => localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN) || ""
  );
  const [gistId, setGistId] = useState(
    () => localStorage.getItem(STORAGE_KEYS.GIST_ID) || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ token?: string; gist?: string }>({});
  const [showTokenInfo, setShowTokenInfo] = useState(false);
  const [showGistInfo, setShowGistInfo] = useState(false);

  const handleSave = async () => {
    setErrors({});

    // Validation
    if (!githubToken.trim() && !gistId.trim()) {
      setErrors({
        token: "Please provide both token and Gist ID, or choose to opt-out",
        gist: "Please provide both token and Gist ID, or choose to opt-out",
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

      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, githubToken.trim());
      localStorage.setItem(STORAGE_KEYS.GIST_ID, gistId.trim());
      localStorage.removeItem(STORAGE_KEYS.GITHUB_SYNC_OPTED_OUT);

      // Navigate back to home
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
      localStorage.setItem(STORAGE_KEYS.GITHUB_SYNC_OPTED_OUT, "true");

      // Navigate back to home
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Failed to save opt-out preference:", error);
    }
  };

  const handleSkip = () => {
    navigate("/", { replace: true });
  };

  return (
    <div>
      <div className="w-full h-16 flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ChevronLeft />
            </Link>
          </Button>
          <span className="font-medium">GitHub Sync Settings</span>
        </div>
        <Button variant="ghost" onClick={handleSkip}>
          Skip for now
        </Button>
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

        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save and Enable Sync"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

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
