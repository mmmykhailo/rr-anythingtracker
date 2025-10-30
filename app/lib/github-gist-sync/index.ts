// Configuration and storage
export {
  STORAGE_KEYS,
  getGitHubCredentials,
  isSyncConfigured,
  isOnboardingCompleted,
  setOnboardingCompleted,
  isEncryptionEnabled,
  setEncryptionEnabled,
  isWifiOnlyAutoSyncEnabled,
  setWifiOnlyAutoSyncEnabled,
  isNetworkInfoSupported,
  isConnectedToWifi,
  shouldAutoSync,
} from "./config";

// TypeScript types
export type {
  GistFile,
  GistFiles,
  GistResponse,
  UploadOptions,
  DownloadOptions,
} from "./types";

// API functions
export {
  uploadJsonToGist,
  downloadJsonFromGist,
  createJsonGist,
  deleteFileFromGist,
  listGistFiles,
} from "./api";
