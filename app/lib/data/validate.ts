import type { ExportData } from "./types";

/**
 * Validate export data format
 */
export function validateExportData(data: any): data is ExportData {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.version === "string" &&
    typeof data.exportDate === "string" &&
    (typeof data.lastChangeDate === "string" ||
      data.lastChangeDate === undefined) &&
    Array.isArray(data.trackers) &&
    data.trackers.every(
      (tracker: any) =>
        typeof tracker.id === "string" &&
        typeof tracker.title === "string" &&
        typeof tracker.type === "string" &&
        typeof tracker.isNumber === "boolean" &&
        Array.isArray(tracker.entries) &&
        tracker.entries.every(
          (entry: any) =>
            typeof entry.id === "string" &&
            typeof entry.date === "string" &&
            typeof entry.value === "number" &&
            typeof entry.createdAt === "string" &&
            (entry.comment === undefined || typeof entry.comment === "string") &&
            (entry.deletedAt === undefined || typeof entry.deletedAt === "string")
        ) &&
        (tracker.deletedAt === undefined ||
          typeof tracker.deletedAt === "string")
    ) &&
    (data.tags === undefined ||
      (Array.isArray(data.tags) &&
        data.tags.every(
          (tag: any) =>
            typeof tag.id === "string" &&
            typeof tag.entryId === "string" &&
            typeof tag.trackerId === "string" &&
            typeof tag.tagName === "string" &&
            (tag.tagNameWithOriginalCasing === undefined ||
              typeof tag.tagNameWithOriginalCasing === "string")
        )))
  );
}
