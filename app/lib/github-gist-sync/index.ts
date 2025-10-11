// Storage keys for GitHub sync configuration
const STORAGE_KEYS = {
  GITHUB_TOKEN: "github_token",
  GIST_ID: "gist_id",
  GITHUB_SYNC_OPTED_OUT: "github_sync_opted_out",
} as const;

// Helper function to get credentials from localStorage
export function getGitHubCredentials(): {
  token: string | null;
  gistId: string | null;
  isOptedOut: boolean;
} {
  if (typeof window === "undefined") {
    return { token: null, gistId: null, isOptedOut: false };
  }

  const isOptedOut =
    localStorage.getItem(STORAGE_KEYS.GITHUB_SYNC_OPTED_OUT) === "true";

  if (isOptedOut) {
    return { token: null, gistId: null, isOptedOut: true };
  }

  return {
    token: localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN),
    gistId: localStorage.getItem(STORAGE_KEYS.GIST_ID),
    isOptedOut: false,
  };
}

// Helper function to check if sync is configured
export function isSyncConfigured(): boolean {
  const { token, gistId, isOptedOut } = getGitHubCredentials();
  return !isOptedOut && !!token && !!gistId;
}

interface GistFile {
  content: string;
}

interface GistFiles {
  [filename: string]: GistFile;
}

interface GistResponse {
  id: string;
  files: {
    [filename: string]: {
      filename: string;
      type: string;
      language: string;
      raw_url: string;
      size: number;
      content: string;
    };
  };
  description: string;
  public: boolean;
  created_at: string;
  updated_at: string;
}

interface UploadOptions {
  filename?: string;
  description?: string;
  token?: string;
  gistId?: string;
}

interface DownloadOptions {
  filename?: string;
  token?: string;
  gistId?: string;
}

/**
 * Uploads JSON data to a GitHub Gist
 * @param data - The JSON data to upload
 * @param options - Optional configuration for the upload
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function uploadJsonToGist(
  data: any,
  options: UploadOptions = {}
): Promise<boolean> {
  const {
    token: storedToken,
    gistId: storedGistId,
    isOptedOut,
  } = getGitHubCredentials();

  // Use provided credentials or fall back to stored ones
  const token = options.token || storedToken;
  const gistId = options.gistId || storedGistId;

  if (isOptedOut) {
    console.error("GitHub Gist sync: User has opted out of GitHub sync");
    return false;
  }

  if (!token || !gistId) {
    console.error(
      "GitHub Gist sync: Missing GitHub token or Gist ID. Please configure sync in settings."
    );
    return false;
  }

  const filename = options.filename || "data.json";
  const description = options.description || "JSON data sync";

  try {
    const files: GistFiles = {
      [filename]: {
        content: JSON.stringify(data, null, 2),
      },
    };

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        files,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `Failed to upload to Gist: ${response.status} ${response.statusText}`,
        errorData
      );
      return false;
    }

    console.log(`Successfully uploaded JSON to Gist (${filename})`);
    return true;
  } catch (error) {
    console.error("Error uploading to Gist:", error);
    return false;
  }
}

/**
 * Downloads JSON data from a GitHub Gist
 * @param options - Optional configuration for the download
 * @returns Promise that resolves to the JSON data, or null if failed
 */
export async function downloadJsonFromGist(
  options: DownloadOptions = {}
): Promise<any | null> {
  const {
    token: storedToken,
    gistId: storedGistId,
    isOptedOut,
  } = getGitHubCredentials();

  // Use provided credentials or fall back to stored ones
  const token = options.token || storedToken;
  const gistId = options.gistId || storedGistId;

  if (isOptedOut) {
    console.error("GitHub Gist sync: User has opted out of GitHub sync");
    return null;
  }

  if (!token || !gistId) {
    console.error(
      "GitHub Gist sync: Missing GitHub token or Gist ID. Please configure sync in settings."
    );
    return null;
  }

  const filename = options.filename || "data.json";

  try {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `Failed to download from Gist: ${response.status} ${response.statusText}`,
        errorData
      );
      return null;
    }

    const gistData: GistResponse = await response.json();

    if (!gistData.files[filename]) {
      console.error(`File "${filename}" not found in Gist`);
      return null;
    }

    const fileContent = gistData.files[filename].content;

    try {
      const jsonData = JSON.parse(fileContent);
      console.log(`Successfully downloaded JSON from Gist (${filename})`);
      return jsonData;
    } catch (parseError) {
      console.error("Failed to parse JSON from Gist:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Error downloading from Gist:", error);
    return null;
  }
}

