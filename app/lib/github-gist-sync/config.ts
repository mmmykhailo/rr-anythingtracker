import { isCryptoSupported } from "~/lib/crypto";

// Storage keys for GitHub sync configuration
export const STORAGE_KEYS = {
  GITHUB_TOKEN: "github_token",
  GIST_ID: "gist_id",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ENCRYPTION_ENABLED: "encryption_enabled",
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
