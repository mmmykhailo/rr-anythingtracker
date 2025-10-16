// User settings stored in localStorage

export const SETTINGS_KEYS = {
  SHOW_HIDDEN_TRACKERS: "show_hidden_trackers",
  GITHUB_TOKEN: "github_token",
  GIST_ID: "gist_id",
  ENCRYPTION_ENABLED: "encryption_enabled",
} as const;

/**
 * Get a value from localStorage safely
 * @param key - The localStorage key
 * @returns The value or null if not found
 */
function getLocalStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

/**
 * Set a value in localStorage safely
 * @param key - The localStorage key
 * @param value - The value to store
 */
function setLocalStorageItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value);
}

/**
 * Remove a value from localStorage safely
 * @param key - The localStorage key
 */
function removeLocalStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

/**
 * Get whether hidden trackers should be shown
 * @returns true if hidden trackers should be shown, false otherwise
 */
export function getShowHiddenTrackers(): boolean {
  const value = getLocalStorageItem(SETTINGS_KEYS.SHOW_HIDDEN_TRACKERS);
  return value === "true";
}

/**
 * Set whether hidden trackers should be shown
 * @param show - true to show hidden trackers, false to hide them
 */
export function setShowHiddenTrackers(show: boolean): void {
  setLocalStorageItem(SETTINGS_KEYS.SHOW_HIDDEN_TRACKERS, show.toString());
}

/**
 * Get GitHub token from localStorage
 * @returns The GitHub token or null if not set
 */
export function getGithubToken(): string | null {
  return getLocalStorageItem(SETTINGS_KEYS.GITHUB_TOKEN);
}

/**
 * Set GitHub token in localStorage
 * @param token - The GitHub token
 */
export function setGithubToken(token: string): void {
  setLocalStorageItem(SETTINGS_KEYS.GITHUB_TOKEN, token);
}

/**
 * Remove GitHub token from localStorage
 */
export function removeGithubToken(): void {
  removeLocalStorageItem(SETTINGS_KEYS.GITHUB_TOKEN);
}

/**
 * Get Gist ID from localStorage
 * @returns The Gist ID or null if not set
 */
export function getGistId(): string | null {
  return getLocalStorageItem(SETTINGS_KEYS.GIST_ID);
}

/**
 * Set Gist ID in localStorage
 * @param gistId - The Gist ID
 */
export function setGistId(gistId: string): void {
  setLocalStorageItem(SETTINGS_KEYS.GIST_ID, gistId);
}

/**
 * Remove Gist ID from localStorage
 */
export function removeGistId(): void {
  removeLocalStorageItem(SETTINGS_KEYS.GIST_ID);
}

/**
 * Get whether encryption is enabled
 * @returns true if encryption is enabled, false otherwise
 */
export function getEncryptionEnabled(): boolean {
  const value = getLocalStorageItem(SETTINGS_KEYS.ENCRYPTION_ENABLED);
  return value === "true";
}

/**
 * Set whether encryption is enabled
 * @param enabled - true to enable encryption, false to disable
 */
export function setEncryptionEnabled(enabled: boolean): void {
  setLocalStorageItem(SETTINGS_KEYS.ENCRYPTION_ENABLED, enabled.toString());
}