/**
 * Creates a new Gist with JSON data (use only if GIST_ID doesn't exist)
 * @param data - The JSON data to upload
 * @param options - Optional configuration for the creation
 * @returns Promise that resolves to the Gist ID if successful, null otherwise
 */
export async function createJsonGist(
  data: any,
  options: UploadOptions & { token: string } // token is required for creation
): Promise<string | null> {
  const { token } = options;

  if (!token) {
    console.error(
      "GitHub Gist sync: GitHub token is required to create a new Gist"
    );
    return null;
  }

  const filename = options.filename || "data.json";
  const description = options.description || "JSON data sync";

  try {
    const files: GistFiles = {
      [filename]: {
        content: JSON.stringify(data, null, 2),
      },
    };

    const response = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        public: false,
        files,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `Failed to create Gist: ${response.status} ${response.statusText}`,
        errorData
      );
      return null;
    }

    const gistData: GistResponse = await response.json();
    console.log(`Successfully created Gist with ID: ${gistData.id}`);
    return gistData.id;
  } catch (error) {
    console.error("Error creating Gist:", error);
    return null;
  }
}

/**
 * Deletes a file from the Gist
 * @param filename - The name of the file to delete
 * @param options - Optional credentials
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function deleteFileFromGist(
  filename: string,
  options: { token?: string; gistId?: string } = {}
): Promise<boolean> {
  const {
    token: storedToken,
    gistId: storedGistId,
    isOptedOut,
  } = getGitHubCredentials();

  // Use provided credentials or fall back to stored ones
  const token = options.token || storedToken;
  const gistId = options.gistId || storedGistId;

  if (isOptedOut) {
    console.error("GitHub Gist sync: User has opted out of GitHub sync");
    return false;
  }

  if (!token || !gistId) {
    console.error(
      "GitHub Gist sync: Missing GitHub token or Gist ID. Please configure sync in settings."
    );
    return false;
  }

  try {
    const files: any = {
      [filename]: null,
    };

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `Failed to delete file from Gist: ${response.status} ${response.statusText}`,
        errorData
      );
      return false;
    }

    console.log(`Successfully deleted ${filename} from Gist`);
    return true;
  } catch (error) {
    console.error("Error deleting file from Gist:", error);
    return false;
  }
}

/**
 * Lists all files in the Gist
 * @param options - Optional credentials
 * @returns Promise that resolves to an array of filenames, or null if failed
 */
export async function listGistFiles(
  options: { token?: string; gistId?: string } = {}
): Promise<string[] | null> {
  const {
    token: storedToken,
    gistId: storedGistId,
    isOptedOut,
  } = getGitHubCredentials();

  // Use provided credentials or fall back to stored ones
  const token = options.token || storedToken;
  const gistId = options.gistId || storedGistId;

  if (isOptedOut) {
    console.error("GitHub Gist sync: User has opted out of GitHub sync");
    return null;
  }

  if (!token || !gistId) {
    console.error(
      "GitHub Gist sync: Missing GitHub token or Gist ID. Please configure sync in settings."
    );
    return null;
  }

  try {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `Failed to list Gist files: ${response.status} ${response.statusText}`,
        errorData
      );
      return null;
    }

    const gistData: GistResponse = await response.json();
    const filenames = Object.keys(gistData.files);

    console.log(`Found ${filenames.length} file(s) in Gist`);
    return filenames;
  } catch (error) {
    console.error("Error listing Gist files:", error);
    return null;
  }
}
