import { isCryptoSupported } from "~/lib/crypto";

// Storage keys for GitHub sync configuration
export const STORAGE_KEYS = {
  GITHUB_TOKEN: "github_token",
  GIST_ID: "gist_id",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ENCRYPTION_ENABLED: "encryption_enabled",
  WIFI_ONLY_AUTO_SYNC: "wifi_only_auto_sync",
} as const;

// Helper function to get credentials from localStorage
export function getGitHubCredentials(): {
  token: string | null;
  gistId: string | null;
} {
  if (typeof window === "undefined") {
    return { token: null, gistId: null };
  }

  return {
    token: localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN),
    gistId: localStorage.getItem(STORAGE_KEYS.GIST_ID),
  };
}

// Helper function to check if sync is configured
export function isSyncConfigured(): boolean {
  const { token, gistId } = getGitHubCredentials();
  return !!token && !!gistId;
}

// Helper function to check if onboarding is completed
export function isOnboardingCompleted(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === "true";
}

// Helper function to set onboarding as completed
export function setOnboardingCompleted(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, "true");
  }
}

// Helper function to check if encryption is enabled
export function isEncryptionEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    localStorage.getItem(STORAGE_KEYS.ENCRYPTION_ENABLED) === "true" &&
    isCryptoSupported()
  );
}

// Helper function to set encryption preference
export function setEncryptionEnabled(enabled: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.ENCRYPTION_ENABLED, String(enabled));
  }
}

// Helper function to check if WiFi-only auto-sync is enabled
export function isWifiOnlyAutoSyncEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(STORAGE_KEYS.WIFI_ONLY_AUTO_SYNC) === "true";
}

// Helper function to set WiFi-only auto-sync preference
export function setWifiOnlyAutoSyncEnabled(enabled: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.WIFI_ONLY_AUTO_SYNC, String(enabled));
  }
}

// Helper function to check if Network Information API is supported
export function isNetworkInfoSupported(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return "connection" in navigator || "mozConnection" in navigator || "webkitConnection" in navigator;
}

// Helper function to check if currently connected to WiFi
export function isConnectedToWifi(): boolean {
  if (typeof navigator === "undefined" || !isNetworkInfoSupported()) {
    // If API not supported, assume WiFi (allow sync)
    return true;
  }

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

  if (!connection) {
    return true; // Fallback to allowing sync
  }

  // Check if connection type is WiFi/ethernet or if effectiveType suggests a fast connection
  const type = connection.type;
  const effectiveType = connection.effectiveType;

  // WiFi, ethernet, or unknown (desktop) connections
  if (type === "wifi" || type === "ethernet" || type === "unknown") {
    return true;
  }

  // Cellular types
  if (type === "cellular" || type === "bluetooth" || type === "wimax") {
    return false;
  }

  // Fallback: if we can't determine, allow sync
  return true;
}

// Helper function to check if auto-sync should proceed based on network settings
export function shouldAutoSync(): boolean {
  // If WiFi-only setting is disabled, always allow auto-sync
  if (!isWifiOnlyAutoSyncEnabled()) {
    return true;
  }

  // If WiFi-only is enabled, check if we're on WiFi
  return isConnectedToWifi();
}
