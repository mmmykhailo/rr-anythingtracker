export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface SyncResult {
  status: SyncStatus;
  message: string;
  dataChanged: boolean;
  timestamp?: Date;
  error?: string;
}

export interface SyncState {
  status: SyncStatus;
  message?: string;
  lastSyncTime?: Date;
  lastError?: string;
}
