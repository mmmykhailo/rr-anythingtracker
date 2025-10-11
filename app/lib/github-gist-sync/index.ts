const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GIST_ID = import.meta.env.VITE_GIST_ID;

if (!GITHUB_TOKEN || !GIST_ID) {
  console.warn(
    "GitHub Gist sync: Missing VITE_GITHUB_TOKEN or VITE_GIST_ID environment variables"
  );
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
}

interface DownloadOptions {
  filename?: string;
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
  if (!GITHUB_TOKEN || !GIST_ID) {
    console.error(
      "GitHub Gist sync: Missing VITE_GITHUB_TOKEN or VITE_GIST_ID environment variables"
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

    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
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
  if (!GITHUB_TOKEN || !GIST_ID) {
    console.error(
      "GitHub Gist sync: Missing VITE_GITHUB_TOKEN or VITE_GIST_ID environment variables"
    );
    return null;
  }

  const filename = options.filename || "data.json";

  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
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
  options: UploadOptions = {}
): Promise<string | null> {
  if (!GITHUB_TOKEN) {
    console.error(
      "GitHub Gist sync: Missing VITE_GITHUB_TOKEN environment variable"
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
        Authorization: `Bearer ${GITHUB_TOKEN}`,
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
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function deleteFileFromGist(filename: string): Promise<boolean> {
  if (!GITHUB_TOKEN || !GIST_ID) {
    console.error(
      "GitHub Gist sync: Missing VITE_GITHUB_TOKEN or VITE_GIST_ID environment variables"
    );
    return false;
  }

  try {
    const files: any = {
      [filename]: null,
    };

    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
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
 * @returns Promise that resolves to an array of filenames, or null if failed
 */
export async function listGistFiles(): Promise<string[] | null> {
  if (!GITHUB_TOKEN || !GIST_ID) {
    console.error(
      "GitHub Gist sync: Missing VITE_GITHUB_TOKEN or VITE_GIST_ID environment variables"
    );
    return null;
  }

  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
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
