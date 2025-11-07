import type { ExportData } from "../data-export";

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

export type ConflictResolution = "upload" | "download" | "no-change";

export interface ConflictInfo {
  localData: ExportData;
  remoteData: ExportData;
  localChangeDate: Date;
  remoteChangeDate: Date;
}
