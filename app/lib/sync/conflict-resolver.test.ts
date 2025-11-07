import { describe, test, expect } from "bun:test";
import {
  resolveConflict,
  isFirstTimeSync,
  getResolutionDescription,
} from "./conflict-resolver";
import type { ExportData } from "../data-export";

describe("Conflict Resolver", () => {
  const createExportData = (
    lastChangeDate?: string,
    exportDate?: string,
    trackers: any[] = []
  ): ExportData => ({
    version: "1.0.0",
    exportDate: exportDate || new Date().toISOString(),
    lastChangeDate,
    trackers,
    tags: [],
  });

  describe("resolveConflict", () => {
    test("should return 'upload' when local is newer", () => {
      const localData = createExportData(
        new Date("2024-01-02T12:00:00Z").toISOString()
      );
      const remoteData = createExportData(
        new Date("2024-01-01T12:00:00Z").toISOString()
      );

      const result = resolveConflict(localData, remoteData);
      expect(result).toBe("upload");
    });

    test("should return 'download' when remote is newer", () => {
      const localData = createExportData(
        new Date("2024-01-01T12:00:00Z").toISOString()
      );
      const remoteData = createExportData(
        new Date("2024-01-02T12:00:00Z").toISOString()
      );

      const result = resolveConflict(localData, remoteData);
      expect(result).toBe("download");
    });

    test("should return 'no-change' when dates are equal", () => {
      const date = new Date("2024-01-01T12:00:00Z").toISOString();
      const localData = createExportData(date);
      const remoteData = createExportData(date);

      const result = resolveConflict(localData, remoteData);
      expect(result).toBe("no-change");
    });

    test("should fall back to exportDate when lastChangeDate is missing", () => {
      const localData = createExportData(
        undefined,
        new Date("2024-01-02T12:00:00Z").toISOString()
      );
      const remoteData = createExportData(
        undefined,
        new Date("2024-01-01T12:00:00Z").toISOString()
      );

      const result = resolveConflict(localData, remoteData);
      expect(result).toBe("upload");
    });

    test("should use lastChangeDate when both dates exist", () => {
      // Local: newer lastChangeDate but older exportDate
      const localData = createExportData(
        new Date("2024-01-02T12:00:00Z").toISOString(),
        new Date("2024-01-01T12:00:00Z").toISOString()
      );

      // Remote: older lastChangeDate but newer exportDate
      const remoteData = createExportData(
        new Date("2024-01-01T12:00:00Z").toISOString(),
        new Date("2024-01-02T12:00:00Z").toISOString()
      );

      const result = resolveConflict(localData, remoteData);
      // Should use lastChangeDate, so local wins
      expect(result).toBe("upload");
    });

    test("should handle millisecond differences", () => {
      const localData = createExportData(
        new Date("2024-01-01T12:00:00.001Z").toISOString()
      );
      const remoteData = createExportData(
        new Date("2024-01-01T12:00:00.000Z").toISOString()
      );

      const result = resolveConflict(localData, remoteData);
      expect(result).toBe("upload");
    });
  });

  describe("isFirstTimeSync", () => {
    test("should return true when no trackers exist", () => {
      const data = createExportData(undefined, undefined, []);
      expect(isFirstTimeSync(data)).toBe(true);
    });

    test("should return false when trackers exist", () => {
      const data = createExportData(undefined, undefined, [
        {
          id: "tracker-1",
          title: "Test",
          type: "liters",
          isNumber: true,
          entries: [],
        },
      ]);
      expect(isFirstTimeSync(data)).toBe(false);
    });

    test("should return false even with deleted trackers", () => {
      const data = createExportData(undefined, undefined, [
        {
          id: "tracker-1",
          title: "Test",
          type: "liters",
          isNumber: true,
          deletedAt: new Date().toISOString(),
          entries: [],
        },
      ]);
      // Should return false because a tracker exists (even if deleted)
      expect(isFirstTimeSync(data)).toBe(false);
    });
  });

  describe("getResolutionDescription", () => {
    test("should return correct description for upload", () => {
      const desc = getResolutionDescription("upload");
      expect(desc).toContain("uploading");
      expect(desc).toContain("newer");
    });

    test("should return correct description for download", () => {
      const desc = getResolutionDescription("download");
      expect(desc).toContain("downloading");
      expect(desc).toContain("newer");
    });

    test("should return correct description for no-change", () => {
      const desc = getResolutionDescription("no-change");
      expect(desc).toContain("No changes");
    });
  });
});
